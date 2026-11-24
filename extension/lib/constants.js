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
  ]);
  root.ALLOWED_STATUSES = Object.freeze([
    "candidate",
    "verified",
    "broken",
    "retired",
  ]);
  root.LOCAL_FEED_URL = "http://127.0.0.1:4317/patches/index.json";
  root.TASKS_URL = "http://127.0.0.1:4317/tasks";
  root.PROOF_URL = "http://127.0.0.1:4317/site/#evidence";
  root.EVIDENCE_BASE = "http://127.0.0.1:4317/";
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
