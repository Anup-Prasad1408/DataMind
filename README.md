# DataMind — updated standalone package

This ZIP contains a self-contained DataMind implementation with a React/Vite frontend and FastAPI backend. It implements the visible DataMind workflow and the fixes requested in this conversation: readable Mermaid diagram labels, safer Gemini calls, input/output limits, request serialization, clear API errors, local fallback output, document uploads, and all 12 transformation formats.

> **Important source note:** The public repository ZIP/API could not be retrieved in this session, so this is a complete standalone replacement package based on the DataMind project structure and UI shown in the conversation. It is not a verified byte-for-byte patch of every original repository file. Back up your current repository before replacing it, and compare any extra features that exist only in your original code.

## Project structure

```text
DataMind-Updated/
├── .github/workflows/deploy-frontend.yml
├── .gitignore
├── README.md
├── render.yaml
├── backend/
│   ├── .env.example
│   ├── Procfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   └── transform.py
│   │   └── services/
│   │       ├── demo.py
│   │       ├── documents.py
│   │       └── gemini.py
│   └── tests/test_demo.py
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── styles.css
        ├── components/
        │   ├── MermaidPreview.jsx
        │   └── ResultPanel.jsx
        ├── data/formats.js
        ├── services/api.js
        └── utils/export.js
```

## Features included

- Flowchart, Mind Map, Structured Notes, Infographic, Timeline, Comparison Table, Step-by-Step Guide, Flashcards, Smart Summary, Workflow, Mermaid Diagram, and Presentation.
- PDF, DOCX, TXT, and Markdown upload (8 MB default upload cap).
- Gemini 3.8 Flash integration through the backend only; no API key in frontend source.
- JSON response validation and explicit handling of 429, 5xx, timeouts, and empty responses.
- Single in-process AI request at a time with a minimum interval between calls.
- Configurable source-character and output-token limits.
- Local deterministic fallback when Gemini is missing or temporarily unavailable.
- Mermaid code view, copy, zoom, fullscreen, SVG export, PNG export, and explicit node/label text colors.
- Local browser save/history/favorites, editable Markdown result, and result export.
- Dark/light appearance preference.

## Run locally

### 1. Backend

Use Python 3.11 or newer.

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Put your Google AI Studio key in `backend/.env`:

```env
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-3.8-flash
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start the backend from the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check: `http://127.0.0.1:8000/api/health`
API docs: `http://127.0.0.1:8000/docs`

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env` and set:

```env
VITE_API_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Deploy backend to Render

Create a **Web Service** from your GitHub repository.

- Root Directory: `backend`
- Runtime: Python
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Add these Render Environment Variables:

```text
GEMINI_API_KEY=<your real Google AI Studio key>
GEMINI_MODEL=gemini-3.8-flash
AI_MAX_SOURCE_CHARS=9000
AI_MAX_OUTPUT_TOKENS=1200
AI_ESTIMATED_TPM_BUDGET=6000
AI_MAX_RETRIES=0
AI_MIN_INTERVAL_SECONDS=8
AI_TIMEOUT_SECONDS=60
AI_FALLBACK_TO_DEMO=true
MAX_UPLOAD_MB=8
MAX_TEXT_CHARS=40000
RATE_LIMIT_PER_MINUTE=12
ALLOWED_ORIGINS=https://anup-prasad1408.github.io,http://localhost:5173
```

Replace `ALLOWED_ORIGINS` with the exact origin where your frontend is hosted. Do not put a trailing slash in an origin. Do not put `GEMINI_API_KEY` in frontend environment variables or commit it to GitHub.

After deployment, open `https://YOUR-RENDER-SERVICE.onrender.com/api/health` and confirm the response has `status: ok`. If `mode` says `demo`, the backend does not see a non-empty `GEMINI_API_KEY`.

## Deploy frontend to GitHub Pages

This package's Vite config uses `/DataMind/` as the production base path when running inside GitHub Actions.

1. Copy the package contents into your repository's root (after backing up the existing files).
2. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build/deployment source.
3. In **Settings → Secrets and variables → Actions → Variables**, create a repository variable named `VITE_API_URL` and set it to your Render backend origin (for example, `https://datamind-api.onrender.com`, without a trailing slash).
4. The included workflow reads that variable and builds the frontend on pushes to `main` that change frontend files. For a local build, put the same value in `frontend/.env`. The API base URL is public configuration, not a secret.

For a manual production build:

```bash
cd frontend
# Set VITE_API_URL to your Render backend URL before running build.
npm install
npm run build
```

The generated site is in `frontend/dist`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API service information |
| GET | `/api/health` | Backend and AI configuration status |
| POST | `/api/transform` | Transform raw text |
| POST | `/api/transform/file` | Extract and transform PDF/DOCX/TXT/MD |
| POST | `/api/refine` | Refine an existing result |

## Gemini quota notes

Gemini quotas are imposed by Google at the **project** level and may include requests per minute (RPM), input tokens per minute (TPM), and requests per day (RPD). Changing frontend code cannot raise Google's quota. This package reduces accidental bursts by serializing calls within one backend process, spacing calls, reserving a conservative estimated-token budget in a rolling 60-second window, limiting the source sent to the model, constraining output tokens, and avoiding automatic retries of HTTP 429 quota responses.

The in-memory limiter and AI request queue are per Python process. They do not coordinate multiple Render instances or multiple worker processes. If you scale beyond one process/instance, use Redis (or another shared limiter/queue) and review the quota in Google AI Studio. A single application request may still exceed a provider quota if the configured quota is extremely low or the prompt/output budget is raised substantially.

If you continue to receive 429 responses, check the precise quota dimension and model shown in Google AI Studio. Do not create multiple API keys under the same Google Cloud project expecting separate quota buckets.

## Tests and checks

From the `backend` directory:

```bash
pip install -r requirements.txt
pytest -q
```

From the `frontend` directory:

```bash
npm install
npm run build
```

Scanned/image-only PDFs are not OCR'd; the API returns a clear message when no text can be extracted. This package does not include an OCR engine.
