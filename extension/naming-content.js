(() => {
  const keys = ["liveNamesEnabled", "enabled", "pausedPages", "readerEnabled", "stuckEnabled"];
  const settings = {};
  const applied = new Map();
  let attempted = new WeakSet();
  let page = location.href;
  let pending, timer;
  let once = false;
  let authorizedPage;
  let expires = 0;

  function pageEnabled() {
    return settings.enabled !== false && !CurbCutExt.isPagePaused(location.href, settings) &&
      location.protocol === "https:";
  }

  function enabled() {
    return pageEnabled() && (settings.liveNamesEnabled === true || once && settings.stuckEnabled === true);
  }

  function permitted() {
    return enabled() && !document.hidden && !document.querySelector("[data-curbcut-reader][open]") &&
      CurbCutExt.canCapturePage(location.href, document).ok && CurbCut.instantPrivacy();
  }

  function clear() {
    pending = null;
    authorizedPage = undefined;
    attempted = new WeakSet();
    for (const { cleanup } of applied.values()) cleanup();
    applied.clear();
  }

  function schedule() {
    clearTimeout(timer);
    if (page !== location.href) {
      clear();
      page = location.href;
    }
    if (!enabled() || pending || document.hidden) return;
    timer = setTimeout(request, Math.max(400, expires - Date.now()));
  }

  async function request() {
    if (page !== location.href) {
      clear();
      page = location.href;
    }
    if (!permitted() || pending) return { ok: false };
    const state = CurbCut.collectNames();
    const targets = state.targets.flatMap(target => {
      const node = document.querySelector(target.selector);
      return node && !attempted.has(node) ? [{ target, node }] : [];
    });
    if (!targets.length) return { ok: false };
    const token = crypto.randomUUID();
    pending = { token, targets, url: location.href, state };
    expires = Date.now() + 1200;
    try {
      return await chrome.runtime.sendMessage({ type: "LIVE_NAMES_REQUEST", token, once });
    } catch {
      return { ok: false };
    } finally {
      if (pending?.token === token) pending = null;
    }
  }

  function currentTargets() {
    return new Map(CurbCut.collectNames().targets.map(target => [target.selector, target]));
  }

  function sameTarget(original, current) {
    return current && original.role === current.role && original.href === current.href &&
      original.source === current.source && original.iconId === current.iconId && original.iconTitle === current.iconTitle &&
      JSON.stringify(original.attributes) === JSON.stringify(current.attributes);
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "LIVE_NAMES_ONCE") {
      if (!pageEnabled() || settings.stuckEnabled !== true || pending || once) {
        reply({ ok: false });
        return false;
      }
      const currentPage = location.href;
      once = true;
      attempted = new WeakSet();
      request().then(result => {
        if (result?.ok && result.count && currentPage === location.href) authorizedPage = currentPage;
        reply({ ok: Boolean(result?.ok && result.count) });
      }).catch(() => reply({ ok: false })).finally(() => { once = false; });
      return true;
    }
    if (message?.type === "LIVE_NAMES_STATUS") {
      reply({ names: [...applied].flatMap(([node, value]) =>
        node.isConnected && (node.getAttribute(node.matches("img") ? "alt" : "aria-label") === value.name)
          ? [{ name: value.name, confidence: value.confidence }] : []) });
      return false;
    }
    if (!message?.type?.startsWith("LIVE_NAMES_")) return false;
    if (!pending || pending.token !== message.token || pending.url !== location.href || !permitted()) {
      reply({ ok: false });
      return false;
    }
    if (message.type === "LIVE_NAMES_CAPTURE") {
      const { language, viewport } = pending.state;
      const targets = pending.targets.map(({ target }) => target);
      reply({ language, viewport, targets, sample: language ? null : CurbCut.visibleLanguageSample() });
    } else if (message.type === "LIVE_NAMES_CONFIRM") {
      const current = currentTargets();
      reply({ ok: pending.targets.every(({ target, node }) => {
        const refreshed = current.get(target.selector);
        return document.querySelector(target.selector) === node && sameTarget(target, refreshed) &&
          target.box.every((value, index) => Math.abs(value - refreshed.box[index]) < 1);
      }) });
    } else if (message.type === "LIVE_NAMES_APPLY") {
      const current = currentTargets();
      if (!Array.isArray(message.results) || message.results.length !== pending.targets.length) {
        reply({ ok: false });
        return false;
      }
      for (const [index, { target, node }] of pending.targets.entries()) {
        const { name, confidence, error } = message.results[index];
        if (error || document.querySelector(target.selector) !== node || !sameTarget(target, current.get(target.selector))) continue;
        attempted.add(node);
        const cleanup = CurbCut.applyLiveName(node, target.role, name);
        if (cleanup) applied.set(node, { name, confidence, cleanup });
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
    if (!pageEnabled() || settings.liveNamesEnabled !== true &&
        (settings.stuckEnabled !== true || !once && authorizedPage !== location.href)) clear();
    else if (keys.some(key => key in changes)) schedule();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("popstate", schedule);
  document.addEventListener("visibilitychange", schedule);
  new MutationObserver(records => {
    if (page !== location.href || records.some(record => record.type === "childList")) {
      for (const node of applied.keys()) if (!node.isConnected) applied.delete(node);
      schedule();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
