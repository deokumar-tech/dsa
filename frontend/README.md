# CarCollective client

The client is a React 19 and Vite application. React Router handles the Home,
Dashboard, Dealers, authentication, and cohort workspace routes. The editorial dark theme, responsive layouts, and motion effects are implemented
with CSS and Tailwind utilities; no additional UI dependencies are required.

## Local development

From this directory:

```powershell
npm install
npm run dev
```

Vite starts at `http://localhost:5173/`. For local development, leave
`VITE_API_BASE_URL` blank in `.env`; `vite.config.js` proxies `/api` requests to
the Express server at `http://localhost:3000`. To use a deployed API, set
`VITE_API_BASE_URL` to its origin, for example
`https://carcollective-api.onrender.com`.

The browser client only needs the Render API URL. Never put Supabase database
credentials or the Supabase service-role key in the frontend environment.

## Routes

- `/` — landing page, nearby Bhubaneswar cohorts, and market summary
- `/dashboard` — vehicle search by Bhubaneswar PIN, cohorts, offers, and negotiation AI
- `/dealers` — nearby showroom and submitted-price browsing, with optional authenticated contributions
- `/register` and `/login` — account registration and sign-in
- `/cohort/:id` — buyer group workspace

The client uses the API for all marketplace data. Records labeled **Demo data**
are illustrative seed content, not live dealer prices. Showroom amounts are
ex-showroom INR estimates; confirm current prices and on-road costs with the
showroom. A signed-in user can submit an unverified showroom and upload a
JPEG/PNG/WebP photo (up to 2 MB); uploads are sent to the API, never directly
to Supabase with a browser key.

## Validation

```powershell
npm run build
npm run lint
```
