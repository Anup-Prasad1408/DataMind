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
    description="Transform text and documents into structured, visual knowledge.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Simple per-process in-memory throttle for this MVP. Use a shared store/API gateway
# for distributed production deployments.
_requests: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def basic_rate_limit(request: Request, call_next):
    if request.url.path.startswith("/api/transform") or request.url.path == "/api/refine":
        client = request.client.host if request.client else "unknown"
        now = time()
        bucket = _requests[client]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= settings.rate_limit_per_minute:
            return JSONResponse(status_code=429, content={"detail": "Too many requests. Please wait a minute and try again."})
        bucket.append(now)
    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Keep internal details in server logs; do not leak tracebacks to the browser.
    print(f"Unhandled DataMind API error: {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred. Please try again."})


@app.get("/")
async def root():
    return {"name": "DataMind API", "docs": "/docs", "health": "/api/health"}


app.include_router(health_router, prefix="/api")
app.include_router(transform_router, prefix="/api")
