# Backend

Django root routes are in `config/`; feature modules live in `apps/`.

- `apps.core`: `GET /api/health/`
- `apps.accounts`: registration, email verification, and session authentication
- `apps.websites`: owned website setup and DNS verification
- `apps.monitoring`: SSRF-safe HTTPS uptime checks, history, and the local scheduler
- `apps.seo`: bounded homepage metadata audits and audit history

Run these commands from this folder with the virtual environment activated:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Run the periodic monitor in a second backend terminal:

```powershell
python manage.py run_monitoring
```

It checks verified websites every five minutes by default. Use `python manage.py run_monitoring --once` for one pass. This local command is not a production-supervised queue worker. SEO audits are run manually from the `/seo` page and inspect verified sites only.

Configuration is loaded from the repository root `.env`. Required values are `DJANGO_SECRET_KEY`, `MONGODB_URI`, and `MONGODB_DATABASE`. Registration also needs `EMAIL_HOST` and `EMAIL_FROM_ADDRESS`, and usually SMTP username/password. Django admin, auth, and content types use the MongoDB-specific migrations under `mongo_migrations/`.
