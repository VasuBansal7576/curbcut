(() => {
  const Ext = globalThis.CurbCutExt;
  const cleanups = [];
  const observedRules = new Map();
  let readerCleanup = null;
  let pendingApply = Promise.resolve();
  let preparedCapture = null;
  let lastActive = [];

  function clearApplied() {
    while (cleanups.length) {
      const cleanup = cleanups.pop();
      try {
        if (typeof cleanup === "function") cleanup();
      } catch {
        continue;
      }
    }
    lastActive = [];
    observedRules.clear();
  }

  function clearReader() {
    if (typeof readerCleanup === "function") {
      try {
        readerCleanup();
      } catch {
        readerCleanup = null;
      }
    }
    readerCleanup = null;
  }

  async function readState() {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (!response || !response.ok) return { ...Ext.DEFAULT_STATE };
    return response.state;
  }

  function applyList(patches) {
    clearApplied();
    if (!globalThis.CurbCut || typeof globalThis.CurbCut.apply !== "function") {
      lastActive = [];
      return lastActive;
    }
    for (const entry of patches) {
      const enginePatch = Ext.toEnginePatch(entry);
      if (!enginePatch) continue;
      try {
        const matched = new Set();
        const cleanup = globalThis.CurbCut.apply(enginePatch, (index) => matched.add(index));
        if (typeof cleanup === "function") cleanups.push(cleanup);
        observedRules.set(enginePatch.id, matched);
        lastActive.push({
          ...enginePatch,
          unverified: Boolean(entry.unverified),
          label: entry.label || enginePatch.id,
        });
      } catch {
        continue;
      }
    }
    return lastActive;
  }

  function syncReader(enabled) {
    if (!enabled) {
      clearReader();
      return;
    }
    if (readerCleanup) return;
    if (!globalThis.CurbCut || typeof globalThis.CurbCut.reader !== "function") {
      return;
    }
    try {
      readerCleanup = globalThis.CurbCut.reader();
    } catch {
      readerCleanup = null;
    }
  }

  function reapply() {
    pendingApply = pendingApply.catch(() => {}).then(async () => {
      const state = await readState();
      applyList(Ext.selectActivePatches(location.href, state));
      syncReader(Boolean(state.enabled && state.readerEnabled));
      return lastActive;
    });
    return pendingApply;
  }

  function captureSnapshot() {
    const gate = Ext.canCapturePage(location.href, document);
    if (!gate.ok) {
      return { ok: false, reason: gate.reason };
    }
    if (!globalThis.CurbCut || typeof globalThis.CurbCut.snapshot !== "function") {
      return { ok: false, reason: "runtime-missing" };
    }
    try {
      const snapshot = globalThis.CurbCut.snapshot();
      if (!snapshot || typeof snapshot !== "object") {
        return { ok: false, reason: "invalid-snapshot" };
      }
      return {
        ok: true,
        url: location.href,
        snapshot,
        title: document.title || "",
      };
    } catch {
      return { ok: false, reason: "snapshot-failed" };
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type?.startsWith("INSTANT_")) return false;
    if (!message || typeof message !== "object") {
      sendResponse({ ok: false, reason: "invalid-message" });
      return false;
    }

    if (message.type === "STATE_UPDATED") {
      reapply().then((active) => {
        sendResponse({ ok: true, active });
      });
      return true;
    }

    if (message.type === "GET_ACTIVE") {
      const active = message.includeMatches ? lastActive.map((patch) => ({
        ...patch,
        matchedRules: [...observedRules.get(patch.id)],
        selectorMatches: globalThis.CurbCut.inspectRuleSelectors(patch.rules),
      })) : lastActive;
      sendResponse({
        ok: true,
        url: location.href,
        isFixture: Ext.isFixtureShopUrl(location.href),
        active,
        sensitive: !Ext.canCapturePage(location.href, document).ok,
      });
      return false;
    }

    if (message.type === "CAPTURE_SNAPSHOT") {
      const captured = preparedCapture?.url === location.href && Ext.canCapturePage(location.href, document).ok ? preparedCapture : captureSnapshot();
      preparedCapture = null;
      sendResponse(captured);
      return false;
    }

    if (message.type === "PREPARE_STUCK") {
      preparedCapture = captureSnapshot();
      sendResponse({ ok: preparedCapture.ok, prepared: preparedCapture.ok });
      return false;
    }

    if (message.type === "REAPPLY") {
      reapply().then((active) => sendResponse({ ok: true, active }));
      return true;
    }

    sendResponse({ ok: false, reason: "unknown-type" });
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (
      changes.enabled ||
      changes.readerEnabled ||
      changes.fixturePreview ||
      changes.patches ||
      changes.demoPatches
    ) {
      reapply();
    }
  });

  globalThis.navigation?.addEventListener("currententrychange", () => reapply());
  document.addEventListener("keydown", (event) => {
    if (!event.isTrusted || event.repeat || event.altKey || event.metaKey || !event.ctrlKey || !event.shiftKey || event.code !== "KeyU") return;
    event.preventDefault();
    chrome.runtime.sendMessage({ type: "OPEN_STUCK" }).catch(() => {});
  }, true);
  reapply();
})();
