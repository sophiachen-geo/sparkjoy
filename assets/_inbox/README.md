# Photo inbox

Drop raw photo uploads here from your phone — any filename your phone gives them is fine
(e.g. `IMG_1234.jpeg`).

When you ask Claude in chat to add a new product, it will:

1. Move the photos out of `_inbox/` and into `assets/` with canonical names
   (`assets/<id>-1.jpg`, `assets/<id>-2.jpg`, …).
2. Wire them into `items.json`.
3. Open a PR for you to merge.

Don't put photos that are already in use here. Once an item is wired up, its photos
live at `assets/<id>-N.jpg` and the inbox is empty again.
