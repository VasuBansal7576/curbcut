const namingJobs = new Map();

async function namingEnabledFor(url) {
  const state = await chrome.storage.local.get(["liveNamesEnabled", "enabled", "pausedPages"]);
  return state.liveNamesEnabled === true && state.enabled !== false && !CurbCutExt.isPagePaused(url, state);
}

function nameVisibleTab({ tab, frameId, documentId }, token) {
  if (!tab?.id || frameId !== 0 || !documentId || namingJobs.has(tab.id)) return Promise.resolve({ ok: false });
  const send = message => chrome.tabs.sendMessage(tab.id, { ...message, token }, { documentId });
  const job = (async () => {
    try {
      if (!publicInstantUrl(tab.url) || !await namingEnabledFor(tab.url)) return { ok: false };
      const active = () => chrome.tabs.query({ active: true, windowId: tab.windowId }).then(([current]) =>
        current?.id === tab.id && current.url === tab.url);
      const revision = activations.get(tab.windowId);
      if (!await active()) return { ok: false };
      const captured = await send({ type: "LIVE_NAMES_CAPTURE" });
      if (!captured?.targets?.length) return { ok: false };
      const data = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      if (!await active() || revision !== activations.get(tab.windowId) ||
          !await namingEnabledFor(tab.url) || !(await send({ type: "LIVE_NAMES_CONFIRM" }))?.ok) return { ok: false };
      const pairs = await CurbCutDecisions.cropNames(await (await fetch(data)).blob(), captured.targets, captured.viewport);
      const key = await CurbCutJevConfig.get();
      const page = new URL(tab.url);
      const url = page.origin + page.pathname;
      const language = captured.language || (key
        ? await CurbCutDecisions.chooseLanguage(key, captured.sample)
        : await instantPost("/language", { url, sample: captured.sample })).tag;
      const results = await CurbCutDecisions.namePage(key, pairs, language, (batch, language) =>
        key ? CurbCutDecisions.chooseNames(key, batch, language) : instantPost("/name", { url, pairs: batch, language }));
      if (!await namingEnabledFor(tab.url) || !await active()) return { ok: false };
      return await send({ type: "LIVE_NAMES_APPLY", results });
    } catch {
      return { ok: false, reason: "capture-unavailable" };
    }
  })().finally(() => namingJobs.delete(tab.id));
  namingJobs.set(tab.id, job);
  return job;
}
