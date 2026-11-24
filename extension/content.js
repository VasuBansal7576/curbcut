(() => {
  if (globalThis.__curbcutMain) return;
  globalThis.__curbcutMain = true;
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
      if (entry.status === "retired") continue;
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
      syncReader(Boolean(state.enabled && state.readerEnabled && !Ext.isPagePaused(location.href, state)));
      return lastActive;
    });
    return pendingApply;
  }

  function focusedBarrier(node) {
    if (!node || node === document.body || node === document.documentElement) return null;
    const explicit = node.getAttribute("role");
    const native = node.matches("a[href]")
      ? "link"
      : node.matches("button,summary,[type=button]")
        ? "button"
        : node.localName;
    const labelled = node.getAttribute("aria-label") || "";
    const name = (
      labelled ||
      (node.matches("input,textarea,select")
        ? node.getAttribute("placeholder") || node.getAttribute("name") || ""
        : node.innerText || node.getAttribute("title") || "")
    )
      .trim()
      .slice(0, 120);
    const selector =
      globalThis.CurbCut && typeof globalThis.CurbCut.exactSelector === "function"
        ? globalThis.CurbCut.exactSelector(node)
        : node.id
          ? "#" + CSS.escape(node.id)
          : node.localName;
    return { role: explicit || native, name, selector };
  }

  function captureBarrier() {
    const gate = Ext.canCapturePage(location.href, document);
    if (!gate.ok) return { ok: false, reason: gate.reason };
    if (globalThis.CurbCut && typeof globalThis.CurbCut.instantPrivacy === "function" && !globalThis.CurbCut.instantPrivacy()) {
      return { ok: false, reason: "sensitive-document" };
    }
    return {
      ok: true,
      report: {
        url: location.href,
        title: document.title || "",
        focus: focusedBarrier(document.activeElement),
        keys: Array.isArray(globalThis.__curbcutRecentKeys) ? globalThis.__curbcutRecentKeys.slice(-16) : [],
      },
    };
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
    if (
      message?.type?.startsWith("INSTANT_") ||
      message?.type?.startsWith("LIVE_NAMES_") ||
      message?.type?.startsWith("VISUAL_STATE_") ||
      message?.type?.startsWith("GLANCE_") ||
      message?.type?.startsWith("FINDER_")
    ) return false;
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

    if (message.type === "PING") {
      sendResponse({ ok: true, url: location.href });
      return false;
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
        instantPatch: globalThis.__curbcutInstantPatch || null,
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

    if (message.type === "CAPTURE_BARRIER") {
      sendResponse(captureBarrier());
      return false;
    }

    if (message.type === "PREPARE_STUCK") {
      preparedCapture = captureSnapshot();
      const barrier = captureBarrier();
      sendResponse({
        ok: barrier.ok,
        prepared: preparedCapture.ok,
        report: barrier.ok ? barrier.report : null,
        reason: barrier.ok ? undefined : barrier.reason,
      });
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
      changes.pausedPages ||
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
