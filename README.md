# نظّم (Nazzim)

Arabic-first productivity-products store. Originally built in Lovable, migrated to this
repository for full local development.

## Development

Uses [Bun](https://bun.sh).

```sh
git clone https://github.com/AethronX/Nazzim.git
cd Nazzim
bun install
bun run dev
```

## Deployment

Hosted on Vercel (Hobby, temporary while checkout is not yet wired up — see
`vercel.json` for the `NITRO_PRESET=vercel` build override this project needs).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Payments & delivery

Real payments run through Paddle Billing (overlay checkout) with delivery emails
via Resend. Checkout stays disabled — with a visible "store in setup" state —
until the environment variables are filled. See **[SETUP.md](./SETUP.md)** for the
step-by-step guide and the exact variable names (`PADDLE_CLIENT_TOKEN`,
`PADDLE_ENVIRONMENT`, `PADDLE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`ORDER_FROM_EMAIL`).
