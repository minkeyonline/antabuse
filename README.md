# Antabuse

AI circuit breaker for Web3 subscriptions and wallets — [antabuse.run](https://antabuse.run).

Next.js 16 (App Router) · Tailwind CSS v4 · Clerk · Lucide.

## Develop

```bash
npm install
npm run dev
```

`.env.local` holds temporary accountless Clerk dev keys (created with `npx clerk@latest init --accountless`).
Run `npx clerk@latest auth login` to claim that app, or copy `.env.example` and paste your own keys.

## Routes

- `/` public landing page (bento grid)
- `/dashboard` protected by `src/proxy.ts` (Clerk). Wallets, subscriptions, firewall status.
- `/sign-in`, `/sign-up` Clerk components

Dashboard data is mocked in `src/lib/mock-data.ts`.

## Deploy (Vercel)

Import the repo in Vercel and set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
(plus the redirect URLs in `.env.example`) under Project → Settings → Environment Variables.
Use a Clerk **production** instance for antabuse.run.
