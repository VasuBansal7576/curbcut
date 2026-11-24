const stateJobs = new Map();

async function visualStateEnabledFor(sender) {
  const { tab } = sender;
  const state = await chrome.storage.local.get(["visualStateEnabled", "enabled", "pausedPages"]);
  if (state.enabled === false || CurbCutExt.isPagePaused(tab.url, state)) return false;
  return state.visualStateEnabled === true;
}

function syncVisibleState(sender, token) {
  const { tab, frameId, documentId } = sender;
  if (!tab?.id || frameId !== 0 || !documentId || stateJobs.has(tab.id)) return Promise.resolve({ ok: false });
  const send = message => chrome.tabs.sendMessage(tab.id, { ...message, token }, { documentId });
  const job = (async () => {
    try {
      if (!publicInstantUrl(tab.url) || !await visualStateEnabledFor(sender)) return { ok: false };
      const active = () => chrome.tabs.query({ active: true, windowId: tab.windowId }).then(([current]) =>
        current?.id === tab.id && current.url === tab.url);
      const revision = activations.get(tab.windowId);
      if (!await active()) return { ok: false };
      const captured = await send({ type: "VISUAL_STATE_CAPTURE" });
      if (!captured?.targets?.length) return { ok: false };
      const data = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      if (!await active() || revision !== activations.get(tab.windowId) ||
          !await visualStateEnabledFor(sender)) return { ok: false };
      const confirmed = await send({ type: "VISUAL_STATE_CONFIRM" });
      const indices = captured.targets.map((_, index) => index).filter(index => confirmed?.indices?.includes(index));
      if (!indices.length) return { ok: false };
      const targets = indices.map(index => captured.targets[index]);
      const pairs = await CurbCutDecisions.cropRegions(await (await fetch(data)).blob(), targets, captured.viewport);
      const permitted = async () => await active() && revision === activations.get(tab.windowId) &&
        await visualStateEnabledFor(sender) && (await send({ type: "VISUAL_STATE_PERMITTED" }))?.ok;
      if (!await permitted()) return { ok: false };
      const key = await CurbCutJevConfig.get();
      const page = new URL(tab.url);
      const url = page.origin + page.pathname;
      const decisions = await CurbCutDecisions.visualStatePage(key, pairs, (batch) =>
        key ? CurbCutDecisions.askVisualState(key, batch)
          : instantPost("/state", { url, pairs: batch }));
      if (!await permitted()) return { ok: false };
      const results = Array(captured.targets.length).fill(null);
      for (const [offset, index] of indices.entries()) results[index] = decisions[offset];
      return await send({ type: "VISUAL_STATE_APPLY", results });
    } catch {
      return { ok: false, reason: "capture-unavailable" };
    }
  })().finally(() => stateJobs.delete(tab.id));
  stateJobs.set(tab.id, job);
  return job;
}
