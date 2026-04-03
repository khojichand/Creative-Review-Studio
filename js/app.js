// ============================================================
// app.js — Creative Review Studio core logic
// ============================================================

import {
  parseShowcaseUrl,
  fetchCCRV,
  flattenAdSizes,
  parsePlatform,
  parseFormat
} from "./ccrv.js";

import {
  buildAdframeUrl,
  isRenderable,
  productLabel
} from "./renderer.js";

// ============================
// STATE
// ============================
let state = {
  ccrvData:        null,       // raw CCRV API response
  variation:       null,       // selected variation object
  variationIndex:  0,
  adSizes:         [],         // flat [{ size, product }]
  platformFilter:  "all",      // "all" | "desktop" | "mobile"
  zoomLevel:       50,         // %
  compareSet:      [],         // array of "size_product" keys
  compareMode:     false,
  selectedCard:    null,       // { size, product } for QA panel
  parsedUrl:       null,
};

// ============================
// DOM REFS
// ============================
const $url       = document.getElementById("url-input");
const $loadBtn   = document.getElementById("load-btn");
const $status    = document.getElementById("status-bar-text");
const $campaign  = document.getElementById("campaign-name");
const $varSelect = document.getElementById("variation-select");
const $varWrap   = document.getElementById("variation-wrap");
const $grid      = document.getElementById("grid");
const $compare   = document.getElementById("compare-view");
const $qaPanel   = document.getElementById("qa-panel");
const $zoomSlider = document.getElementById("zoom-slider");
const $zoomVal   = document.getElementById("zoom-value");
const $compareToggle = document.getElementById("compare-toggle");
const $compareCount  = document.getElementById("compare-count");


// ============================
// INIT
// ============================
export function init() {
  // Restore URL from query param (for extension deep-link)
  const params = new URLSearchParams(location.search);
  const deepLink = params.get("showcase");
  if (deepLink) {
    $url.value = deepLink;
    load(deepLink);
  }

  $loadBtn.addEventListener("click",  () => load($url.value.trim()));
  $url.addEventListener("keydown",    (e) => { if (e.key === "Enter") load($url.value.trim()); });
  $zoomSlider.addEventListener("input", onZoom);
  $compareToggle.addEventListener("click", toggleCompareMode);
  $varSelect.addEventListener("change", onVariationChange);

  document.querySelectorAll(".platform-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".platform-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.platformFilter = btn.dataset.platform;
      renderGrid();
    });
  });
}


// ============================
// LOAD
// ============================
async function load(url) {
  if (!url) return;

  setStatus("Parsing URL...");
  const parsed = parseShowcaseUrl(url);

  if (!parsed) {
    setStatus("❌ Unrecognised showcase URL. Paste a showcase.vdx.tv link.", "error");
    return;
  }

  state.parsedUrl = parsed;
  setStatus("Fetching creative data...");

  try {
    const data = await fetchCCRV(parsed);
    state.ccrvData = data;
    state.adSizes  = flattenAdSizes(data);

    // Build variation selector
    buildVariationSelector(data.variations || []);
    state.variationIndex = 0;
    state.variation = data.variations?.[0] || null;

    // Campaign name from bundleUrl or hash
    const campaignMatch = (data.bundleUrl || "").match(/opportunity\/info\/(\d+)/);
    $campaign.textContent = campaignMatch
      ? `Opportunity ${campaignMatch[1]} · ${data.hash}`
      : data.hash || "";

    setStatus(`✅ Loaded — ${state.adSizes.length} sizes across ${data.adSizes?.length || 0} products`);
    renderGrid();
  } catch (err) {
    setStatus(`❌ Failed to load: ${err.message}`, "error");
  }
}


// ============================
// VARIATION SELECTOR
// ============================
function buildVariationSelector(variations) {
  $varSelect.innerHTML = "";

  if (variations.length <= 1) {
    $varWrap.style.display = "none";
  } else {
    $varWrap.style.display = "flex";
    variations.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = v.label || `Revision ${v.ccRevision} · Var ${v.ccRevisionVariation}`;
      $varSelect.appendChild(opt);
    });
  }
}

function onVariationChange() {
  state.variationIndex = parseInt($varSelect.value);
  state.variation = state.ccrvData?.variations?.[state.variationIndex] || null;
  renderGrid();
}


