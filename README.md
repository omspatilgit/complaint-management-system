# ClearDesk — Workplace Care

A full-stack workplace complaint dashboard built with FastAPI, SQLite, React, and Three.js. It helps teams submit, track, resolve, and remove workplace concerns from one responsive dashboard.

## Features

- Live dashboard summary, SVG status distribution, resolution rate, and recent complaints.
- Validated complaint submissions; status updates and confirmed deletion.
- API health indicator with 30-second polling, loading states, empty state, errors, retry, and success toast.
- Glass styled responsive interface with accessible reduced-motion handling.
- Lightweight water ripple overlay with ping-pong height simulation, ambient ripples, visibility pause, DPR cap, and WebGL fallback.
- Terminal database viewer. Press **R** to refresh and **Q** to quit.

## Technologies

Python 3.10+, FastAPI 0.115.12, SQLAlchemy 2.0.40, SQLite, Pydantic 2.11.4, Uvicorn 0.34.2; React 19.1, Vite 6.4.5, Axios 1.20, Tailwind CSS 4.3, Lucide React, and Three.js 0.176.0.

## Directory structure

```text
backend/       FastAPI app, SQLAlchemy models, schemas, SQLite DB and terminal viewer
frontend/      Vite React dashboard and Three.js effect
setup.bat      Install dependencies on Windows
run.bat        Launch backend, frontend and browser
view-db.bat    Open terminal DB viewer
view-db-mac.sh Open terminal DB viewer on macOS
```

## Prerequisites

Install Python 3.10 or newer and Node.js 18 or newer (npm included). On Windows, use the quick start below. `setup.bat` checks required commands, creates `backend\venv`, installs pinned backend packages and runs `npm install`. It creates `frontend\.env` only when absent.

## Windows quick start

1. Double-click `setup.bat` or run it from a terminal.
2. Run `run.bat`.
3. Open `http://localhost:5173` (the script opens it automatically).

The script opens separate server windows. Press **Ctrl+C** in each window to stop its server.

## macOS quick start

Install Python 3.10+ and Node.js 18+ (with npm), then open Terminal in the project folder:

```bash
bash ./setup-mac.sh
bash ./run-mac.sh
```

The setup script creates `backend/venv`, installs the pinned Python packages and frontend lockfile dependencies, and copies `frontend/.env.example` only if `frontend/.env` is missing. The run script starts the API and dashboard, opens `http://localhost:5173`, and stops both servers when you press **Ctrl+C**. It leaves `backend/complaints.db` and existing environment settings in place.

To inspect the SQLite database on macOS, run `bash ./view-db-mac.sh` from the project folder. Press **R** to refresh or **Q** to quit. If the database does not exist yet, start the ClearDesk app once to initialize it.

## URLs

- Frontend: http://localhost:5173
- Backend: http://127.0.0.1:8000
- Interactive API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

## Manual startup

Backend (from `backend`):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend (from `frontend`, in another terminal):

```powershell
npm install
Copy-Item .env.example .env  # only if .env does not exist
npm run dev -- --host 127.0.0.1 --port 5173
```

## API

- `GET /health` — `{"status":"healthy"}`.
- `GET /complaints` — rows ordered by ascending ID.
- `POST /complaints` — create a complaint with title, department, and description. Status defaults to Pending; success is 201.
- `PATCH /complaints/{id}` — JSON body `{"status":"Pending"}`, `{"status":"In Progress"}`, or `{"status":"Resolved"}`.
- `DELETE /complaints/{id}` — delete a row; successful response is 204.

Validation errors return 422 with field details; unknown IDs return 404. Allowed departments are IT, HR, Facilities, Finance, Operations, Security, and Other. Titles are 3–120 characters and descriptions 10–2000 characters after trimming.

## Database behavior

SQLite lives at `backend/complaints.db`. Tables are created on API startup. The app inserts nine sample complaints (4 Pending, 2 In Progress, 3 Resolved) only when the table is empty. Startup never clears existing data. The database is intentionally not excluded by `.gitignore` and should be committed.

Run `view-db.bat` on Windows or `bash ./view-db-mac.sh` on macOS to inspect all fields in a wrapped, column-oriented terminal view. Press R to re-read the database and Q to exit.

## Water effect

The overlay is implemented in `frontend/src/effects/waterRipple.js` using vanilla Three.js, half-float ping-pong render targets, and a transparent canvas above the UI (`z-index: 9999; pointer-events: none`). Colors and `intensity`, `decay`, and `viscosity` are in the `defaults` options object; pass overrides to `createWaterRipple(canvas, options)`. It pauses when hidden, respects reduced motion, caps DPR at 2, and silently exits if WebGL is unavailable.

The effect is an independent implementation informed by the public demo at [dghez/mouse-effects-webgl-water](https://github.com/dghez/mouse-effects-webgl-water), which identifies itself as a fork of [cortiz2894/mouse-effects](https://github.com/cortiz2894/mouse-effects). The downloaded reference folder and its visible repository file list contain no `LICENSE` file. No license terms were available to verify; this project does not copy its source code.

## Troubleshooting

- If the API indicator is red, ensure the backend is running on port 8000 and `frontend/.env` points to `http://127.0.0.1:8000`.
- If port 5173 or 8000 is occupied, stop the other process or update the launch command and API base URL.
- For dependency issues on Windows, rerun `setup.bat`; on macOS, run `bash ./setup-mac.sh`. Neither removes or overwrites the database.
- The ripple effect requires WebGL; on unsupported devices it is disabled while the dashboard remains usable.

## GitHub

From the project root, initialize and push using the commands provided in the completion report. Review `git status` before committing and verify `backend/complaints.db` is tracked. Never force-push; if the remote has commits, reconcile with `git pull --rebase origin main` or a deliberate merge first.
