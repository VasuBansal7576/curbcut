async function finderEnabledFor(tab) {
  const state = await chrome.storage.local.get(["finderEnabled", "enabled", "pausedPages"]);
  if (state.enabled === false || CurbCutExt.isPagePaused(tab.url, state)) return false;
  return state.finderEnabled === true;
}

async function openFinder(tabId) {
  const tab = tabId == null
    ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
    : await chrome.tabs.get(tabId);
  if (!tab?.id) return { ok: false, reason: "no-tab" };
  await ensureTab(tab);
  if (!publicInstantUrl(tab.url) || !await finderEnabledFor(tab)) return { ok: false, reason: "disabled" };
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: "FINDER_OPEN" }) || { ok: false };
  } catch {
    return { ok: false, reason: "no-content-script" };
  }
}

async function runFinder(sender, query, candidates) {
  const { tab, frameId } = sender;
  if (!tab?.id || frameId !== 0) return { ok: false };
  if (!publicInstantUrl(tab.url) || !await finderEnabledFor(tab)) return { ok: false, reason: "disabled" };
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 160) return { ok: false, reason: "invalid-query" };
  if (!Array.isArray(candidates) || !candidates.length || candidates.length > 24) return { ok: false, reason: "invalid-candidates" };
  const cleaned = candidates.map((item, index) => ({
    id: typeof item.id === "string" ? item.id.slice(0, 8) : "l" + index,
    text: String(item.text || "").slice(0, 140),
    href: String(item.href || "").slice(0, 300)
  })).filter(item => item.text && item.href);
  if (!cleaned.length) return { ok: false, reason: "invalid-candidates" };
  try {
    const key = await CurbCutJevConfig.get();
    const page = new URL(tab.url);
    const result = key
      ? await CurbCutDecisions.askFinder(key, query.trim(), cleaned)
      : await instantPost("/finder", { url: page.origin + page.pathname, query: query.trim(), candidates: cleaned });
    return { ok: true, ...result };
  } catch {
    return { ok: false, reason: "capture-unavailable" };
  }
}