// ============================
// RENDER GRID
// ============================
function renderGrid() {
  // Remove existing cards
  $grid.querySelectorAll(".ad-card").forEach(c => c.remove());

  const filtered = filteredSizes();

  if (filtered.length === 0) {
    $grid.querySelector("#empty-state").style.display = "flex";
    return;
  }
  $grid.querySelector("#empty-state").style.display = "none";

  filtered.forEach(({ size, product }) => {
    $grid.appendChild(buildCard(size, product));
  });

  updateCompareCount();
}

function filteredSizes() {
  return state.adSizes.filter(({ product }) => {
    if (state.platformFilter === "all") return true;
    return parsePlatform(product).toLowerCase() === state.platformFilter;
  });
}


// ============================
// BUILD CARD
// ============================
function buildCard(size, product) {
  const [w, h] = size.split("x").map(Number);
  const scale = state.zoomLevel / 100;
  const displayW = Math.round(w * scale);
  const displayH = Math.round(h * scale);

  const key = cardKey(size, product);
  const isSelected = state.compareSet.includes(key);
  const renderable = isRenderable(product, size) && !!state.variation;
  const platform = parsePlatform(product);
  const format = parseFormat(product);
  const label = productLabel(product);

  const card = document.createElement("div");
  card.className = "ad-card" + (isSelected ? " selected" : "");
  card.dataset.key = key;

  // Badge colour
  const badgeClass = platform === "Mobile"
    ? "badge-mobile"
    : /instream|inread|ott/i.test(format) ? "badge-video" : "badge-desktop";

  // Iframe or placeholder
  let bodyHtml;
  if (renderable) {
    const src = buildAdframeUrl(state.variation, product, size);
    bodyHtml = `
      <div class="card-iframe-wrap" style="width:${displayW}px;height:${displayH}px;overflow:hidden;">
        <iframe
          src="${src}"
          width="${w}"
          height="${h}"
          style="transform:scale(${scale});transform-origin:top left;border:none;"
          scrolling="no"
          loading="lazy"
        ></iframe>
      </div>`;
  } else {
    bodyHtml = `
      <div class="card-placeholder" style="width:${displayW}px;height:${displayH}px;">
        <span class="placeholder-icon">📺</span>
        <span class="placeholder-label">Video unit</span>
        <span class="placeholder-sub">${size}</span>
      </div>`;
  }

  card.innerHTML = `
    <div class="card-header">
      <span class="card-size">${size}</span>
      <span class="card-badge ${badgeClass}">${platform} ${format}</span>
      <span class="card-label">${label}</span>
      <div class="card-actions">
        <button class="card-btn qa-btn" data-key="${key}" data-size="${size}" data-product="${product}" title="Open QA panel">QA</button>
        <input type="checkbox" class="compare-cb" data-key="${key}" ${isSelected ? "checked" : ""} title="Add to compare" style="display:${state.compareMode ? "inline-block" : "none"}"/>
      </div>
    </div>
    <div class="card-body">
      ${bodyHtml}
    </div>
  `;

  card.querySelector(".qa-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openQAPanel(e.currentTarget.dataset.size, e.currentTarget.dataset.product);
  });

  card.querySelector(".compare-cb").addEventListener("change", (e) => {
    toggleCompare(key, e.target.checked);
  });

  return card;
}

function cardKey(size, product) {
  return `${size}__${product}`;
}


// ============================
// ZOOM
// ============================
function onZoom(e) {
  state.zoomLevel = parseInt(e.target.value);
  $zoomVal.textContent = `${state.zoomLevel}%`;
  renderGrid();
}


// ============================
// COMPARE MODE
// ============================
function toggleCompareMode() {
  state.compareMode = !state.compareMode;
  $compareToggle.classList.toggle("active", state.compareMode);
  $compareToggle.textContent = state.compareMode ? "Exit Compare" : "Compare Mode";

  if (state.compareMode) {
    $grid.style.display = "none";
    $compare.classList.add("visible");
    renderCompare();
  } else {
    $grid.style.display = "flex";
    $compare.classList.remove("visible");
  }

  document.querySelectorAll(".compare-cb").forEach(cb => {
    cb.style.display = state.compareMode ? "inline-block" : "none";
  });
}

