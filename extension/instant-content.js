(() => {
  const local = chrome.storage.local;
  const settingKeys = ["instantEnabled", "enabled", "pausedPages"];
  let settings = {};
  let captured, applied, badge;
  let badgeFont;
  const enabled = () => settings.instantEnabled === true && settings.enabled !== false &&
    !CurbCutExt.isPagePaused(location.href, settings);
  local.get(settingKeys).then(values => { settings = values; }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !settingKeys.some(key => key in changes)) return;
    for (const key of settingKeys) {
      if (key in changes) settings[key] = changes[key].newValue;
    }
    if (!enabled()) {
      captured = null;
      release();
    }
  });
  const permitted = () => CurbCutExt.canCapturePage(location.href, document).ok && CurbCut.instantPrivacy();
  function show(message, undo) {
    badge?.remove();
    const host = document.createElement("div");
    host.dataset.curbcutInstant = "";
    const shadow = host.attachShadow({ mode: "open" });
    badgeFont ??= new FontFace("Curb Cut Overpass", `url("${chrome.runtime.getURL("fonts/Overpass.ttf")}")`, { weight: "100 900" })
      .load().then(font => document.fonts.add(font)).catch(() => {});
    const css = new CSSStyleSheet();
    css.replaceSync(`
      :host { all: initial; position: fixed; bottom: 18px; right: 18px; max-width: calc(100vw - 36px); z-index: 2147483647; }
      .bar { box-sizing: border-box; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 13px; background: #111214;
        color: #f4f1ea; border: 1px solid #8a8880; border-top: 3px solid #ffce1f; padding: 9px 12px;
        font: 600 15px/1.4 "Curb Cut Overpass", system-ui, sans-serif; }
      .mark { width: 27px; height: 11px; flex: 0 0 auto; background: #ffce1f; forced-color-adjust: none;
        clip-path: polygon(0 0, 37% 0, 66% 71%, 100% 71%, 100% 100%, 61% 100%, 31% 29%, 0 29%); }
      button { background: #ffce1f; color: #111214; border: 1px solid #ffce1f; border-radius: 0; padding: 5px 9px;
        cursor: pointer; font: inherit; }
      button:focus-visible { outline: 2px solid #f4f1ea; outline-offset: 3px; }
    `);
    shadow.adoptedStyleSheets = [css];
    const bar = document.createElement("div");
    bar.className = "bar";
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.setAttribute("role", "status");
    bar.append(mark, text);
    if (undo) {
      const originalFocus = document.activeElement;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Undo";
      button.setAttribute("aria-keyshortcuts", "Escape");
      button.addEventListener("click", release);
      host.addEventListener("focusin", event => {
        applied.returnFocus = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : originalFocus;
      });
      bar.append(button);
    }
    shadow.append(bar);
    document.documentElement.append(host);
    badge = host;
    text.textContent = message;
    if (!undo) setTimeout(() => { host.remove(); if (badge === host) badge = null; }, 5500);
  }

  function release() {
    if (!applied) return false;
    const restoreFocus = document.activeElement === badge ? applied.returnFocus : null;
    applied.cleanup();
    applied = null;
    show("Instant fix undone.");
    restoreFocus?.focus({ preventScroll: true });
    return true;
  }

  function menuObjective(patch) {
    const rule = patch.rules[0];
    if (!["mirrorHoverToFocus", "mirrorHoverEventToFocus"].includes(rule.action)) return {};
    const owner = document.querySelector(rule.selector);
    const controls = [...owner.querySelectorAll("a[href],button")];
    const trigger = controls.find(node => node.checkVisibility({ visibilityProperty: true }) && node.tabIndex >= 0);
    const item = controls.find(node => node !== trigger && !node.checkVisibility({ visibilityProperty: true }));
    if (!trigger || !item) return {};
    const opener = CurbCut.exactSelector(trigger);
    const target = CurbCut.exactSelector(item);
    if (document.querySelectorAll(opener).length !== 1 || document.querySelectorAll(target).length !== 1) return {};
    return {
      observedSelector: opener,
      barrierClass: 1,
      journey: [
        { selector: opener, action: "focus", pointer: { action: "hover" } },
        { selector: target, action: "observe" },
      ],
      outcomeChecks: [{ selector: target, kind: "visible" }],
    };
  }

  function navigate() {
    captured = null;
    if (applied?.url !== location.href) release();
  }

  globalThis.navigation?.addEventListener("currententrychange", navigate);
  window.addEventListener("pagehide", navigate);
  document.addEventListener("keydown", event => {
    if (!event.isTrusted || event.repeat) return;
    if (event.key === "Escape" && !event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && release()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (enabled() && event.code === "KeyF" && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.isComposing) {
      event.preventDefault();
      chrome.runtime.sendMessage({ type: "RUN_INSTANT" }).catch(() => {});
    }
  }, true);

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || !message?.type?.startsWith("INSTANT_")) return false;
    if (message.type === "INSTANT_CAPTURE") {
      if (!enabled()) {
        respond({ ok: false });
        return false;
      }
      if (!permitted()) {
        show("Instant fixes are available on public pages with empty input fields.");
        respond({ ok: false });
        return false;
      }
      const { state, nodes } = CurbCut.collectInstantState();
      state.zoom = message.zoom;
      captured = { token: Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-"), url: location.href, nodes, applied: false };
      respond({ ok: true, token: captured.token, hasCandidates: Boolean(nodes.size), state });
    }
    if (message.type === "INSTANT_CONFIRM") {
      respond({ ok: message.token === captured?.token && captured.url === location.href && enabled() && permitted(), url: location.href });
    }
    if (message.type === "INSTANT_APPLY") {
      const patch = message.patch;
      if (!captured || message.token !== captured.token || captured.url !== location.href || !enabled() || !permitted() ||
        !CurbCut.match(patch, location.href) || !patch.rules.every(({ selector }) => {
          const matches = document.querySelectorAll(selector);
          return matches.length === 1 && matches[0] === captured.nodes.get(selector);
        })) {
        respond({ ok: false });
        return false;
      }
      const matches = new Set();
      try {
        const objective = menuObjective(patch);
        const cleanup = CurbCut.apply(patch, index => matches.add(index));
        if (matches.size !== patch.rules.length) {
          cleanup();
          respond({ ok: false });
          return false;
        }
        applied?.cleanup();
        applied = { url: location.href, cleanup };
        captured.applied = true;
        show("Fixed for you · unverified", true);
        respond({ ok: true, objective });
      } catch { respond({ ok: false }); }
    }
    if (message.type === "INSTANT_FINISH") {
      if (message.token === captured?.token) {
        if (!captured.applied && !applied) show("Can’t fix this one yet.");
        captured = null;
      }
      respond({ ok: true });
    }
    return false;
  });
})();
