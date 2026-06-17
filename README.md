# seanwesleysmith.com

Single Cloudflare Worker deployment for path-mounted Bun sites on `seanwesleysmith.com`.

## Layout

- `apps/home/static` is copied to the domain root.
- `apps/<site>` contains one hosted app.
- `sites.config.ts` declares which apps build to which URL paths.
- `worker/index.js` handles domain routing, SPA fallbacks, and path-specific APIs.
- `dist/` is generated and deployed by Wrangler.

## Commands

```sh
bun install
bun run build
bun run deploy
```

For local Swedish Teacher development:

```sh
bun run dev:swedish-teacher
```

## Add A Path App

1. Create `apps/new-path/index.html` and app source files.
2. Add a `bun-html` entry to `sites.config.ts`:

```ts
{
  kind: "bun-html",
  name: "new-path",
  route: "/new-path",
  entrypoint: "apps/new-path/index.html",
  outDir: "dist/new-path",
  publicPath: "/new-path/",
}
```

3. If the app is an SPA, add `"/new-path"` to `spaSites` in `worker/index.js`.
4. Run `bun run deploy`.
