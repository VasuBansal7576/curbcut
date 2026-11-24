(() => {
  if (globalThis.__curbcutFinder) return;
  globalThis.__curbcutFinder = true;
  const keys = ["finderEnabled", "enabled", "pausedPages"];
  const settings = {};
  let host, returnFocus, asking;

  function permitted() {
    return settings.finderEnabled === true && settings.enabled !== false &&
      !CurbCutExt.isPagePaused(location.href, settings) && location.protocol === "https:" &&
      !document.hidden && CurbCutExt.canCapturePage(location.href, document).ok && CurbCut.instantPrivacy();
  }

  function dismiss() {
    const restore = document.activeElement && host?.contains(document.activeElement) ? returnFocus : null;
    host?.remove();
    host = null;
    asking = false;
    restore?.focus({ preventScroll: true });
  }

  function openLink(href) {
    dismiss();
    if (href) location.assign(href);
  }

  function render(shadow, query) {
    const links = CurbCut.collectPageLinks();
    const match = CurbCut.finderCandidates(query, links);
    return { links, match };
  }

  function styles() {
    return `
      :host { all: initial; position: fixed; inset: 12vh 0 auto; z-index: 2147483647; display: grid; justify-items: center; }
      .dialog { width: min(480px, calc(100vw - 32px)); background: #ffffff; color: #161419; border: 1px solid #161419; font: 500 15px/1.4 "Inter Tight", system-ui, sans-serif; padding: 16px; }
      h2 { margin: 0 0 10px; font: 700 1.15rem/1.2 "Inter Tight", system-ui, sans-serif; }
      label { display: grid; gap: 4px; font-weight: 650; }
      input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #161419; background: #ffffff; color: #161419; font: inherit; }
      input:focus-visible, button:focus-visible, [role=option]:focus-visible { outline: 2px solid #FA4698; outline-offset: 3px; }
      .status { min-height: 1.3em; margin: 8px 0; }
      [role=listbox] { list-style: none; margin: 0; padding: 0; max-height: 40vh; overflow: auto; border: 1px solid #161419; }
      [role=option] { display: block; width: 100%; text-align: left; padding: 8px 10px; border: 0; background: #ffffff; color: #161419; font: inherit; cursor: pointer; }
      [role=option][aria-selected=true] { outline: 2px solid #FA4698; outline-offset: -2px; }
      .actions { display: flex; gap: 8px; margin-top: 10px; }
      button { background: #161419; color: #ffffff; border: 1px solid #161419; min-height: 34px; padding: 6px 10px; font: 700 14px/1.2 "Inter Tight", system-ui, sans-serif; cursor: pointer; }
      button.secondary { background: #ffffff; color: #161419; }
    `;
  }

  const font = new FontFace("Inter Tight", `url("${chrome.runtime.getURL("fonts/InterTight.ttf")}")`, { weight: "100 900" });
  font.load().then(loaded => document.fonts.add(loaded)).catch(() => {});

  function show() {
    if (!permitted()) return { ok: false, reason: "blocked" };
    dismiss();
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    host = document.createElement("div");
    host.dataset.curbcutFinder = "";
    const shadow = host.attachShadow({ mode: "open" });
    const css = new CSSStyleSheet();
    css.replaceSync(styles());
    shadow.adoptedStyleSheets = [css];
    const dialog = document.createElement("div");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "curbcut-finder-title");
    const title = document.createElement("h2");
    title.id = "curbcut-finder-title";
    title.textContent = "Find a service";
    const label = document.createElement("label");
    const caption = document.createElement("span");
    caption.textContent = "What are you looking for?";
    const input = document.createElement("input");
    input.type = "search";
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "curbcut-finder-list");
    label.append(caption, input);
    const status = document.createElement("p");
    status.className = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const list = document.createElement("div");
    list.id = "curbcut-finder-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Matching services");
    const actions = document.createElement("div");
    actions.className = "actions";
    const search = document.createElement("button");
    search.type = "button";
    search.textContent = "Search";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "secondary";
    close.textContent = "Close";
    close.addEventListener("click", dismiss);
    actions.append(search, close);
    dialog.append(title, label, status, list, actions);
    shadow.append(dialog);
    document.documentElement.append(host);

    let options = [];
    let active = 0;
    function paint(items, message) {
      options = items;
      active = 0;
      list.replaceChildren();
      for (const [index, item] of items.entries()) {
        const option = document.createElement("button");
        option.type = "button";
        option.setAttribute("role", "option");
        option.id = "curbcut-finder-opt-" + index;
        option.setAttribute("aria-selected", index === 0 ? "true" : "false");
        option.textContent = item.text;
        option.addEventListener("click", () => openLink(item.href));
        list.append(option);
      }
      status.textContent = message;
      input.setAttribute("aria-activedescendant", items.length ? "curbcut-finder-opt-0" : "");
    }

    function move(delta) {
      if (!options.length) return;
      active = (active + delta + options.length) % options.length;
      [...list.children].forEach((node, index) => node.setAttribute("aria-selected", index === active ? "true" : "false"));
      list.children[active]?.scrollIntoView({ block: "nearest" });
      input.setAttribute("aria-activedescendant", "curbcut-finder-opt-" + active);
    }

    async function run() {
      const query = input.value.trim();
      if (!query) {
        paint([], "Type a service, form, or destination.");
        return;
      }
      if (!permitted()) {
        paint([], "Curb Cut skipped this page.");
        return;
      }
      const { match } = render(shadow, query);
      if (match.literal.length) {
        paint(match.literal.slice(0, 12), match.literal.length + " literal match" + (match.literal.length === 1 ? "" : "es") + ".");
        return;
      }
      if (!match.candidates.length) {
        paint([], "No links on this page.");
        return;
      }
      if (asking) return;
      asking = true;
      status.textContent = "Asking Jev among page links.";
      try {
        const result = await chrome.runtime.sendMessage({
          type: "FINDER_REQUEST",
          query,
          candidates: match.candidates.map(({ id, text, href }) => ({ id, text, href }))
        });
        if (result?.chosen) paint([result.chosen], "Jev chose a destination.");
        else paint([], "Jev abstained. No destination followed.");
      } catch {
        paint([], "Could not ask Jev.");
      } finally {
        asking = false;
      }
    }

    search.addEventListener("click", () => void run());
    input.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
      else if (event.key === "Enter") {
        event.preventDefault();
        if (options[active]) openLink(options[active].href);
        else void run();
      }
    });
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
      if (event.key !== "Tab") return;
      const cycle = [input, search, close, ...list.querySelectorAll("button")];
      const first = cycle[0], last = cycle.at(-1);
      const active = shadow.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });
    input.focus();
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "FINDER_OPEN") {
      reply(show());
      return false;
    }
    return false;
  });

  chrome.storage.local.get(keys).then(values => Object.assign(settings, values)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of keys) if (key in changes) settings[key] = changes[key].newValue;
    if (settings.finderEnabled !== true || settings.enabled === false) dismiss();
  });
})();
