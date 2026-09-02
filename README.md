# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

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
