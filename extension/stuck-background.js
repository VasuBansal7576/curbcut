const stuckOffers = new Map();
const stuckProbedAt = new Map();

async function stuckAllowed({ tab, frameId, documentId }) {
  if (!tab?.id || !tab.active || frameId !== 0 || !documentId || !publicInstantUrl(tab.url)) return null;
  const current = await chrome.tabs.get(tab.id);
  if (!current.active || current.url !== tab.url) return null;
  const state = await getState();
  if (state.stuckEnabled !== true || state.enabled === false || CurbCutExt.isPagePaused(tab.url, state)) return null;
  return state;
}

async function evaluateStuck(sender, trace) {
  const state = await stuckAllowed(sender);
  if (!state) return { offer: false };
  const { tab, documentId } = sender;
  if (Date.now() - (stuckProbedAt.get(tab.id) ?? 0) < 10000) return { offer: false };
  stuckProbedAt.set(tab.id, Date.now());
  const cleaned = CurbCutStuck.cleanTrace(trace);
  if (cleaned.length < 6) return { offer: false };
  const key = await CurbCutJevConfig.get();
  const result = key ? await CurbCutStuck.chooseStuck(key, cleaned) : await instantPost("/stuck", { trace: cleaned });
  if (!(result.p >= CurbCutStuck.stuckThreshold) || !await stuckAllowed(sender)) return { offer: false };
  if (Date.now() - (stuckOffers.get(tab.id)?.at ?? 0) < 120000) return { offer: false };
  const known = CurbCutExt.selectActivePatches(tab.url, state).some(patch => !patch.unverified);
  stuckOffers.set(tab.id, { documentId, url: tab.url, at: Date.now(), known, used: false });
  return { offer: true, known };
}

async function acceptStuck(sender) {
  const state = await stuckAllowed(sender);
  if (!state) return { ok: false };
  const { tab, documentId } = sender;
  const offered = stuckOffers.get(tab.id);
  if (!offered || offered.used || offered.documentId !== documentId || offered.url !== tab.url ||
      Date.now() - offered.at >= 120000) return { ok: false };
  offered.used = true;
  if (offered.known) {
    await chrome.tabs.sendMessage(tab.id, { type: "REAPPLY" }, { documentId });
    const applied = await chrome.tabs.sendMessage(tab.id, { type: "GET_ACTIVE", includeMatches: true }, { documentId });
    return { ok: applied?.active?.some(patch => !patch.unverified && patch.matchedRules.length === patch.rules.length) === true };
  }
  return chrome.tabs.sendMessage(tab.id, { type: "LIVE_NAMES_ONCE" }, { documentId });
}

chrome.tabs.onRemoved.addListener(tabId => {
  stuckOffers.delete(tabId);
  stuckProbedAt.delete(tabId);
});
