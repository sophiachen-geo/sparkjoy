// Local catalog helper for Spark Joy.
// Pure browser code: no network, no storage, no secrets.
// Designed to be safe even if accidentally accessible publicly:
//   - No private data or credentials.
//   - "Edit" mode only enables when running on localhost or file://.
//   - In any other context, the form still works for preview/download,
//     but the banner makes it clear that this is a local helper, not a backend.

const STATUS_VALUES = ["available", "reserved", "sold"];

const state = {
  items: [],
  editingId: null, // when set, "Add / update" overwrites that item
};

const $ = (id) => document.getElementById(id);

const els = {
  modePill: $("modePill"),
  publicWarn: $("publicWarn"),

  loadFetch: $("loadFetch"),
  loadFile: $("loadFile"),
  loadStatus: $("loadStatus"),

  itemList: $("itemList"),
  categoryList: $("categoryList"),

  fId: $("f-id"),
  fTitle: $("f-title"),
  fShortDesc: $("f-shortDesc"),
  fDesc: $("f-desc"),
  fPrice: $("f-price"),
  fCurrency: $("f-currency"),
  fCategory: $("f-category"),
  fCondition: $("f-condition"),
  fStatus: $("f-status"),
  fDate: $("f-date"),
  fPhotos: $("f-photos"),
  fFeatured: $("f-featured"),
  fPaypal: $("f-paypal"),
  fEtransfer: $("f-etransfer"),

  addOrUpdate: $("addOrUpdate"),
  resetForm: $("resetForm"),
  formError: $("formError"),

  copyJson: $("copyJson"),
  downloadJson: $("downloadJson"),
  jsonOut: $("jsonOut"),
};

// ---------- Local-vs-public detection ----------
function isLocal() {
  if (location.protocol === "file:") return true;
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local");
}

function applyMode() {
  if (isLocal()) {
    els.modePill.textContent = "Local mode";
    els.modePill.classList.add("local");
  } else {
    els.modePill.textContent = "Public mode (read-only)";
    els.modePill.classList.add("public");
    els.publicWarn.hidden = false;
  }
}

// ---------- Helpers ----------
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parsePhotoLines(s) {
  return (s || "")
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function showError(msg) {
  if (!msg) {
    els.formError.hidden = true;
    els.formError.textContent = "";
    return;
  }
  els.formError.hidden = false;
  els.formError.textContent = msg;
}

// ---------- Loading ----------
async function loadFromFetch() {
  try {
    const res = await fetch("items.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items)) throw new Error("items.json is not a JSON array");
    setItems(items);
    els.loadStatus.textContent = `Loaded ${items.length} item(s) from items.json.`;
  } catch (err) {
    els.loadStatus.textContent = `Could not load items.json (${err.message}). Try the file picker, or run a local server.`;
  }
}

function loadFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const items = JSON.parse(reader.result);
      if (!Array.isArray(items)) throw new Error("not an array");
      setItems(items);
      els.loadStatus.textContent = `Loaded ${items.length} item(s) from ${file.name}.`;
    } catch (err) {
      els.loadStatus.textContent = `Could not parse ${file.name}: ${err.message}`;
    }
  };
  reader.readAsText(file);
}

function setItems(items) {
  state.items = items.map(normalizeItem);
  refreshCategories();
  renderItemList();
  renderJsonOut();
}

function normalizeItem(it) {
  const status = STATUS_VALUES.includes(it.status) ? it.status : "available";
  return {
    id:               it.id || slugify(it.title || ""),
    title:            it.title || "",
    shortDescription: it.shortDescription || "",
    description:      it.description || "",
    price:            Number(it.price) || 0,
    currency:         it.currency || "CAD",
    category:         it.category || "",
    condition:        it.condition || "",
    status,
    photos:           Array.isArray(it.photos) ? it.photos.filter(Boolean) : [],
    featuredPhoto:    it.featuredPhoto || (Array.isArray(it.photos) ? it.photos[0] : "") || "",
    dateAdded:        it.dateAdded || "",
    paypalUrl:        it.paypalUrl || "",
    etransferNote:    it.etransferNote || "",
  };
}

function refreshCategories() {
  const cats = [...new Set(state.items.map(i => i.category).filter(Boolean))].sort();
  els.categoryList.innerHTML = "";
  for (const c of cats) {
    const o = document.createElement("option");
    o.value = c;
    els.categoryList.appendChild(o);
  }
}

// ---------- Item list (status workflow) ----------
function renderItemList() {
  els.itemList.innerHTML = "";
  if (state.items.length === 0) {
    const p = document.createElement("p");
    p.className = "help";
    p.textContent = "No items yet. Load items.json above, or add one below.";
    els.itemList.appendChild(p);
    return;
  }
  for (const it of state.items) {
    const row = document.createElement("div");
    row.className = "item-row";

    const name = document.createElement("div");
    name.className = "name";
    name.innerHTML = `<b>${escapeHtml(it.title || "(no title)")}</b><br><span class="help">${escapeHtml(it.id)}</span>`;

    const sel = document.createElement("select");
    for (const v of STATUS_VALUES) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v.charAt(0).toUpperCase() + v.slice(1);
      if (it.status === v) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", (e) => {
      it.status = e.target.value;
      renderJsonOut();
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost small-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => loadIntoForm(it.id));

    const dupBtn = document.createElement("button");
    dupBtn.className = "btn btn-ghost small-btn";
    dupBtn.textContent = "Duplicate";
    dupBtn.addEventListener("click", () => {
      const copy = { ...it, id: `${it.id}-copy`, title: `${it.title} (copy)`, dateAdded: todayIso() };
      state.items.unshift(copy);
      renderItemList();
      renderJsonOut();
    });

    row.appendChild(name);
    row.appendChild(sel);
    row.appendChild(editBtn);
    row.appendChild(dupBtn);
    els.itemList.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;",
  }[c]));
}

