from collections import defaultdict, deque
from time import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes.health import router as health_router
from app.routes.transform import router as transform_router

settings = get_settings()
app = FastAPI(
    title="DataMind API",
    description="Transform text and documents into organized, visual knowledge.",
    version="2.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# In-process per-IP limiter. For multiple Render instances, use Redis-backed limiting.
_request_times: dict[str, deque[float]] = defaultdict(deque)
_protected_paths = {"/api/transform", "/api/transform/file", "/api/refine"}


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path in _protected_paths:
        client = request.client.host if request.client else "unknown"
        now = time()
        bucket = _request_times[client]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= settings.rate_limit_per_minute:
            return JSONResponse(status_code=429, content={"detail": "Too many requests. Please wait a minute and try again."})
        bucket.append(now)
    return await call_next(request)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    print(f"Unhandled API error at {request.url.path}: {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred. Please try again."})


@app.get("/")
async def root():
    return {"name": "DataMind API", "version": "2.2.0", "health": "/api/health", "docs": "/docs"}


app.include_router(health_router, prefix="/api")
app.include_router(transform_router, prefix="/api")
