# Frontend

Next.js app routes and layouts live in `src/app/`; reusable UI lives in `src/components/`. Bootstrap 5 styles the foundation page. The root `.env` supplies `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) to the browser health indicator.

Run from this folder:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000` while the Django API is running.