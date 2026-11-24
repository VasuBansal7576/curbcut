(() => {
  const root = globalThis.CurbCutExt || (globalThis.CurbCutExt = {});
  root.ALLOWED_ACTIONS = Object.freeze([
    "addLabel",
    "setRole",
    "makeFocusable",
    "bindEnterToClick",
    "restoreFocusOutline",
    "removeFocusTrap",
    "setAltText",
    "injectCSS",
    "extendTimeout",
    "setLang",
    "setContrast",
    "mirrorHoverToFocus",
    "mirrorHoverEventToFocus",
    "toggleOnActivate",
    "arrowKeyNavigation",
    "dialogBehavior",
    "listboxBehavior",
  ]);
  root.ALLOWED_PERSONAS = Object.freeze([
    "keyboard-only",
    "low-vision",
    "screen-reader-view",
    "color-blind",
    "low-contrast-simulation",
    "document-language",
  ]);
  root.ALLOWED_STATUSES = Object.freeze([
    "candidate",
    "verified",
    "locally-verified",
    "broken",
    "retired",
  ]);
  root.LOCAL_FEED_URL = "http://127.0.0.1:4317/patches/index.json";
  root.TASKS_URL = "http://127.0.0.1:4317/tasks";
  root.PROOF_URL = "https://vasubansal7576.github.io/curbcut/#evidence";
  root.EVIDENCE_BASE = "https://github.com/VasuBansal7576/curbcut/raw/main/";
  root.FIXTURE_ORIGIN = "http://127.0.0.1:4317";
  root.FIXTURE_PREFIX = "/fixtures/shop/";
  root.FEED_ALARM = "curbcut-feed-refresh";
  root.FEED_PERIOD_MINUTES = 15;
  root.DEFAULT_STATE = Object.freeze({
    enabled: true,
    readerEnabled: false,
    fixturePreview: false,
    feedUrl: "",
    patches: [],
    demoPatches: [],
    lastFeedAt: null,
    feedError: null,
    pendingStuck: false,
  });
})();