// ---------- Form ----------
function loadIntoForm(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;
  state.editingId = id;
  els.fId.value = it.id;
  els.fTitle.value = it.title;
  els.fShortDesc.value = it.shortDescription;
  els.fDesc.value = it.description;
  els.fPrice.value = it.price;
  els.fCurrency.value = it.currency || "CAD";
  els.fCategory.value = it.category;
  els.fCondition.value = it.condition;
  els.fStatus.value = it.status;
  els.fDate.value = it.dateAdded || todayIso();
  els.fPhotos.value = (it.photos || []).join("\n");
  els.fFeatured.value = it.featuredPhoto || "";
  els.fPaypal.value = it.paypalUrl || "";
  els.fEtransfer.value = it.etransferNote || "";
  els.addOrUpdate.textContent = `Update "${it.id}"`;
  showError("");
  els.fId.scrollIntoView({ behavior: "smooth", block: "center" });
}

function readFormItem() {
  const title = els.fTitle.value.trim();
  let id = els.fId.value.trim();
  if (!id) id = slugify(title);

  const photos = parsePhotoLines(els.fPhotos.value);
  const featured = els.fFeatured.value.trim() || photos[0] || "";

  return {
    id,
    title,
    shortDescription: els.fShortDesc.value.trim(),
    description:      els.fDesc.value.trim(),
    price:            Number(els.fPrice.value) || 0,
    currency:         els.fCurrency.value || "CAD",
    category:         els.fCategory.value.trim(),
    condition:        els.fCondition.value.trim(),
    status:           els.fStatus.value,
    photos,
    featuredPhoto:    featured,
    dateAdded:        els.fDate.value || todayIso(),
    paypalUrl:        els.fPaypal.value.trim(),
    etransferNote:    els.fEtransfer.value.trim(),
  };
}

function validate(item, opts = {}) {
  if (!item.title) return "Title is required.";
  if (!item.id) return "ID is required (or fill in a title to auto-generate one).";
  if (!/^[a-z0-9-]+$/.test(item.id)) return "ID must be lowercase letters, numbers, and hyphens only.";
  if (item.price < 0 || Number.isNaN(item.price)) return "Price must be a non-negative number.";
  if (!STATUS_VALUES.includes(item.status)) return "Status must be available, reserved, or sold.";
  if (!opts.allowExisting) {
    const clash = state.items.some(x => x.id === item.id);
    if (clash) return `An item with id "${item.id}" already exists. Edit it from the list above, or change the ID.`;
  }
  return null;
}

function resetForm() {
  state.editingId = null;
  els.fId.value = "";
  els.fTitle.value = "";
  els.fShortDesc.value = "";
  els.fDesc.value = "";
  els.fPrice.value = "";
  els.fCurrency.value = "CAD";
  els.fCategory.value = "";
  els.fCondition.value = "";
  els.fStatus.value = "available";
  els.fDate.value = todayIso();
  els.fPhotos.value = "";
  els.fFeatured.value = "";
  els.fPaypal.value = "";
  els.fEtransfer.value = "";
  els.addOrUpdate.textContent = "Add / update item";
  showError("");
}

function addOrUpdate() {
  const item = readFormItem();
  if (state.editingId) {
    const err = validate(item, { allowExisting: true });
    if (err) { showError(err); return; }
    const idx = state.items.findIndex(x => x.id === state.editingId);
    if (idx === -1) {
      // editing target disappeared — fall back to insert
      state.items.unshift(item);
    } else {
      state.items[idx] = item;
    }
  } else {
    const err = validate(item);
    if (err) { showError(err); return; }
    // Newest first.
    state.items.unshift(item);
  }
  refreshCategories();
  renderItemList();
  renderJsonOut();
  resetForm();
}

// ---------- JSON output ----------
function renderJsonOut() {
  els.jsonOut.textContent = JSON.stringify(state.items, null, 2) + "\n";
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(els.jsonOut.textContent);
    flash(els.copyJson, "Copied!");
  } catch {
    flash(els.copyJson, "Copy failed");
  }
}

function downloadJson() {
  const blob = new Blob([els.jsonOut.textContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "items.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1200);
}

// ---------- Wiring ----------
function init() {
  applyMode();
  resetForm();
  renderItemList();
  renderJsonOut();

  els.loadFetch.addEventListener("click", loadFromFetch);
  els.loadFile.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFromFile(f);
  });

  els.addOrUpdate.addEventListener("click", addOrUpdate);
  els.resetForm.addEventListener("click", resetForm);

  els.copyJson.addEventListener("click", copyJson);
  els.downloadJson.addEventListener("click", downloadJson);

  // Auto-load on page open if items.json is reachable.
  loadFromFetch();
}

init();
