# Antabuse

Circuit breaker for Web3 subscriptions and wallets. [antabuse.run](https://antabuse.run)

Next.js 16 (App Router) · Tailwind CSS v4 · Clerk · Drizzle + Postgres · viem.

## Develop

```bash
npm install
npm run dev
```

- **Auth:** `.env.local` holds temporary accountless Clerk dev keys. Run `npx clerk@latest auth login` to claim the app.
- **Database:** with no `DATABASE_URL`, an embedded Postgres (PGlite) is created in `.data/pglite` and migrated automatically.

## How it works

| Piece | Where |
| --- | --- |
| Risk engine: decodes calldata / EIP-712, scores it, logs an event | `src/lib/risk-engine.ts` |
| Public API: `POST /api/v1/authorize` (Bearer API key) | `src/app/api/v1/authorize/route.ts` |
| Live balances (native + USDC/USDT on 5 chains, CoinGecko prices) | `src/lib/portfolio.ts`, `/api/portfolio` |
| Dashboard mutations (wallets, subscriptions, breaker, API keys) | `src/app/dashboard/actions.ts` |
| Schema / migrations | `src/db/schema.ts`, `drizzle/` |

### API

```bash
curl -X POST https://antabuse.run/api/v1/authorize \
  -H "Authorization: Bearer ak_live_…" -H "Content-Type: application/json" \
  -d '{"wallet":"0x…","chainId":8453,"transaction":{"to":"0x…","data":"0x…","value":"0"}}'
```

Send `typedData` (`{ domain, primaryType, message }`) instead of `transaction` for signature requests
(EIP-2612 `Permit`, Permit2 `PermitSingle`/`PermitBatch`, Seaport `OrderComponents`).
The wallet must be registered to the key's account. The response contains `verdict`
(`allowed` | `challenged` | `tripped`), `risk`, `reasons[]`, and the matched `subscription`.

## Deploy (Vercel)

1. Add a Postgres database (Vercel → Storage → Neon) so `DATABASE_URL` is set.
2. Set the Clerk keys from a **production** Clerk instance.
3. Deploy. The `vercel-build` script runs `drizzle-kit migrate` before `next build`.

After changing `src/db/schema.ts`, run `npm run db:generate` and commit the new migration.
