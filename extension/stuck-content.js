(() => {
  const settingKeys = ["stuckEnabled", "enabled", "pausedPages"];
  const settings = {};
  const allowedKeys = new Set(["Tab", "Enter", " ", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);
  const editable = "input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]";
  const roles = new Set(["link", "button", "menuitem", "tab", "checkbox", "radio", "switch", "combobox", "listbox", "option", "dialog"]);
  let ids = new WeakMap();
  let trace = [];
  let idCounter = 0;
  let previous = null;
  let requestedAt = 0;
  let offer;
  let focusOffer;
  let returnFocus;
  let pending = false;

  function permitted() {
    return settings.stuckEnabled === true && settings.enabled !== false && !document.hidden &&
      location.protocol === "https:" && !CurbCutExt.isPagePaused(location.href, settings) &&
      CurbCutExt.canCapturePage(location.href, document).ok && CurbCut.instantPrivacy();
  }

  function reset() {
    trace = [];
    previous = null;
    ids = new WeakMap();
    idCounter = 0;
  }

  function fingerprint(node) {
    return ["aria-expanded", "aria-pressed", "aria-selected", "aria-checked", "open", "hidden"]
      .map(attr => node?.getAttribute(attr)).join("|");
  }

  function focusState(node) {
    if (!node || node === document.body || node === document.documentElement) return { visible: false };
    if (!ids.has(node)) ids.set(node, idCounter++ % 256);
    const native = node.matches("a[href]") ? "link" : node.matches("button,summary,[type=button]") ? "button" : "other";
    const explicit = node.getAttribute("role");
    const box = node.getBoundingClientRect();
    return {
      focus: ids.get(node),
      role: roles.has(explicit) ? explicit : native,
      named: Boolean(node.getAttribute("aria-label") || node.getAttribute("aria-labelledby") ||
        node.getAttribute("title") || node.innerText?.trim()),
      visible: node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
        box.right > 0 && box.bottom > 0 && box.left < innerWidth && box.top < innerHeight &&
        box.width > 0 && box.height > 0,
    };
  }

  function dismiss() {
    const restore = document.activeElement === offer ? returnFocus : null;
    offer?.remove();
    offer = null;
    focusOffer = null;
    returnFocus = null;
    restore?.focus({ preventScroll: true });
  }

  function show(known) {
    dismiss();
    const host = document.createElement("div");
    host.dataset.curbcutOffer = "";
    const shadow = host.attachShadow({ mode: "open" });
    const css = new CSSStyleSheet();
    css.replaceSync(`
      :host { all: initial; position: fixed; inset: auto 16px 16px auto; z-index: 2147483647; max-width: calc(100% - 32px); }
      .notice { background: #151619; color: #f4f1ea; padding: 12px; border: 1px solid #8a8880;
        border-top: 3px solid #ffce1f; font: 600 15px/1.45 system-ui; }
      .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      button { background: #ffce1f; color: #151619; border: 2px solid transparent; padding: 4px 8px; font: inherit; cursor: pointer; }
      button:focus-visible { outline: 2px solid #f4f1ea; outline-offset: 2px; }
    `);
    shadow.adoptedStyleSheets = [css];
    const box = document.createElement("div");
    box.className = "notice";
    const status = document.createElement("div");
    status.setAttribute("role", "status");
    status.textContent = "Looks like you’re stuck. Fix this page? Press Alt+Shift+J to review.";
    const controls = document.createElement("div");
    controls.className = "controls";
    const fix = document.createElement("button");
    fix.type = "button";
    fix.textContent = known ? "Apply known fix" : "Name controls with Jev";
    fix.addEventListener("click", async event => {
      if (!event.isTrusted || !permitted()) return;
      fix.disabled = true;
      const outcome = await chrome.runtime.sendMessage({ type: "STUCK_ACCEPT", known }).catch(() => null);
      status.textContent = outcome?.ok ? known ? "Known fix applied." : "Live naming requested." : "Curb Cut couldn’t apply a fix.";
      fix.remove();
    });
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Dismiss";
    close.addEventListener("click", event => { if (event.isTrusted) dismiss(); });
    controls.append(fix, close);
    box.append(status, controls);
    shadow.append(box);
    document.documentElement.append(host);
    offer = host;
    focusOffer = () => {
      returnFocus = document.activeElement;
      fix.focus({ preventScroll: true });
    };
  }

  async function evaluate() {
    if (pending || trace.length < 6 || Date.now() - requestedAt < 12000) return;
    if (!trace.some(row => row.revisited || row.visible === false || row.effect === "unchanged")) return;
    pending = true;
    requestedAt = Date.now();
    const url = location.href;
    try {
      const verdict = await chrome.runtime.sendMessage({ type: "STUCK_EVALUATE", trace });
      if (verdict?.offer && permitted() && location.href === url && !offer) show(verdict.known);
    } catch {
      return;
    } finally { pending = false; }
  }

  window.addEventListener("keydown", event => {
    if (!event.isTrusted || !focusOffer || !event.altKey || !event.shiftKey ||
        event.ctrlKey || event.metaKey || event.code !== "KeyJ") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    focusOffer();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.isTrusted && event.key === "Escape" && offer) dismiss();
    if (!event.isTrusted || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        !allowedKeys.has(event.key) || event.shiftKey && event.key !== "Tab" ||
        event.composedPath().some(node => node.closest?.(editable + ",[data-curbcut-offer],[data-curbcut-reader]"))) return;
    if (!permitted()) { reset(); return; }
    const time = performance.now();
    if (previous && (time - previous.time > 10000 || previous.url !== location.href)) reset();
    const gapMs = previous ? time - previous.time : null;
    previous = { time, url: location.href };
    const initial = document.activeElement;
    const prior = fingerprint(initial);
    const key = event.key === " " ? "Space" : event.shiftKey ? "Shift+Tab" : event.key;
    const url = location.href;
    setTimeout(() => {
      if (!permitted() || location.href !== url || document.activeElement?.closest(editable)) return;
      const node = document.activeElement;
      const focus = focusState(node);
      const effect = fingerprint(initial) !== prior ? "progress" : initial !== node ? "focus-change" : "unchanged";
      trace.push({ key, ...focus, gapMs, effect, revisited: focus.focus != null && trace.slice(-9).some(step => step.focus === focus.focus) });
      trace = trace.slice(-16);
      void evaluate();
    }, key === "Enter" || key === "Space" ? 110 : 0);
  }, true);

  chrome.storage.local.get(settingKeys).then(values => Object.assign(settings, values)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const name of settingKeys) if (name in changes) settings[name] = changes[name].newValue;
    if (!permitted()) { dismiss(); reset(); }
  });
  window.addEventListener("pagehide", () => { dismiss(); reset(); });
})();
