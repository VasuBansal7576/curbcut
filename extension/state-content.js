(() => {
  if (globalThis.__curbcutStateSync) return;
  globalThis.__curbcutStateSync = true;
  const keys = ["visualStateEnabled", "enabled", "pausedPages", "readerEnabled"];
  const settings = {};
  const applied = new Map();
  let attempted = new WeakSet();
  let page = location.href;
  let pending, timer;
  let rescan = false;
  let expires = 0;

  function pageEnabled() {
    return settings.enabled !== false && !CurbCutExt.isPagePaused(location.href, settings) &&
      location.protocol === "https:";
  }

  function enabled() {
    return pageEnabled() && settings.visualStateEnabled === true;
  }

  function permitted() {
    return enabled() && !document.hidden && !document.querySelector("[data-curbcut-reader][open]") &&
      CurbCutExt.canCapturePage(location.href, document).ok && CurbCut.instantPrivacy();
  }

  function clear() {
    clearTimeout(timer);
    timer = undefined;
    pending = null;
    rescan = false;
    attempted = new WeakSet();
    for (const { cleanup } of applied.values()) cleanup();
    applied.clear();
  }

  function schedule() {
    if (page !== location.href) {
      clear();
      page = location.href;
    }
    if (!enabled() || document.hidden) return;
    if (pending) {
      rescan = true;
      return;
    }
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void request();
    }, Math.max(500, expires - Date.now()));
  }

  async function request() {
    if (page !== location.href) {
      clear();
      page = location.href;
    }
    if (!permitted() || pending) return { ok: false };
    expires = Date.now() + 1600;
    const state = CurbCut.collectVisualState();
    const targets = state.targets.flatMap(target => {
      const node = document.querySelector(target.selector);
      return node && !attempted.has(node) ? [{ target, node }] : [];
    });
    if (!targets.length) return { ok: false };
    const token = crypto.randomUUID();
    pending = { token, targets, url: location.href, state };
    rescan = false;
    try {
      return await chrome.runtime.sendMessage({ type: "VISUAL_STATE_REQUEST", token });
    } catch {
      return { ok: false };
    } finally {
      if (pending?.token === token) {
        pending = null;
        if (rescan) schedule();
      }
    }
  }

  function currentTargets() {
    return new Map(CurbCut.collectVisualState().targets.map(target => [target.selector, target]));
  }

  function sameTarget(original, current) {
    return current && original.role === current.role && original.current === current.current &&
      JSON.stringify(original.dom) === JSON.stringify(current.dom);
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "VISUAL_STATE_STATUS") {
      reply({ states: [...applied].flatMap(([node, value]) =>
        node.isConnected ? [{ selector: value.selector, changes: value.changes, confidence: value.confidence }] : []) });
      return false;
    }
    if (message?.type === "VISUAL_STATE_UNDO") {
      clear();
      reply({ ok: true });
      return false;
    }
    if (!message?.type?.startsWith("VISUAL_STATE_")) return false;
    if (!pending || pending.token !== message.token || pending.url !== location.href || !permitted()) {
      reply({ ok: false });
      return false;
    }
    if (message.type === "VISUAL_STATE_PERMITTED") {
      reply({ ok: true });
    } else if (message.type === "VISUAL_STATE_CAPTURE") {
      const { viewport } = pending.state;
      const targets = pending.targets.map(({ target }) => target);
      reply({ viewport, targets });
    } else if (message.type === "VISUAL_STATE_CONFIRM") {
      const current = currentTargets();
      const indices = pending.targets.flatMap(({ target, node }, index) => {
        const refreshed = current.get(target.selector);
        const matches = document.querySelector(target.selector) === node && sameTarget(target, refreshed) &&
          target.box.every((value, axis) => Math.abs(value - refreshed.box[axis]) < 2);
        return matches ? [index] : [];
      });
      reply({ indices });
    } else if (message.type === "VISUAL_STATE_APPLY") {
      const current = currentTargets();
      if (!Array.isArray(message.results) || message.results.length !== pending.targets.length) {
        reply({ ok: false });
        return false;
      }
      for (const [index, { target, node }] of pending.targets.entries()) {
        const result = message.results[index];
        attempted.add(node);
        if (!result?.accepted || document.querySelector(target.selector) !== node ||
            !sameTarget(target, current.get(target.selector))) continue;
        const cleanup = CurbCut.applyVisualState(node, result.accepted);
        if (cleanup) applied.set(node, { selector: target.selector, changes: result.accepted.changes, cleanup });
      }
      reply({ ok: true, count: applied.size });
    }
    return false;
  });

  chrome.storage.local.get(keys).then(values => {
    Object.assign(settings, values);
    schedule();
  }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of keys) if (key in changes) settings[key] = changes[key].newValue;
    if (!enabled()) clear();
    else if (keys.some(key => key in changes)) schedule();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("popstate", schedule);
  globalThis.navigation?.addEventListener("currententrychange", schedule);
  document.addEventListener("visibilitychange", schedule);
  new MutationObserver(records => {
    if (page !== location.href || records.some(record => record.type === "childList")) {
      for (const node of applied.keys()) if (!node.isConnected) applied.delete(node);
      schedule();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
