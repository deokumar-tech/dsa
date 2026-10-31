# dsa

# CarCollective

CarCollective is split into three systems:

1. **Client:** React/Vite app deployed to Vercel.
2. **API server:** Express app deployed to Render.
3. **Database and authentication:** Supabase Postgres and Supabase Auth.

The client sends API requests only to the Render API. Supabase credentials are configured only on the backend; the Supabase service-role key is never sent to or built into the client.

## Local environment files

- `frontend/.env` and `frontend/.env.example` contain only `VITE_API_BASE_URL`. Leave it blank locally to use the Vite proxy, or set it to the Render API URL for a deployed client.
- `backend/.env` and `backend/.env.example` contain the Render/API and Supabase settings. Copy the example over only if you do not already have a local env file.
- `backend/.env` is ignored by Git. Do not commit credentials or paste them into source files.

## Supabase setup

1. Create a Supabase project.
2. In Supabase project settings, copy the **Project URL**, **anon/public key**, and **service_role/secret key** into the matching backend variables. Never put the service-role key in the frontend.
3. Copy the **Session pooler** connection string (port `5432`) into `DATABASE_URL`. Use the database password from Supabase; URL-encode special characters in the password.
4. Set `DATABASE_SSL=true`.
5. Apply the migration from the repository root with the Supabase CLI (`supabase db push`), or run `npm run db:init` from `backend` to apply the migration and seed the sample rows.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to the Vercel client URL and add your Vercel production/preview URLs plus `http://localhost:5173` to the redirect URL allowlist.

The canonical schema and auth trigger are in `supabase/migrations/20261031110000_initial_schema.sql`; sample rows are in `supabase/seed.sql`. The API applies the migration and seeds automatically on startup when `DATABASE_URL` is configured. Seed rows use stable keys so repeated initialization does not duplicate them. Demo inventory is illustrative, not a live dealer feed. Supabase direct database hosts can require IPv6; for local development networks without IPv6 support, use the Session pooler URI and enable `DATABASE_SSL=true`.

Supabase Auth handles account registration and login. The database trigger creates each user's public profile. The API verifies bearer tokens with the Supabase service client. The anon key is used only for the public Auth sign-in/sign-up client on the backend; the service-role key is only used server-side.

## Deploy the API to Render

The root `render.yaml` defines the backend service with `backend` as its root directory. Create the Render service from the repository Blueprint and set the secret variables in Render's environment settings:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (unique random value, at least 32 characters)
- `FRONTEND_URLS` (comma-separated exact Vercel production/preview origins)
- `GEMINI_API_KEY` (optional)

Render supplies `PORT`; the health check is `/api/health`. Keep all Supabase keys out of Render logs and client code.

## Deploy the client to Vercel

1. Import the repository in Vercel and set the **Root Directory** to `frontend`.
2. Set `VITE_API_BASE_URL` to the Render API origin, for example `https://carcollective-api.onrender.com`.
3. Deploy. `vercel.json` supports client-side route refreshes.
4. Add the exact Vercel origin(s) to Render's `FRONTEND_URLS`, then redeploy the API.

Do not set `SUPABASE_SERVICE_ROLE_KEY` or the database URL in Vercel. The Vercel client only needs the Render API URL.

## Local development

1. Configure backend values in `backend/.env`.
2. Run the API from `backend`: `npm run dev`.
3. Leave `VITE_API_BASE_URL` blank in `frontend/.env`.
4. Run the client from `frontend`: `npm run dev`.

When no Supabase/Postgres values are configured, the backend uses temporary in-memory demo data for local UI development. That data is lost when the process restarts and is not production mode.

## API overview

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/auth/me` (bearer token required)
- `GET /api/inventory?make=Toyota&model=RAV4%20Hybrid&zip=94105`
- `GET /api/cohorts?make=Toyota&model=RAV4%20Hybrid&zip=94105`
- `POST /api/cohorts` (bearer token required)
- `POST /api/cohorts/:id/join` (bearer token required)
- `POST /api/ai/negotiation-strategy` (bearer token required and rate limited)

ZIP matching currently groups ZIP codes by their first three digits; it does not calculate an exact mileage radius.

## Validation

- Frontend: `npm run build` from `frontend`.
- Backend: `npm test` from `backend`.
