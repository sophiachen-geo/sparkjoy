# Spark Joy — instructions for Claude

This file tells Claude how to work in this repo. It's the source of truth for any future Claude session that opens the project. Keep it short, concrete, and accurate.

## What this project is

A static catalog site for selling secondhand items. Plain HTML/CSS/JavaScript — no framework, no build step, no backend. Deployed via GitHub Pages.

## Files

```
index.html        Public catalog page
styles.css        Shared styles (used by index.html and admin.html)
app.js            Public site logic — loads items.json, renders cards + modal
items.json        The product catalog (single source of truth)
assets/           Product photos
assets/_inbox/    Drop zone for raw phone uploads (filename-as-is)
admin.html        Local helper to add/edit items and toggle status
admin.js          Logic for the local helper
README.md         User-facing instructions
CLAUDE.md         This file
```

## Item schema

```json
{
  "id": "teak-side-table-01",
  "title": "Teak side table",
  "shortDescription": "Mid-century, oiled.",
  "description": "Full details, dimensions, history, quirks.",
  "price": 80,
  "currency": "CAD",
  "category": "Furniture",
  "condition": "Gently used",
  "status": "available",
  "photos": ["assets/teak-side-table-01-1.jpg", "assets/teak-side-table-01-2.jpg"],
  "featuredPhoto": "assets/teak-side-table-01-1.jpg",
  "dateAdded": "2025-05-01",
  "paypalUrl": "https://www.paypal.me/...",
  "etransferNote": "Teak side table — teak-side-table-01"
}
```

Required for the site to render: `id`, `title`, `price`, `currency`, `category`, `condition`, `status`. Everything else is optional. `status` ∈ `available` | `reserved` | `sold`.

## Image rules

- All product photos live in `assets/`.
- Canonical filename pattern: `assets/<id>-<n>.jpg` (e.g. `assets/teak-side-table-01-1.jpg`).
- Raw phone uploads land in `assets/_inbox/` with whatever filename the phone gives them (`IMG_1234.jpeg`). Move + rename them to canonical paths as part of intake.
- The site has a graceful fallback for missing/broken images, so partial states are fine.

## Branching & commits

- **Never push directly to `main`.**
- One change = one branch named `claude/<short-task>` (e.g. `claude/add-teak-side-table`, `claude/status-apple-61w-01-sold`).
- Open a PR to `main`. The user merges it from their phone.
- Commit messages: short, imperative, explain the why if non-obvious.
- Don't skip hooks or amend pushed commits.

## Intake workflows

The user interacts in chat. They may use the templates below, or describe the change casually — both are fine. When something is ambiguous, ask one targeted question rather than guessing.

### Adding a product

User template (recommended):

```
/add-product
title: <required>
shortDescription: <one line, optional>
description: <longer, optional>
price: <number>
currency: <CAD|USD|EUR|GBP, default CAD>
category: <required>
condition: <e.g. Gently used>
status: <available|reserved|sold, default available>
photos: <comma-separated photo references, in display order — see "Photos field" below>
featured: <1-based index into photos, default 1>
id: <optional; auto-derived from title if omitted>
paypalUrl: <optional>
etransferNote: <optional>
```

**Photos field**

Each entry in `photos:` can be written in any of these forms — they all resolve to the same file:

- Bare filename: `IMG_1234.jpeg` *(preferred — shortest)*
- With inbox prefix: `assets/_inbox/IMG_1234.jpeg`
- With or without leading slash, with any common image extension (`.jpg`, `.jpeg`, `.png`, `.webp`, case-insensitive)

If a referenced photo isn't found in `assets/_inbox/`, ask the user which file they meant rather than guessing.

Steps Claude takes:

1. Pull `main`, branch off `claude/add-<id>`.
2. If `id` is missing, slugify the title (lowercase, hyphenated, alphanumeric only). Append `-01`, `-02`, … only if needed to disambiguate from existing IDs.
3. Resolve each photo reference to a real file in `assets/_inbox/`. For each:
   - `git mv` it to `assets/<id>-<n>.jpg` (preserving the file extension if not `.jpg`/`.jpeg`; rename `.jpeg` → `.jpg`).
   - Set `featuredPhoto` to the photo at `featured` (default 1).
4. Append the new item to `items.json` (newest first is fine; the site sorts by `dateAdded`). Set `dateAdded` to today (UTC date is OK).
5. Run a quick sanity check: `node --check` is not needed for JSON, but verify the file parses.
6. Commit, push, open PR with a clear title and a short summary of the new item.

### Changing status

User template:

```
/set-status <id> <available|reserved|sold>
```

Or casual: "mark the apple adapter with cord as sold". When the reference is ambiguous, ask.

Steps Claude takes:

1. Pull `main`, branch off `claude/status-<id>-<status>`.
2. Update only the `status` field on that item in `items.json`.
3. Commit, push, open PR titled e.g. `Mark apple-61w-01 as sold`.

### Editing other fields

Same pattern: branch `claude/edit-<id>`, change only what was asked, PR.

## Things to never do

- Don't expose secrets, credentials, or private notes anywhere in the repo.
- Don't add a backend, framework, or build step. This site is intentionally tiny.
- Don't link `admin.html` from `index.html` or any public page.
- Don't delete `assets/_inbox/README.md` (it keeps the folder tracked and self-explanatory).
- Don't rewrite/delete existing items unless the user explicitly says so.
- Don't push to `main` directly.

## Things to do

- Keep changes small and focused — one PR per logical change.
- Preserve the existing palette and tone unless the user asks to change them.
- When you can't do something (e.g. extract photo bytes from a chat-attached image), say so plainly and propose the simplest workaround.
- Run a quick local check before declaring done: `python3 -m http.server` and curl `/`, `/items.json`, etc.

## Payment recipients & contact email

Two distinct emails:

- **Contact / Interac e-transfer recipient** — defined once in `app.js` as `CONTACT_EMAIL`. Used by:
  - the contact link in `index.html` (rendered into `#contactEmail` by JS)
  - the prefilled mailto subject/body for the modal "Email me" button
  - the "How to buy" payment-recipients line in `index.html`
  - the README example block

- **PayPal recipient** — hardcoded in `index.html` inside the "How to buy" payment-recipients line. Not used elsewhere (the actual PayPal button URL lives per-item in `items.json` as `paypalUrl`).

If the user changes either email, update all the spots above.
