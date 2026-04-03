// ============================================================
// ccrv.js — URL parsing + CCRV API
// ============================================================

const CCRV_API_BASE = "https://showcase.vdx.tv/api/cs/ccrv";

/**
 * Parse a showcase URL into its components.
 * Supports:
 *   Generic:  showcase.vdx.tv/{campaign}/#hash
 *   CCRV:     showcase.vdx.tv/cc/{revision}/{variation}/#hash
 *
 * @param {string} url
 * @returns {{ type, hash, fullHash, revision?, variation? } | null}
 */
export function parseShowcaseUrl(url) {
  if (!url) return null;

  // CCRV format: /cc/{revision}/{variation}/#hash
  const ccrvMatch = url.match(/showcase\.vdx\.tv\/cc\/([^/]+)\/(\d+)\/#([^\s?&]+)/);
  if (ccrvMatch) {
    return {
      type:      "ccrv",
      revision:  ccrvMatch[1],
      variation: ccrvMatch[2],
      hash:      ccrvMatch[3].substring(0, 6),
      fullHash:  ccrvMatch[3]
    };
  }

  // Generic format: /{campaign}/#hash
  const genericMatch = url.match(/showcase\.vdx\.tv\/(?!cc\/)([^/#]+)\/#([^\s?&]+)/);
  if (genericMatch) {
    return {
      type:     "generic",
      campaign: genericMatch[1],
      hash:     genericMatch[2].substring(0, 6),
      fullHash: genericMatch[2]
    };
  }

  return null;
}

/**
 * Fetch CCRV data from the showcase API.
 * @param {object} parsed — result of parseShowcaseUrl
 * @returns {Promise<object>} — full CCRV response
 */


export async function fetchCCRV(parsed) {
  let url = `https://showcase.vdx.tv/api/cs/ccrv?hash=${encodeURIComponent(parsed.fullHash)}`;
  if (parsed.type === "ccrv") {
    url += `&revision=${encodeURIComponent(parsed.revision)}`;
    url += `&variation=${encodeURIComponent(parsed.variation)}`;
  }

  const EXT_ID = "bommcjmbdogmhleeiijochpjojhamold"; // paste from chrome://extensions

  function tryMessage() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(EXT_ID, { type: "FETCH_CCRV", url }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.success) {
          reject(new Error(response?.error || "FETCH_CCRV failed"));
          return;
        }
        resolve(response.data);
      });
    });
  }

  // First attempt — may wake the service worker
  try {
    return await tryMessage();
  } catch (e) {
    if (!e.message.includes("Receiving end does not exist")) throw e;
    // SW was sleeping — wait 500ms and retry once
    await new Promise(r => setTimeout(r, 500));
    return await tryMessage();
  }
}

/**
 * Normalise CCRV adSizes into a flat list of { size, product } entries.
 * Filters out 1x10 (video-only) sizes.
 *
 * @param {object} ccrvData
 * @returns {Array<{ size, product }>}
 */
export function flattenAdSizes(ccrvData) {
  const result = [];
  for (const entry of (ccrvData.adSizes || [])) {
    for (const size of (entry.adSizes || [])) {
      if (size === "1x10") continue; // skip video-only placeholder
      result.push({ size, product: entry.product });
    }
  }
  return result;
}

/**
 * Parse a platform from a VDX product name.
 * @param {string} product
 * @returns {"Desktop" | "Mobile" | "OTT"}
 */
export function parsePlatform(product) {
  if (/mobile/i.test(product)) return "Mobile";
  if (/ott/i.test(product))    return "OTT";
  return "Desktop";
}

/**
 * Parse a format from a VDX product name.
 * @param {string} product
 * @returns {string}
 */
export function parseFormat(product) {
  if (/inframe/i.test(product))       return "Inframe";
  if (/expandable/i.test(product))    return "Expandable";
  if (/instream/i.test(product))      return "Instream";
  if (/inread/i.test(product))        return "Inread";
  if (/interstitial/i.test(product))  return "Interstitial";
  if (/ott/i.test(product))           return "OTT";
  return "";
}
