# CarCollective client

The client is a React 19 and Vite application. React Router handles the Home,
Dashboard, Dealers, authentication, and cohort workspace routes. The responsive
dark theme and interaction animations are implemented with CSS and Tailwind
utilities; no additional UI dependencies are required.

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

- `/` — landing page and active buyer groups
- `/dashboard` — vehicle search, cohorts, dealer listings, and negotiation AI
- `/dealers` — local inventory, radius filter, and savings estimate
- `/register` and `/login` — account registration and sign-in
- `/cohort/:id` — buyer group workspace

## Validation

```powershell
npm run build
npm run lint
```
