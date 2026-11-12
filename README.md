# Snip backend

A zero-dependency Bun API for creating and resolving short links. Links are
stored in memory and are cleared when the server restarts.

## Run

```sh
bun start
```

The server listens on port `3000` by default. Set `PORT` to change it and
`BASE_URL` to control the origin used in generated short links. If `BASE_URL`
is unset, `RAILWAY_PUBLIC_DOMAIN` is used when available; otherwise the local
origin is `http://localhost:<PORT>`. Set `PUBLIC_DIR` to serve static files
from a directory as well as the API.

## API

- `POST /api/links` with `{ "url": "https://example.com" }` creates a link.
- `GET /api/links` returns all created links.
- `GET /:code` redirects to the original URL and increments its hit count.
