// ============================================================
// renderer.js — builds adframe.html URLs for each product/size
// ============================================================

// Base URL for adframe.html — relative so it works on any host
const ADFRAME_BASE = "./adframe.html";

/**
 * Build an adframe URL for a given product, size and variation.
 *
 * @param {object} variation — from CCRV variations[]
 * @param {string} product   — e.g. "VdxDesktopInframe"
 * @param {string} size      — e.g. "300x250"
 * @returns {string} full URL to adframe.html with params
 */
export function buildAdframeUrl(variation, product, size) {
  const params = new URLSearchParams({
    mediaDataID:          variation.mediaDataId,
    ccRevision:           variation.ccRevision,
    ccRevisionVariation:  variation.ccRevisionVariation,
    product,
    size,
    frameworkVersion:     variation.frameworkTemplateVersion || "3.15.0",
    clientID:             "293233"
  });
  return `${ADFRAME_BASE}?${params.toString()}`;
}

/**
 * Returns true if a product/size combo can be rendered via adframe.
 * Products with 1x10 sizes or unsupported types return false.
 *
 * @param {string} product
 * @param {string} size
 * @returns {boolean}
 */
export function isRenderable(product, size) {
  if (size === "1x10") return false;
  // OTT not currently supported
  if (/ott/i.test(product)) return false;
  return true;
}

/**
 * Map product name → human-readable label.
 * @param {string} product
 * @returns {string}
 */
export function productLabel(product) {
  const map = {
    VdxDesktopInframe:    "Desktop Inframe",
    VdxDesktopExpandable: "Desktop Expandable",
    VdxDesktopInstream:   "Desktop Instream",
    VdxDesktopInread:     "Desktop Inread",
    VdxMobileInframe:     "Mobile Inframe",
    VdxMobileExpandable:  "Mobile Expandable",
    VdxMobileInstream:    "Mobile Instream",
    VdxMobileInread:      "Mobile Inread",
    OTT:                  "OTT"
  };
  return map[product] || product;
}
