# Render deployment

The root `render.yaml` defines two free Render web services:

- `sentinel-api`: Django REST API, static files, and MongoDB health check.
- `sentinel-web`: Next.js frontend, configured to call the API.

The Blueprint does not create a database or configure email delivery. The
backend uses MongoDB Atlas, and the `MONGODB_URI` is entered as a secret when
you create the Blueprint.

## Before deploying

1. Make sure the repository and `render.yaml` are pushed to GitHub.
2. In MongoDB Atlas, create a database user and database named `sentinel`.
   Copy the application connection URI. Keep the credential private.
3. Configure Atlas Network Access for the Render service's outbound IP ranges
   if your Atlas project restricts connections by IP. Do not make the database
   publicly accessible as a workaround.

## Create the Render services

1. In the Render Dashboard, choose **New → Blueprint** and connect the
   `shehanaip/Sentinel` repository on the `main` branch.
2. Confirm the two services and their free plans. When prompted, enter the
   Atlas connection string for `MONGODB_URI`. Render generates
   `DJANGO_SECRET_KEY`; do not replace it with a committed value.
3. Apply the Blueprint and wait for both deploys to finish.
4. Open `https://sentinel-api.onrender.com/api/health/`. It should return
   `{"status":"ok","database":"ok"}`. The health check requires Atlas to be
   reachable.
5. Open `https://sentinel-web.onrender.com` and verify the frontend can reach
   the API.

The Blueprint sets the API's allowed host and frontend origin to match those
service URLs. If Render assigns different URLs (for example, because a service
name is unavailable), update `DJANGO_ALLOWED_HOSTS` and `FRONTEND_URL` on the
API service, and `API_SERVER_URL` on the frontend service. The frontend proxies
browser `/api/` requests to `API_SERVER_URL`, keeping session and CSRF cookies
same-origin; rebuild and redeploy the frontend after changing that value.

Keep `FRONTEND_URL` set to the frontend's exact HTTPS origin; Django uses it
for CORS and trusted CSRF origins. `NEXT_PUBLIC_API_URL` remains the local
development API URL in `.env`.

The API deploy runs `collectstatic` during the build and applies Django
migrations before starting Gunicorn. Keep the API at one instance while using
this startup migration approach. Add email environment variables in Render
only after configuring an SMTP provider; registration and email-dependent
features require them.

## Monitoring worker

The periodic `run_monitoring` command is intentionally not included in the
Blueprint. It continuously sends outbound requests to verified websites.
After the API is deployed, add a separate Render background worker with root
directory `backend`, build command `pip install -r requirements.txt`, and
start command `python manage.py run_monitoring` only when you are ready for
those recurring checks.

Both web services use Render's free plan, which can sleep when idle. MongoDB
Atlas is managed separately and may have its own costs and limits.
