# Remix of Remix of Remix of Sentinel Scan

i also need smthg like if am searching anything in website it should automatically scan the site and warn me and i want you to make a cool and attractive cyber security ui theme

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a3ece955-f384-44a8-917a-c1e8e5cadd77).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploying from GitHub

This app has a server side (the scanner calls Google Safe Browsing, VirusTotal
and the domain registry from the server). GitHub Pages can only host static
files, so a Pages deploy will always break those checks — that is why the API
calls stopped working. The included workflow deploys to Cloudflare Workers
instead, which runs both the pages and the server code.

One-time setup:

1. Create a free Cloudflare account.
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**,
   and add:
   - `CLOUDFLARE_API_TOKEN` (Cloudflare dashboard → My Profile → API Tokens →
     "Edit Cloudflare Workers" template)
   - `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → Workers & Pages, right sidebar)
   - `GOOGLE_API_KEY`
   - `GOOGLE_SAFE_BROWSING_API_KEY`
   - `VIRUSTOTAL_API_KEY`
3. Push to `main`. The workflow builds the app, uploads the three scanner keys
   as Worker secrets, and publishes the site.

Make sure the **Safe Browsing API** is enabled in the Google Cloud project that
owns the key, otherwise Google returns an error and only VirusTotal results show.

Running locally: copy `.env.example` to `.env`, fill in the three keys, then
`npm run dev`.
