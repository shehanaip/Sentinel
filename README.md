# Sentinel

Sentinel is a website availability and configuration monitoring SaaS. See [the product specification](Sentinel_Product_Spec.md) and [the technology decision](docs/TECH_STACK.md).

## Local development

Prerequisites: Node.js 20.9+ and Python 3.12+ (the current MongoDB backend supports Python 3.12 and 3.13). MongoDB Atlas must allow your current IP address, and the database user in your connection URI must have read/write access.

The local `.env` is ignored by Git. It contains the Atlas URI and a generated Django secret key. Keep it private. If you have not already filled in your Atlas URI, put it in `MONGODB_URI` in the root `.env` file. Set `MONGODB_DATABASE=sentinel` or your preferred database name.

### Start the API

In one PowerShell terminal from the repository root:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The API is at `http://localhost:8000`. Visit `http://localhost:8000/api/health/` to check the API and MongoDB connection. If it returns 503, check the Atlas IP access list, database user permissions, and the URI in `.env`. Local Django startup remains available while Atlas is unreachable. If PowerShell blocks activation, from the repository root run `backend\\.venv\\Scripts\\python.exe -m pip install -r backend\\requirements.txt`, then `backend\\.venv\\Scripts\\python.exe backend\\manage.py runserver`.

### Start the frontend

In a second PowerShell terminal from the repository root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. The page shows whether the frontend can reach the API and Atlas.

You can stop each server with **Ctrl+C**. For later runs, use one backend terminal for `python manage.py runserver`, a second backend terminal for `python manage.py run_monitoring`, and a frontend terminal for `npm.cmd run dev`.

The current foundation includes session authentication, verified website setup, HTTPS uptime checks with history, and on-demand homepage SEO audits. Apply migrations from `backend` with `python manage.py migrate`. Run `python manage.py run_monitoring` in a separate backend terminal for five-minute uptime checks. SEO audits check title, description, H1, viewport, canonical, and noindex metadata; they do not change site content or predict rankings.

## Repository layout

- `frontend/` - Next.js, React, TypeScript, Bootstrap 5, and custom CSS.
- `backend/` - Django REST Framework with MongoDB official backend.
- `docs/` - architecture and implementation decisions.
