# Spark Joy

A simple, static catalog site for selling secondhand items. Plain HTML/CSS/JavaScript — no framework, no build step.

## Project layout

```
index.html      Public catalog page
styles.css      Shared styles (used by both index.html and admin.html)
app.js          Public site logic (loads items.json, renders cards + modal)
items.json      The product catalog (single source of truth)
assets/         Product photos (one folder for everything)
admin.html      Local helper to add/edit items and status (NOT linked from the public site)
admin.js        Logic for the helper
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

## Adding a new product

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

## Marking a product as available / reserved / sold

1. Open <http://localhost:8000/admin.html>.
2. The catalog loads automatically. In section **2. Update status**, find the item and change the dropdown to `available`, `reserved`, or `sold`.
3. Click **Download items.json** in section 4 and replace the file in the project root.
4. Commit and push — the public site will reflect the new status (with badges, a corner ribbon, and a dimmed/struck-through visual treatment for sold items).

You can also do this by editing `items.json` directly — the `status` field on any item accepts `"available"`, `"reserved"`, or `"sold"`.

## Image workflow

- **Where**: all product photos go in `assets/`.
- **Naming**: `assets/<id>-1.jpg`, `assets/<id>-2.jpg`, etc. Predictable and easy to grep.
- **Formats**: any browser-supported format (`.jpg`, `.png`, `.webp`).
- **Paths**: always written as a relative path from the project root, e.g. `assets/foo-1.jpg`. This works locally and on static hosts like GitHub Pages.
- **Fallback**: if a photo path is missing or fails to load, the site shows a polished "Photo coming soon" placeholder instead of a broken-image icon.

### ⚠️ The two existing image files are empty stubs

The two files currently in `assets/` (`apple-61w-with-cord-1.jpg` and `apple-61w-no-cord-1.jpg`) are **2-byte text files containing only `\r\n`** — they are not real JPEGs. That is why the images don't display on the public site.

To fix them, replace each one with the actual photo at the same filename. The site will then render correctly with no other changes needed.

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
const CONTACT_EMAIL = "sophiazilisha@hotmail.com";
```

Change it once there and it updates the contact link, the mailto buttons, and the e-transfer instructions in the email body.
