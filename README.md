# MoviyAI

MoviyAI mobile client (React Native / Expo).

## Web search

The Next.js client uses `https://www.moviyai.uz` for movie canonical URLs,
site name metadata and the sitemap. Set `SITE_URL` before building if the
public frontend origin changes. Deployments should redirect alternate public
hostnames to the canonical hostname while preserving the path.

The sitemap is available at `/sitemap.xml` and is linked from `/robots.txt`.
Movie detail URLs use `/movie/{id}` and the sitemap refreshes from the movie API.

## Kino olami

The bottom navbar logo and the side menu open `/kino-olami`.

| Client | Environment variable | Local value |
| --- | --- | --- |
| Next.js (`client/.env.local`) | `NEXT_PUBLIC_KINO_OLAMI_EMBED_URL` | `http://localhost:5000/embed` |
| Expo (`clientNative/.env.local`) | `EXPO_PUBLIC_KINO_OLAMI_EMBED_URL` | `http://<computer-LAN-IP>:5000/embed` |

Both production clients default to `https://kino-olami.uz/embed`. Next.js also defaults to
`http://localhost:5000/embed` in development. Set the public variables before building
Next.js or bundling Expo. For device testing, use an address reachable from the device
and an HTTPS endpoint if the development build blocks cleartext traffic.

Serve the Kino olami client build through its Express server. On that server, set
`MOVIYAI_FRAME_ORIGINS=https://www.moviyai.uz,https://moviyai.uz` if both web origins
serve the frontend. The Telegram web app is configured to use `https://www.moviyai.uz`.
For local testing, add `http://localhost:3000` to the local Kino olami configuration.
The API and admin hosts are separate from the web client.

If a CDN serves the HTML, configure the SPA fallback and the same CSP
`frame-ancestors` policy for `/embed` and `/embed/*`. Verify those responses have
no conflicting framing policy. If MoviyAI hosting applies `frame-src` or a
fullscreen permissions policy, allow the configured Kino olami embed origin.
