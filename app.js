const state = {
  items: [],
  filtered: [],
  categories: new Set(),
  q: "",
  category: "all",
  sort: "newest",
  contactEmail: "sophiazilisha@email.com" // CHANGE THIS
};

const els = {
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  q: document.getElementById("q"),
  category: document.getElementById("category"),
  sort: document.getElementById("sort"),
  contactEmail: document.getElementById("contactEmail"),
  modal: document.getElementById("modal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModal: document.getElementById("closeModal"),
  modalImg: document.getElementById("modalImg"),
  thumbs: document.getElementById("thumbs"),
  modalTitle: document.getElementById("modalTitle"),
  modalPrice: document.getElementById("modalPrice"),
  modalBadge: document.getElementById("modalBadge"),
  modalDesc: document.getElementById("modalDesc"),
  modalCategory: document.getElementById("modalCategory"),
  modalCondition: document.getElementById("modalCondition"),
  buyBtn: document.getElementById("buyBtn"),
  messageBtn: document.getElementById("messageBtn")
};

function money(n, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function bySort(items) {
  // "newest" uses array order from items.json (top = newest)
  if (state.sort === "price-asc") return [...items].sort((a,b) => a.price - b.price);
  if (state.sort === "price-desc") return [...items].sort((a,b) => b.price - a.price);
  return items;
}

function applyFilters() {
  const q = normalize(state.q);
  const cat = state.category;

  let out = state.items.filter(it => {
    const hay = normalize([it.title, it.description, it.category, it.condition, it.id].join(" "));
    const okQ = q ? hay.includes(q) : true;
    const okC = (cat === "all") ? true : it.category === cat;
    return okQ && okC;
  });

  out = bySort(out);

  state.filtered = out;
  render();
}

function render() {
  const total = state.filtered.length;
  const all = state.items.length;

  els.status.textContent = total === all
    ? `${all} item(s)`
    : `${total} item(s) shown (filtered from ${all})`;

  els.grid.innerHTML = "";

  for (const it of state.filtered) {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${it.title}`);

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = it.photos?.[0] || "";
    img.alt = it.title;

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
    meta.textContent = `${it.category} • ${it.condition}`;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = it.status === "sold" ? "Sold" : "Available";

    body.appendChild(top);
    body.appendChild(meta);
    body.appendChild(badge);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("click", () => openModal(it));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openModal(it);
    });

    els.grid.appendChild(card);
  }
}

function openModal(it) {
  els.modalTitle.textContent = it.title;
  els.modalDesc.textContent = it.description || "";
  els.modalCategory.textContent = it.category || "";
  els.modalCondition.textContent = it.condition || "";
  els.modalPrice.textContent = money(it.price, it.currency || "CAD");
  els.modalBadge.textContent = it.status === "sold" ? "Sold" : "Available";

  // Photos
  const photos = it.photos || [];
  els.modalImg.src = photos[0] || "";
  els.modalImg.alt = it.title;
  els.thumbs.innerHTML = "";

  photos.forEach((p, idx) => {
    const t = document.createElement("img");
    t.src = p;
    t.alt = `${it.title} photo ${idx + 1}`;
    t.addEventListener("click", () => {
      els.modalImg.src = p;
    });
    els.thumbs.appendChild(t);
  });

  // Buy / message actions
  const isSold = it.status === "sold";
  els.buyBtn.textContent = isSold ? "Sold" : "Buy";
  els.buyBtn.setAttribute("aria-disabled", isSold ? "true" : "false");
  els.buyBtn.style.pointerEvents = isSold ? "none" : "auto";
  els.buyBtn.style.opacity = isSold ? "0.6" : "1";

  // PayPal link (preferred). If missing, fall back to mailto.
  const paypal = it.paypalUrl || "";
  els.buyBtn.href = paypal || buildMailto(it);

  els.messageBtn.href = buildMailto(it);

  showModal();
}

function buildMailto(it) {
  const subject = encodeURIComponent(`Buying: ${it.title} (${it.id})`);
  const body = encodeURIComponent(
`Hi Sophia, I’d like to reserve/buy:

- Item: ${it.title}
- ID: ${it.id}
- Price: ${money(it.price, it.currency || "CAD")}

Reservation: I can e-transfer 50% now to sophiazilisha@hotmail.com.
Pickup / meet-up details:
- When: (date/time)
- Where (Montreal area): (neighbourhood / hotel / address)
Notes: (any questions)

Thanks!`
);
  return `mailto:${state.contactEmail}?subject=${subject}&body=${body}`;
}

function showModal() {
  els.modalBackdrop.hidden = false;
  if (typeof els.modal.showModal === "function") {
    els.modal.showModal();
  } else {
    // fallback: if <dialog> not supported
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
  // Contact email
  els.contactEmail.textContent = state.contactEmail;
  els.contactEmail.href = `mailto:${state.contactEmail}`;

  // Load items
  const res = await fetch("items.json", { cache: "no-store" });
  const items = await res.json();

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
  els.q.addEventListener("input", (e) => {
    state.q = e.target.value;
    applyFilters();
  });
  els.category.addEventListener("change", (e) => {
    state.category = e.target.value;
    applyFilters();
  });
  els.sort.addEventListener("change", (e) => {
    state.sort = e.target.value;
    applyFilters();
  });

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
