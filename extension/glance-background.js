const glanceJobs = new Map();

async function glanceEnabledFor(tab) {
  const state = await chrome.storage.local.get(["glanceEnabled", "enabled", "pausedPages"]);
  if (state.enabled === false || CurbCutExt.isPagePaused(tab.url, state)) return false;
  return state.glanceEnabled === true;
}

async function runGlance(tabId) {
  const tab = tabId == null
    ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
    : await chrome.tabs.get(tabId);
  if (!tab?.id || glanceJobs.has(tab.id)) return { ok: false, reason: "unavailable" };
  await ensureTab(tab);
  const token = crypto.randomUUID();
  const send = message => chrome.tabs.sendMessage(tab.id, { ...message, token });
  const job = (async () => {
    try {
      if (!publicInstantUrl(tab.url) || !await glanceEnabledFor(tab)) return { ok: false, reason: "disabled" };
      const prepared = await send({ type: "GLANCE_PREPARE" });
      if (!prepared?.ok) return { ok: false, reason: prepared?.reason || "blocked" };
      const active = () => chrome.tabs.query({ active: true, windowId: tab.windowId }).then(([current]) =>
        current?.id === tab.id && current.url === tab.url);
      const revision = activations.get(tab.windowId);
      const data = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 });
      if (!await active() || revision !== activations.get(tab.windowId) || !await glanceEnabledFor(tab) ||
          !(await send({ type: "GLANCE_PERMITTED" }))?.ok) return { ok: false, reason: "stale" };
      const key = await CurbCutJevConfig.get();
      const page = new URL(tab.url);
      const result = key
        ? await CurbCutDecisions.askGlance(key, data)
        : await instantPost("/glance", { url: page.origin + page.pathname, screenshot: data });
      if (!await active() || !(await send({ type: "GLANCE_PERMITTED" }))?.ok) return { ok: false, reason: "stale" };
      await send({ type: "GLANCE_RESULT", items: result.items });
      return { ok: true, items: result.items, providerMs: result.providerMs };
    } catch {
      try { await send({ type: "GLANCE_FAIL" }); } catch {}
      return { ok: false, reason: "capture-unavailable" };
    }
  })().finally(() => glanceJobs.delete(tab.id));
  glanceJobs.set(tab.id, job);
  return job;
}
