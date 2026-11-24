const namingJobs = new Map();

async function namingEnabledFor(sender, once) {
  const { tab, documentId } = sender;
  const state = await chrome.storage.local.get(["liveNamesEnabled", "stuckEnabled", "enabled", "pausedPages"]);
  if (state.enabled === false || CurbCutExt.isPagePaused(tab.url, state)) return false;
  if (!once) return state.liveNamesEnabled === true;
  const offer = stuckOffers.get(tab.id);
  return state.stuckEnabled === true && offer?.used === true && !offer.known &&
    offer.documentId === documentId && offer.url === tab.url && Date.now() - offer.at < 120000;
}

function nameVisibleTab(sender, token, once) {
  const { tab, frameId, documentId } = sender;
  if (!tab?.id || frameId !== 0 || !documentId || namingJobs.has(tab.id)) return Promise.resolve({ ok: false });
  const send = message => chrome.tabs.sendMessage(tab.id, { ...message, token }, { documentId });
  const job = (async () => {
    try {
      if (!publicInstantUrl(tab.url) || !await namingEnabledFor(sender, once)) return { ok: false };
      const active = () => chrome.tabs.query({ active: true, windowId: tab.windowId }).then(([current]) =>
        current?.id === tab.id && current.url === tab.url);
      const revision = activations.get(tab.windowId);
      if (!await active()) return { ok: false };
      const captured = await send({ type: "LIVE_NAMES_CAPTURE" });
      if (!captured?.targets?.length) return { ok: false };
      const data = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      if (!await active() || revision !== activations.get(tab.windowId) ||
          !await namingEnabledFor(sender, once)) return { ok: false };
      const confirmed = await send({ type: "LIVE_NAMES_CONFIRM" });
      const indices = captured.targets.map((_, index) => index).filter(index => confirmed?.indices?.includes(index));
      if (!indices.length) return { ok: false };
      const targets = indices.map(index => captured.targets[index]);
      const pairs = await CurbCutDecisions.cropNames(await (await fetch(data)).blob(), targets, captured.viewport);
      const permitted = async () => await active() && revision === activations.get(tab.windowId) &&
        await namingEnabledFor(sender, once) && (await send({ type: "LIVE_NAMES_PERMITTED" }))?.ok;
      if (!await permitted()) return { ok: false };
      const key = await CurbCutJevConfig.get();
      const page = new URL(tab.url);
      const url = page.origin + page.pathname;
      const language = captured.language || (key
        ? await CurbCutDecisions.chooseLanguage(key, captured.sample)
        : await instantPost("/language", { url, sample: captured.sample })).tag;
      if (!await permitted()) return { ok: false };
      const decisions = await CurbCutDecisions.namePage(key, pairs, language, (batch, language) =>
        key ? CurbCutDecisions.chooseNames(key, batch, language, { live: true })
          : instantPost("/name", { url, pairs: batch, language }));
      if (!await permitted()) return { ok: false };
      const results = Array(captured.targets.length).fill(null);
      for (const [offset, index] of indices.entries()) {
        const decision = decisions[offset];
        if (decision) results[index] = { ...decision, name: CurbCutDecisions.acceptLiveName(targets[offset], language, decision) };
      }
      return await send({ type: "LIVE_NAMES_APPLY", results });
    } catch {
      return { ok: false, reason: "capture-unavailable" };
    }
  })().finally(() => namingJobs.delete(tab.id));
  namingJobs.set(tab.id, job);
  return job;
}
