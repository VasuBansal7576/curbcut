(() => {
  if (globalThis.__curbcutGlance) return;
  globalThis.__curbcutGlance = true;
  const keys = ["glanceEnabled", "enabled", "pausedPages"];
  const settings = {};
  let host, returnFocus, pending;

  function permitted() {
    return settings.glanceEnabled === true && settings.enabled !== false &&
      !CurbCutExt.isPagePaused(location.href, settings) && location.protocol === "https:" &&
      !document.hidden && CurbCutExt.canCapturePage(location.href, document).ok && CurbCut.instantPrivacy();
  }

  function dismiss() {
    const restore = document.activeElement && host?.contains(document.activeElement) ? returnFocus : null;
    host?.remove();
    host = null;
    restore?.focus({ preventScroll: true });
  }

  function styles() {
    return `
      :host { all: initial; position: fixed; inset: auto 16px 16px auto; z-index: 2147483647; max-width: min(360px, calc(100vw - 32px)); }
      .panel { background: #ffffff; color: #161419; border: 1px solid #161419; font: 500 15px/1.4 "Inter Tight", system-ui, sans-serif; padding: 12px 14px; }
      h2 { margin: 0 0 8px; font: 700 1.05rem/1.2 "Inter Tight", system-ui, sans-serif; }
      .live { margin: 0 0 10px; }
      button { background: #ffffff; color: #161419; border: 1px solid #161419; min-height: 32px; padding: 5px 9px; font: 650 14px/1.2 "Inter Tight", system-ui, sans-serif; cursor: pointer; }
      button:focus-visible, .close:focus-visible { outline: 2px solid #FA4698; outline-offset: 3px; }
      .row { display: flex; flex-wrap: wrap; gap: 6px; }
      .close { margin-top: 8px; }
    `;
  }

  const font = new FontFace("Inter Tight", `url("${chrome.runtime.getURL("fonts/InterTight.ttf")}")`, { weight: "100 900" });
  font.load().then(loaded => document.fonts.add(loaded)).catch(() => {});

  function show(items) {
    dismiss();
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    host = document.createElement("div");
    host.dataset.curbcutGlance = "";
    const shadow = host.attachShadow({ mode: "open" });
    const css = new CSSStyleSheet();
    css.replaceSync(styles());
    shadow.adoptedStyleSheets = [css];
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "curbcut-glance-title");
    const title = document.createElement("h2");
    title.id = "curbcut-glance-title";
    title.textContent = "Glance";
    const live = document.createElement("p");
    live.className = "live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    const spoken = items.map(item => {
      if (item.kind === "main" || item.kind === "action") return item.box ? item.label + " located." : item.label + " not located.";
      return item.yes ? item.label + "." : "No " + item.label.toLowerCase() + ".";
    }).join(" ");
    live.textContent = spoken || "Nothing to report.";
    const row = document.createElement("div");
    row.className = "row";
    for (const item of items) {
      if (!item.box) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Jump to " + item.label;
      button.addEventListener("click", () => CurbCut.focusFromBox(item.box));
      row.append(button);
    }
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "Close";
    close.addEventListener("click", dismiss);
    panel.append(title, live, row, close);
    shadow.append(panel);
    document.documentElement.append(host);
    close.focus();
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "GLANCE_PREPARE") {
      if (!permitted() || pending) {
        reply({ ok: false, reason: permitted() ? "busy" : "blocked" });
        return false;
      }
      pending = { token: message.token, url: location.href };
      reply({ ok: true, viewport: { width: innerWidth, height: innerHeight } });
      return false;
    }
    if (message?.type === "GLANCE_PERMITTED") {
      reply({ ok: Boolean(pending && pending.token === message.token && pending.url === location.href && permitted()) });
      return false;
    }
    if (message?.type === "GLANCE_RESULT") {
      if (!pending || pending.token !== message.token || pending.url !== location.href) {
        reply({ ok: false });
        return false;
      }
      pending = null;
      if (Array.isArray(message.items)) show(message.items);
      reply({ ok: true });
      return false;
    }
    if (message?.type === "GLANCE_FAIL") {
      pending = null;
      reply({ ok: true });
      return false;
    }
    return false;
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && host) {
      event.preventDefault();
      dismiss();
    }
  });

  chrome.storage.local.get(keys).then(values => Object.assign(settings, values)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of keys) if (key in changes) settings[key] = changes[key].newValue;
    if (settings.glanceEnabled !== true || settings.enabled === false) dismiss();
  });
})();