function toggleCompare(key, checked) {
  if (checked) {
    if (state.compareSet.length >= 3) state.compareSet.shift();
    if (!state.compareSet.includes(key)) state.compareSet.push(key);
  } else {
    state.compareSet = state.compareSet.filter(k => k !== key);
  }

  document.querySelectorAll(".ad-card").forEach(el => {
    el.classList.toggle("selected", state.compareSet.includes(el.dataset.key));
  });
  document.querySelectorAll(".compare-cb").forEach(cb => {
    cb.checked = state.compareSet.includes(cb.dataset.key);
  });

  updateCompareCount();
  if (state.compareMode) renderCompare();
}

function updateCompareCount() {
  if (state.compareSet.length > 0) {
    $compareCount.style.display = "inline";
    $compareCount.textContent = `${state.compareSet.length}/3`;
  } else {
    $compareCount.style.display = "none";
  }
}

function renderCompare() {
  $compare.innerHTML = "";

  if (state.compareSet.length === 0) {
    $compare.innerHTML = `<div class="compare-empty">Select up to 3 sizes using checkboxes in the grid, then switch to Compare Mode.</div>`;
    return;
  }

  state.compareSet.forEach(key => {
    const [size, product] = key.split("__");
    const [w, h] = size.split("x").map(Number);
    const panelW = Math.floor((window.innerWidth - 80 - (state.compareSet.length - 1) * 16) / state.compareSet.length);
    const panelH = window.innerHeight - 180;
    const scale = Math.min(panelW / w, panelH / h, 1);
    const scaledW = Math.round(w * scale);
    const scaledH = Math.round(h * scale);

    const renderable = isRenderable(product, size) && !!state.variation;
    const src = renderable ? buildAdframeUrl(state.variation, product, size) : null;

    const panel = document.createElement("div");
    panel.className = "compare-panel";
    panel.innerHTML = `
      <div class="compare-header">
        <span>${size} · ${productLabel(product)}</span>
        <button class="remove-btn" data-key="${key}">✕</button>
      </div>
      <div class="compare-body">
        ${src
          ? `<div style="width:${scaledW}px;height:${scaledH}px;overflow:hidden;">
               <iframe src="${src}" width="${w}" height="${h}"
                 style="transform:scale(${scale});transform-origin:top left;border:none;"
                 scrolling="no"></iframe>
             </div>`
          : `<div class="compare-placeholder">Video unit — not renderable</div>`
        }
      </div>
    `;

    panel.querySelector(".remove-btn").addEventListener("click", (e) => {
      toggleCompare(e.currentTarget.dataset.key, false);
    });

    $compare.appendChild(panel);
  });
}


// ============================
// QA PANEL
// ============================
function openQAPanel(size, product) {
  state.selectedCard = { size, product };
  $qaPanel.classList.add("open");
  $qaPanel.innerHTML = `
    <div class="qa-header">
      <span>QA — ${size} · ${productLabel(product)}</span>
      <button id="qa-close">✕</button>
    </div>
    <div class="qa-body">
      <div class="qa-section">
        <h4>Tracking Pixels</h4>
        <p class="qa-hint">Load Expotask data to validate tracking pixels against fired events.</p>
        <div id="qa-expotask">
          <input id="qa-et-input" placeholder="Expotask Request ID or URL" />
          <button id="qa-et-fetch">Fetch</button>
          <div id="qa-et-status"></div>
          <div id="qa-et-results"></div>
        </div>
      </div>
      <div class="qa-section">
        <h4>Notes</h4>
        <textarea id="qa-notes" placeholder="Add QA notes for this size..."></textarea>
      </div>
      <div class="qa-section">
        <h4>Status</h4>
        <div class="qa-status-btns">
          <button class="status-btn pass" data-status="pass">✅ Pass</button>
          <button class="status-btn fail" data-status="fail">❌ Fail</button>
          <button class="status-btn review" data-status="review">⏳ In Review</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("qa-close").addEventListener("click", () => {
    $qaPanel.classList.remove("open");
  });

  // Expotask fetch placeholder — will connect to extension later
  document.getElementById("qa-et-fetch").addEventListener("click", () => {
    document.getElementById("qa-et-status").textContent = "⏳ Fetching... (extension connection coming soon)";
  });
}


// ============================
// HELPERS
// ============================
function setStatus(msg, type = "") {
  $status.textContent = msg;
  $status.className = "status-text" + (type ? ` status-${type}` : "");
}
