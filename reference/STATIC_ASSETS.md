# Static Assets — single source, mirrored to `public/`

> Extracted from CLAUDE.md §4-bis for context reduction. Setup completed in PP-0.

**The single source of truth for shared static assets (logos, onboarding illustrations) lives in `reference/mockups/shared/`.** This folder mirrors the relative path used inside the HTML mockups so they remain visually functional when opened directly in a browser.

```
reference/mockups/
├── shared/                                         <- SOURCE — single editable location
│   ├── logos/
│   │   ├── logos-brandup.png
│   │   ├── logos-traceup.png
│   │   └── logos-linkup.png
│   └── onboarding-images/
│       ├── onboarding-images-b2b_img.jpg
│       └── onboarding-images-b2c_img.jpg
├── auth_*.html, dashboard_*.html, admin_*.html, public_*.html  <- reference paths like src="shared/logos/..."
└── README.md
```

**For Next.js to serve these at runtime, the same folder MUST also exist under `public/shared/`** — Next.js only serves files from `public/`, not from `reference/`.

## Mandatory setup step (Phase 0)

When initializing the project, copy the shared folder from the reference into `public/`:

```bash
mkdir -p public
cp -r reference/mockups/shared public/shared
```

This step is part of Phase 0 and must be performed before the dev server runs. **If any logo or illustration is missing at runtime, this is almost always the cause** — re-run the cp command.

## Optional npm script to automate sync

If shared assets ever change (new logo, new onboarding image), keep `reference/mockups/shared/` as the single editable copy and re-sync:

```json
// package.json
{
  "scripts": {
    "sync-shared": "rm -rf public/shared && cp -r reference/mockups/shared public/shared",
    "prebuild": "npm run sync-shared",
    "predev": "npm run sync-shared"
  }
}
```

With this, `npm run dev` and `npm run build` auto-resync. Edit only `reference/mockups/shared/`; never edit `public/shared/` directly (it will be overwritten).

## Reference paths — HTML vs Next.js

The HTML mockups use **relative** paths (because they sit beside `shared/`):
```html
<!-- in reference/mockups/dashboard_index.html -->
<img src="shared/logos/logos-brandup.png" alt="BrandUP" />
```

The Next.js code uses **absolute** paths (because Next.js serves `public/` at `/`):
```tsx
// in src/components/...
<img src="/shared/logos/logos-brandup.png" alt="BrandUP" />
```

The only difference is the leading `/`. When porting a mockup, just prefix the path with `/`.

## External image domains

Avatars (`api.dicebear.com`) and placeholder banners (`picsum.photos`) and TraceUP thumbnails (`img.youtube.com`) are loaded from external CDNs. These must be whitelisted in `next.config.js` if you want to use `next/image`:

```ts
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "s1.dmcdn.net" },              // Dailymotion thumbnails
      { protocol: "https", hostname: "cdn.vivasky.media" },         // future production CDN
    ],
  },
};
```

If you stick to plain `<img>` tags during Phase 0-4 (port phase), you don't need this whitelist — the browser loads any URL. Add it before migrating to `next/image` (Phase 11 polish).

## What about uploaded company assets?

Logos, gallery images, RSE receipts, profile photos — these are user-uploaded files stored on object storage (S3 / R2). They live at `https://cdn.vivasky.media/uploads/...` and are referenced by URL in the DB. **Do not put them in `public/`** — they are dynamic, owner-scoped, and managed via `POST /api/v1/uploads` (see API_REFERENCE §11).
