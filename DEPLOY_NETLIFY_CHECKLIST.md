# Netlify Deploy Checklist (lakpdf.com)

## 1) Frontend (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Ensure `netlify.toml` is picked from repo root.
- Ensure `public/_redirects` is present (it is copied into `dist` during build).

## 2) Frontend Environment Variables (Netlify)

Set these in Netlify Site Settings -> Environment Variables:

- `VITE_API_BASE_URL=https://api.lakpdf.com/api`
- `VITE_AI_MODEL=<your-preferred-model>` (optional)
- `VITE_AI_REASONING_MODEL=<optional>`
- `VITE_GOOGLE_CLIENT_ID=<if Google login is enabled>`

## 3) DNS

- `lakpdf.com` -> Netlify (apex domain setup as per Netlify DNS docs)
- `www.lakpdf.com` -> Netlify
- `api.lakpdf.com` -> your backend server/load balancer

## 4) Backend (api.lakpdf.com)

Run the Node server separately (not on Netlify static hosting).
Required production vars include:

- `NODE_ENV=production`
- `PORT=8787` (or your chosen backend port)
- `AI_PROVIDER=<openrouter|groq|deepinfra>`
- provider API key (`OPENROUTER_API_KEY` or provider-specific)
- `MONGODB_URI`
- `JWT_SECRET`
- SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- `ALLOWED_ORIGINS=https://lakpdf.com,https://www.lakpdf.com`

Recommended:

- `AUTH_COOKIE_SECURE=true`
- `RATE_LIMIT_STORE=mongodb`

## 5) SSL

- Enable HTTPS cert for `lakpdf.com`, `www.lakpdf.com` and `api.lakpdf.com`.

## 6) Post-Deploy Smoke Test

- Open:
  - `/`
  - `/tools`
  - `/pdf-editor`
  - `/summarizer-qa`
  - `/ai-neet-test`
- Verify:
  - Route refresh works
  - Login works
  - AI call works
  - No blank page

## 7) Local Verification Commands (already passing in this repo)

- `npm run type-check`
- `npm run build`
- `npx playwright test tests/cross-browser-blank-page.spec.ts tests/edit-pdf-workflow.spec.ts`
