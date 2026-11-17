# Chase App

Vite + React + TypeScript + Tailwind (shadcn/ui), with Supabase for auth/data
and Stripe for payments. Supabase Edge Functions live in `supabase/functions/`.

## Run locally (VS Code)

Needs Node.js 22+ (Windows: install the LTS from https://nodejs.org, then reopen VS Code).

```sh
npm install
npm run dev        # http://localhost:5173  (or Ctrl+Shift+B / F5 in VS Code)
npm test           # unit tests (Vitest)
npm run build      # production build into dist/
```

Front-end settings are in `.env` (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PAYMENTS_CLIENT_TOKEN` = Stripe
publishable key).

## Backend setup (Supabase dashboard)

* **Google sign-in:** Authentication → Providers → Google (needs a Google OAuth
  client). Add `http://localhost:5173/**` and your production URL under
  Authentication → URL Configuration → Redirect URLs.
* **Edge Function secrets:** `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY`
  (Stripe *secret* keys, `sk_test_…` / `sk_live_…`),
  `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET`.
* Deploy functions: `npx supabase functions deploy <name>`.

## Deploy the front end

`npm run build` and host `dist/` on any static host (Vercel, Netlify,
Cloudflare Pages). Configure the host to serve `index.html` for all routes.
