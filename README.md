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

## Self-hosting on a Node.js VPS (Ubuntu)

This app is **not** a pure static site: admin, wallet, deposits, withdrawals,
KYC, PV/rank cycles and the cron webhooks run as server code. It therefore needs
a Node process, not just a static file server. Nothing here requires Bun,
Cloudflare or Wrangler — `bunfig.toml` / `bun.lock` are only used by Lovable's
own tooling and are ignored by npm.

```sh
npm install
npm run build     # outputs .output/ (Node server preset)
npm start         # serves the app on PORT (default 3000)
```

The build produces:

- `.output/server/index.mjs` — the Node server entry (`npm start` runs it)
- `.output/public/` — hashed client assets, images, favicon, robots.txt

Required environment variables on the server (set them in your process manager,
not in a committed file):

```
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=...              # needed at build time
VITE_SUPABASE_PUBLISHABLE_KEY=...  # needed at build time
PORT=3000
```

Keep it running with systemd or pm2, e.g.:

```sh
pm2 start .output/server/index.mjs --name km-prime
```

Then put Nginx in front as a reverse proxy — no SPA fallback rules are needed,
the Node server handles every route (including deep links and refreshes):

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

To target something other than a Node server, override the preset for that
build: `NITRO_PRESET=vercel npm run build`.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

