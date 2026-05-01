// Spark Joy — public catalog logic.
// Reads items.json and renders cards + modal. No build step.

// Single source of truth for the public contact email.
// Change it here and it updates the contact link, mailto buttons,
// and the e-transfer instructions in the email body.
const CONTACT_EMAIL = "thegoldenratio.geo@icloud.com";

const STATUS_LABELS = {
  available: "Available",
  reserved:  "Reserved",
  sold:      "Sold",
};

const state = {
  items: [],
  filtered: [],
  categories: new Set(),
  q: "",
  category: "all",
  statusFilter: "all",
  sort: "newest",
};

const els = {
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  q: document.getElementById("q"),
  category: document.getElementById("category"),
  statusFilter: document.getElementById("statusFilter"),
  sort: document.getElementById("sort"),
  contactEmail: document.getElementById("contactEmail"),
  modal: document.getElementById("modal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModal: document.getElementById("closeModal"),
  modalMedia: document.getElementById("modalMedia"),
  modalImg: document.getElementById("modalImg"),
  thumbs: document.getElementById("thumbs"),
  modalTitle: document.getElementById("modalTitle"),
  modalPrice: document.getElementById("modalPrice"),
  modalBadge: document.getElementById("modalBadge"),
  modalDesc: document.getElementById("modalDesc"),
  modalCategory: document.getElementById("modalCategory"),
  modalCondition: document.getElementById("modalCondition"),
  buyBtn: document.getElementById("buyBtn"),
  messageBtn: document.getElementById("messageBtn"),
};

function money(n, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function normalizeStatus(s) {
  const v = normalize(s);
  if (v === "reserved") return "reserved";
  if (v === "sold") return "sold";
  return "available";
}

function featuredOf(it) {
  return it.featuredPhoto || (it.photos && it.photos[0]) || "";
}

function bySort(items) {
  const arr = [...items];
  if (state.sort === "price-asc") return arr.sort((a, b) => a.price - b.price);
  if (state.sort === "price-desc") return arr.sort((a, b) => b.price - a.price);
  // newest first: prefer dateAdded, fall back to original array order
  return arr.sort((a, b) => {
    const da = a.dateAdded ? Date.parse(a.dateAdded) : 0;
    const db = b.dateAdded ? Date.parse(b.dateAdded) : 0;
    if (db !== da) return db - da;
    return 0;
  });
}

function applyFilters() {
  const q = normalize(state.q);
  const cat = state.category;
  const st = state.statusFilter;

  let out = state.items.filter(it => {
    const hay = normalize([it.title, it.shortDescription, it.description, it.category, it.condition, it.id].join(" "));
    const okQ = q ? hay.includes(q) : true;
    const okC = (cat === "all") ? true : it.category === cat;
    const okS = (st === "all") ? true : normalizeStatus(it.status) === st;
    return okQ && okC && okS;
  });

  out = bySort(out);
  state.filtered = out;
  render();
}

function makeFallback(label) {
  const div = document.createElement("div");
  div.className = "img-fallback";
  div.innerHTML = `<span class="icon" aria-hidden="true">🖼️</span><span>${label}</span>`;
  return div;
}

// Replace a broken/missing <img> with a polished placeholder.
function attachImageFallback(img, container, label = "Photo coming soon") {
  const swap = () => {
    if (img.dataset.fellBack === "1") return;
    img.dataset.fellBack = "1";
    img.remove();
    container.appendChild(makeFallback(label));
  };
  img.addEventListener("error", swap);
  // If no src or empty src, fall back immediately (don't trigger a network request).
  if (!img.getAttribute("src")) {
    swap();
  }
}

function render() {
  const total = state.filtered.length;
  const all = state.items.length;

  els.status.textContent = total === all
    ? `${all} item${all === 1 ? "" : "s"}`
    : `${total} of ${all} item${all === 1 ? "" : "s"} shown`;

  els.grid.innerHTML = "";

  if (total === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="icon" aria-hidden="true">🔍</div>
      <h2>No items match</h2>
      <p>Try clearing the search or picking a different category or status.</p>
    `;
    els.grid.appendChild(empty);
    return;
  }

  for (const it of state.filtered) {
    const status = normalizeStatus(it.status);

    const card = document.createElement("article");
    card.className = `card is-${status}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${it.title}`);

    const media = document.createElement("div");
    media.className = "card-media";

    if (status === "sold" || status === "reserved") {
      const ribbon = document.createElement("span");
      ribbon.className = `ribbon ribbon-${status}`;
      ribbon.textContent = STATUS_LABELS[status];
      media.appendChild(ribbon);
    }

    const featured = featuredOf(it);
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = it.title || "";
    if (featured) img.src = featured;
    media.appendChild(img);
    attachImageFallback(img, media);

    const body = document.createElement("div");
    body.className = "card-body";

    const top = document.createElement("div");
    top.className = "card-top";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = it.title;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = money(it.price, it.currency || "CAD");

    top.appendChild(title);
    top.appendChild(price);

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = [it.category, it.condition].filter(Boolean).join(" · ");

    const badge = document.createElement("span");
    badge.className = `badge badge-${status}`;
    badge.textContent = STATUS_LABELS[status];

    body.appendChild(top);
    body.appendChild(meta);
    body.appendChild(badge);

    card.appendChild(media);
    card.appendChild(body);

    card.addEventListener("click", () => openModal(it));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(it);
      }
    });

    els.grid.appendChild(card);
  }
}

function openModal(it) {
  const status = normalizeStatus(it.status);

  els.modalTitle.textContent = it.title;
  els.modalDesc.textContent = it.description || it.shortDescription || "";
  els.modalCategory.textContent = it.category || "—";
  els.modalCondition.textContent = it.condition || "—";
  els.modalPrice.textContent = money(it.price, it.currency || "CAD");

  els.modalBadge.className = `badge badge-${status}`;
  els.modalBadge.textContent = STATUS_LABELS[status];

  // Photos: featured first, then the rest (deduped).
  const featured = featuredOf(it);
  const rest = (it.photos || []).filter(p => p && p !== featured);
  const photos = featured ? [featured, ...rest] : rest;

  // Reset modal media (remove any prior fallback).
  const existingFallback = els.modalMedia.querySelector(".img-fallback");
  if (existingFallback) existingFallback.remove();
  els.modalImg.dataset.fellBack = "";
  els.modalImg.style.display = "";
  els.modalImg.removeAttribute("src");
  els.modalImg.alt = it.title || "";

  if (photos[0]) {
    els.modalImg.src = photos[0];
  } else {
    // No photos at all — show the modal fallback.
    els.modalImg.style.display = "none";
    const fb = makeFallback("Photo coming soon");
    els.modalMedia.insertBefore(fb, els.thumbs);
  }
  // If the src is set but fails to load, fall back gracefully.
  els.modalImg.onerror = () => {
    els.modalImg.style.display = "none";
    if (!els.modalMedia.querySelector(".img-fallback")) {
      const fb = makeFallback("Photo unavailable");
      els.modalMedia.insertBefore(fb, els.thumbs);
    }
  };

  els.thumbs.innerHTML = "";
  if (photos.length > 1) {
    photos.forEach((p, idx) => {
      const t = document.createElement("img");
      t.src = p;
      t.alt = `${it.title} photo ${idx + 1}`;
      if (idx === 0) t.classList.add("is-active");
      t.addEventListener("click", () => {
        els.modalImg.style.display = "";
        els.modalImg.src = p;
        const fb = els.modalMedia.querySelector(".img-fallback");
        if (fb) fb.remove();
        els.thumbs.querySelectorAll("img").forEach(x => x.classList.remove("is-active"));
        t.classList.add("is-active");
      });
      // If a thumbnail itself is broken, hide it rather than showing a broken icon.
      t.addEventListener("error", () => t.remove());
      els.thumbs.appendChild(t);
    });
  }

  // Buy / message actions
  const isPurchasable = status === "available";
  els.buyBtn.textContent = status === "sold" ? "Sold" : (status === "reserved" ? "Reserved" : "Buy");
  els.buyBtn.setAttribute("aria-disabled", isPurchasable ? "false" : "true");

  const paypal = it.paypalUrl || "";
  els.buyBtn.href = isPurchasable ? (paypal || buildMailto(it)) : "#";

  els.messageBtn.href = buildMailto(it);

  showModal();
}

function buildMailto(it) {
  const subject = encodeURIComponent(`Buying: ${it.title} (${it.id})`);
  const body = encodeURIComponent(
`Hi Sophia, I'd like to reserve/buy:

- Item: ${it.title}
- ID: ${it.id}
- Price: ${money(it.price, it.currency || "CAD")}

Reservation: I can e-transfer 50% now to ${CONTACT_EMAIL}.
Pickup / meet-up details:
- When: (date/time)
- Where (Montreal area): (neighbourhood / hotel / address)
Notes: (any questions)

Thanks!`
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function showModal() {
  els.modalBackdrop.hidden = false;
  if (typeof els.modal.showModal === "function") {
    els.modal.showModal();
  } else {
    els.modal.setAttribute("open", "true");
  }
}

function hideModal() {
  els.modalBackdrop.hidden = true;
  if (typeof els.modal.close === "function") {
    els.modal.close();
  } else {
    els.modal.removeAttribute("open");
  }
}

async function init() {
  // Contact email — single source of truth (CONTACT_EMAIL above).
  els.contactEmail.textContent = CONTACT_EMAIL;
  els.contactEmail.href = `mailto:${CONTACT_EMAIL}`;

  // Load items
  let items = [];
  try {
    const res = await fetch("items.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
  } catch (err) {
    console.error("Failed to load items.json:", err);
    els.status.textContent = "Could not load items. If you're opening the file directly, please run a local server (see README).";
    return;
  }

  state.items = items;
  state.categories = new Set(items.map(i => i.category).filter(Boolean));

  // Fill category dropdown
  for (const c of [...state.categories].sort()) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    els.category.appendChild(opt);
  }

  // Events
  els.q.addEventListener("input", (e) => { state.q = e.target.value; applyFilters(); });
  els.category.addEventListener("change", (e) => { state.category = e.target.value; applyFilters(); });
  els.statusFilter.addEventListener("change", (e) => { state.statusFilter = e.target.value; applyFilters(); });
  els.sort.addEventListener("change", (e) => { state.sort = e.target.value; applyFilters(); });

  els.closeModal.addEventListener("click", hideModal);
  els.modalBackdrop.addEventListener("click", hideModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
  });

  applyFilters();
}

init().catch(err => {
  console.error(err);
  els.status.textContent = "Failed to load items. Check console for details.";
});
