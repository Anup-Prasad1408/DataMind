# DataMind

**Turn Raw Data Into Clear Understanding.**

DataMind is a full-stack MVP that transforms raw text and uploaded documents into structured notes, summaries, flowcharts, mind maps, timelines, comparison tables, flashcards, presentation outlines, and other learning-friendly formats.

## What works in this MVP

- 12 transformation formats: Flowchart, Mind Map, Structured Notes, Infographic, Timeline, Comparison Table, Step-by-Step Guide, Flashcards, Summary, Workflow Diagram, Mermaid Diagram, Presentation Outline.
- Text input and PDF, TXT, Markdown, and DOCX uploads (8 MB maximum).
- Explicit **Demo mode** when no Gemini key is configured. Demo output is locally generated and is never labelled as live AI.
- Optional Gemini API integration through a backend-only secret.
- Output customization: language, detail, complexity, audience, and visual style.
- Mermaid diagram rendering with zoom, fullscreen, SVG and PNG export.
- Editable Markdown-style result text, copy, download, and AI follow-up refinement.
- Saved projects, favorites, search, and recent activity in browser local storage.
- Responsive interface and persistent light/dark theme.
- Health endpoint, validation, CORS allow-list, basic in-memory rate limiting, and graceful API errors.

> **MVP boundary:** This repository does not yet include user accounts, Supabase/PostgreSQL persistence, team sharing, or cloud file storage. Saved work is kept in the current browser using `localStorage`. Do not use this guest-mode storage for confidential data or treat it as multi-user access control.

## Architecture

```text
DataMind/
├── frontend/                 # React + Vite single-page application
│   ├── public/               # Static assets
│   └── src/
│       ├── components/       # Sidebar, format picker, result and diagram UI
│       ├── data/              # Supported formats and example templates
│       ├── services/          # HTTP client for FastAPI
│       ├── utils/             # Browser storage and export helpers
│       ├── App.jsx            # Application state and page composition
│       ├── main.jsx           # React entry point
│       └── styles.css         # Responsive design system
└── backend/                  # FastAPI service
    └── app/
        ├── routes/            # Health, transform and refine endpoints
        ├── services/          # Gemini provider, demo transformer, extraction
        ├── config.py          # Environment settings
        ├── schemas.py         # Pydantic request/response models
        └── main.py            # FastAPI app and middleware
```

## Requirements

- Node.js **20.19+ or 22.12+** and npm.
- Python **3.10+**.
- An internet connection for dependency installation and Gemini requests.
- Optional: a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Run locally

Open two terminals from the repository root.

### 1. Start the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

Install dependencies and create your environment file:

```bash
pip install -r requirements.txt
# Windows PowerShell
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

Open `backend/.env`. Keep `GEMINI_API_KEY` empty to run in Demo mode. To enable Gemini, add your key to that file. The key stays on the server and must never be placed in frontend source code.

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/api/health` and interactive API docs at `http://localhost:8000/docs`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env` (optional; the default is already localhost):

```env
VITE_API_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Gemini configuration

The backend uses the Gemini REST `generateContent` endpoint. Configure these variables in `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

If the key is missing, the server returns deterministic sample transformations with `mode: "demo"`. If Gemini is configured but the provider call fails, the API reports an error; it does not silently disguise a demo response as AI output.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend and provider status |
| `POST` | `/api/transform` | Transform text using selected settings |
| `POST` | `/api/transform/file` | Extract and transform an uploaded file |
| `POST` | `/api/refine` | Refine an existing result with a follow-up instruction |

Interactive API documentation is available at `/docs` while the backend is running.

## Deploy

### Frontend: GitHub Pages / Vercel / Netlify

1. Push the repository to GitHub using the `main` branch. The included `.github/workflows/deploy-pages.yml` builds and deploys the frontend on every push. In GitHub, open **Settings → Pages** and set the source to **GitHub Actions**.
2. For Vercel or Netlify, set the project root to `frontend` and build command to `npm run build`; output directory is `dist`.
3. Add `VITE_API_URL` with the deployed backend URL, for example `https://your-api.onrender.com`.
4. For GitHub Pages project sites, update `base` in `frontend/vite.config.js` to your exact repository path, e.g. `base: '/DataMind/'`. The included workflow publishes `frontend/dist`. In GitHub repository settings, choose **Pages → GitHub Actions**. Set a repository variable named `VITE_API_URL` to your deployed backend URL (Settings → Secrets and variables → Actions → Variables).

### Backend: Render

1. Create a new **Web Service** and connect this repository.
2. Set **Root Directory** to `backend`.
3. Build command: `pip install -r requirements.txt`.
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Add environment variables: `GEMINI_API_KEY` (optional), `GEMINI_MODEL`, `ALLOWED_ORIGINS` (comma-separated exact frontend origin(s), e.g. `https://yourname.github.io`), and `MAX_UPLOAD_MB=8`.
6. Set frontend `VITE_API_URL` to the Render service URL and rebuild/redeploy the frontend.

Do not use `ALLOWED_ORIGINS=*` for a credentialed production app. The current guest MVP does not use cookie credentials, but an explicit allow-list is still recommended.

## GitHub publishing checklist

- Never commit `.env`, API keys, private documents, or personal data.
- Commit `.env.example` files only.
- Confirm the backend URL in `frontend/.env` / hosting environment is correct.
- If using a repository subpath on GitHub Pages, update Vite's `base` setting.
- Confirm the backend CORS allow-list contains the published frontend origin.
- Run `npm run build` before publishing.

## Run backend tests

From `backend/` with the virtual environment active:

```bash
python -m pytest -q
```

## Troubleshooting

**The app says “API offline”.** Start FastAPI on port 8000 and verify `/api/health`. Confirm `VITE_API_URL` and restart Vite after editing `.env`.

**File upload fails.** Use PDF, TXT, MD, or DOCX files under 8 MB. Scanned/image-only PDFs may not contain extractable text; OCR is not included in this MVP.

**The app says Demo mode.** This is expected when `GEMINI_API_KEY` is empty. Add the key to `backend/.env` and restart FastAPI to use Gemini.

**Mermaid diagram does not render.** Check that the generated code is valid Mermaid. You can still copy the code or export the textual result.

## Next production milestones

1. Add Supabase Auth and PostgreSQL row-level security.
2. Move saved projects from browser storage to authenticated API endpoints.
3. Add durable background jobs for large documents and robust distributed rate limiting.
4. Add OCR for scanned PDFs, richer DOCX layouts, and optional object storage with retention controls.
5. Add automated frontend/backend tests and CI deployment workflows.

## License

MIT. See [LICENSE](LICENSE).
