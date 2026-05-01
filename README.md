# Spark Joy

A simple, static catalog site for selling secondhand items. Plain HTML/CSS/JavaScript — no framework, no build step.

## Project layout

```
index.html        Public catalog page
styles.css        Shared styles (used by both index.html and admin.html)
app.js            Public site logic (loads items.json, renders cards + modal)
items.json        The product catalog (single source of truth)
assets/           Product photos (one folder for everything)
assets/_inbox/    Drop zone for raw phone uploads — Claude renames them on intake
admin.html        Local helper to add/edit items and status (NOT linked from the public site)
admin.js          Logic for the helper
CLAUDE.md         Instructions for Claude — defines the chat intake protocol
```

## Running locally

`fetch("items.json")` does **not** work when you double-click `index.html` (browsers block local file fetches). Always run a tiny static server.

From the project root:

```bash
# Python 3 (already installed on most machines)
python3 -m http.server 8000

# or Node
npx http-server -p 8000
```

Then open:

- Public site: <http://localhost:8000/>
- Local helper: <http://localhost:8000/admin.html>

## Two ways to add or update a product

You have two options, depending on whether you're at your computer or on your phone:

| Where you are | Workflow |
|---|---|
| **On your phone** | Use the **chat intake** below — upload photos to GitHub, send Claude the details in chat, tap-merge the PR. |
| **At your computer** | Use the **local helper** (`admin.html`) — fill in a form, download `items.json`, commit. |

Both paths edit the same `items.json` and end with a normal git commit.

---

## Chat intake (phone-friendly)

This works because the project has a `CLAUDE.md` file that tells Claude exactly how to handle the workflow. You just paste a template in chat and Claude does the rest (creates a branch, renames photos, updates `items.json`, opens a PR for you to merge).

### 1. Upload photos to `assets/_inbox/`

On the GitHub mobile app or `github.com` in your browser:

1. Navigate to `assets/_inbox/` on the branch you're working on (or `main`).
2. Tap **Add file → Upload files**.
3. Pick the photos from your phone. Filenames don't matter — keep whatever your phone gave them (e.g. `IMG_1234.jpeg`). Claude will rename them.
4. Commit the upload.

### 2. Tell Claude what to do

Paste one of these templates in chat. Fill in only the fields you have — anything optional can be omitted.

**Add a product**

```
/add-product
title: Teak side table
shortDescription: Mid-century, oiled.
description: 50 × 40 × 55 cm. Minor scuffs on the legs.
price: 80
currency: CAD
category: Furniture
condition: Gently used
status: available
photos: assets/_inbox/IMG_1234.jpeg, assets/_inbox/IMG_1235.jpeg
featured: 1
```

**Change a product's status**

```
/set-status apple-61w-01 sold
```

Statuses: `available` / `reserved` / `sold`.

You can also describe the change casually ("mark the apple adapter with cord as reserved"). Claude will ask one question if anything is ambiguous.

### 3. Merge the PR

Claude opens a PR with the changes. You tap **Merge pull request** on your phone. GitHub Pages redeploys automatically.

---

## Local helper (computer)

1. Open the local helper: <http://localhost:8000/admin.html>
2. The helper auto-loads `items.json` on page open (or click **Load from items.json**).
3. Fill in section **3. Add a new item**:
   - **ID / slug** — lowercase, hyphenated, e.g. `teak-side-table-01`. Auto-generated from the title if you leave it empty.
   - **Title**, **short description**, **long description**.
   - **Price** + **currency**.
   - **Category** (autocompletes from existing categories), **condition**.
   - **Status**: `available` / `reserved` / `sold`.
   - **Date added** — defaults to today.
   - **Photos** — one path per line, e.g. `assets/teak-side-table-01-1.jpg`. The first one is used as the featured photo unless you set one explicitly.
   - **Featured photo** — optional override.
   - **PayPal URL** / **e-transfer note** — optional.
4. Click **Add / update item**.
5. Drop the actual image files into `assets/`, named to match the paths you typed.
6. In section **4. Updated items.json**, click **Download items.json** and replace the file in the project root with the downloaded one. Commit both the new images and the updated JSON.

### Changing status from the local helper

1. Open <http://localhost:8000/admin.html>.
2. In section **2. Update status**, change the dropdown next to the item.
3. **Download items.json** in section 4, replace the file in the project root, commit, push.

You can also edit `items.json` directly — the `status` field accepts `"available"`, `"reserved"`, or `"sold"`.

## Image workflow

- **Where**: all product photos go in `assets/`.
- **Inbox**: photos uploaded from your phone live temporarily in `assets/_inbox/`. Claude moves them to canonical names during chat intake.
- **Naming**: `assets/<id>-1.jpg`, `assets/<id>-2.jpg`, etc. Predictable and easy to grep.
- **Formats**: any browser-supported format (`.jpg`, `.png`, `.webp`).
- **Paths**: always written as a relative path from the project root, e.g. `assets/foo-1.jpg`. This works locally and on static hosts like GitHub Pages.
- **Fallback**: if a photo path is missing or fails to load, the site shows a polished "Photo coming soon" placeholder instead of a broken-image icon.

## Local helper safety notes

`admin.html` is a **client-side only** tool:

- No server, no API, no credentials, no storage. All editing happens in your browser.
- It does not include any private notes, secrets, or admin keys.
- Even if someone accessed it on the deployed site, the worst they could do is generate a JSON file in their own browser. They cannot write to your `items.json`.
- It is not linked from the public `index.html`.
- A banner at the top makes it clear it is a local helper, and a "Public mode" indicator appears when it's not running on `localhost` or `file://`.

If you want stronger isolation, you can either:
- Move `admin.html` and `admin.js` outside the deployed folder, or
- Add `admin.*` to your hosting's ignore list.

## Status / schema reference

Each item in `items.json` looks like this:

```json
{
  "id": "teak-side-table-01",
  "title": "Teak side table",
  "shortDescription": "Small mid-century teak table, oiled.",
  "description": "Detailed description with dimensions and history.",
  "price": 80,
  "currency": "CAD",
  "category": "Furniture",
  "condition": "Gently used",
  "status": "available",
  "photos": [
    "assets/teak-side-table-01-1.jpg",
    "assets/teak-side-table-01-2.jpg"
  ],
  "featuredPhoto": "assets/teak-side-table-01-1.jpg",
  "dateAdded": "2025-05-01",
  "paypalUrl": "https://www.paypal.me/yourhandle",
  "etransferNote": "Teak side table — teak-side-table-01"
}
```

Only `id`, `title`, `price`, `currency`, `category`, `condition`, and `status` are needed for the site to render. Photos are optional — missing or broken images get a clean fallback. The rest are optional metadata.

## Changing the contact email

The site uses one contact email defined at the top of `app.js`:

```js
const CONTACT_EMAIL = "thegoldenratio.geo@icloud.com";
```

Change it once there and it updates the contact link, the mailto buttons, and the e-transfer instructions in the email body.
