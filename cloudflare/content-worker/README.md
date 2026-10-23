# LawQuest Content Worker

Cloudflare Worker API for serving LawQuest legal packages from R2.

## R2 Bucket

Expected bucket:

```text
lawquest-legal-packages
```

Expected object layout:

```text
manifest.json
manifest.json.gz
objects/<codeId>/<language>/<versionId>.json.gz
```

## Endpoints

```text
GET /health
GET /manifest
GET /manifest.json
GET /manifest.json.gz
GET /packages/:codeId/:language/:versionId.json.gz
GET /objects/:codeId/:language/:versionId.json.gz
```

## Deploy

From this directory:

```bash
npx wrangler login
npx wrangler deploy
```

After deploy, copy the Worker URL and rebuild packages with:

```bash
LAWQUEST_PACKAGE_BASE_URL=https://<your-worker-url> npm run build:legal-packages
```

Then upload the regenerated `data/legal-v2/packages` files to R2.

## Why Worker Instead Of Public Bucket

The R2 bucket can stay private. The Worker controls:

- stable API paths
- cache headers
- future auth checks
- future paid/unlocked content rules
- future package redirects or deprecations
