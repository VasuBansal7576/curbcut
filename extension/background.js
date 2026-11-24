importScripts(
  "lib/constants.js",
  "lib/match.js",
  "lib/validate.js",
  "lib/select.js",
  "lib/sensitive.js",
  "jev-runtime.js",
  "jev-decisions-runtime.js",
  "jev-stuck-runtime.js",
  "lib/jev-config.js",
  "instant-background.js",
  "naming-background.js",
  "stuck-background.js",
  "state-background.js",
  "glance-background.js",
  "finder-background.js"
);

const Ext = globalThis.CurbCutExt;
let pageUpdate = Promise.resolve();
const jobAlarm = "curbcut-report-status";
const barrierQueuePrefix = "barrier-queue:";
const barrierQueueAlarm = "curbcut-barrier-queue";
const injectingTabs = new Map();

async function readJsonAsset(path) {
  try {
    const url = chrome.runtime.getURL(path);
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getState() {
  const stored = await chrome.storage.local.get(null);
  for (const key of Object.keys(stored)) {
    if (key.startsWith(instantQueuePrefix) || key.startsWith(barrierQueuePrefix)) delete stored[key];
  }
  return {
    ...Ext.DEFAULT_STATE,
    ...stored,
  };
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
  return getState();
}

async function loadBundledPatches() {
  const bundled = await readJsonAsset("bundled.json");
  const demo = await readJsonAsset("demo.json");
  const patches = Ext.sanitizePatchArray(bundled, { statuses: ["verified", "locally-verified", "retired"] });
  const demoPatches = Ext.sanitizePatchArray(demo, { statuses: ["candidate"] });
  return { patches, demoPatches };
}

async function fetchFeed(url) {
  if (!url || typeof url !== "string") return { ok: false, reason: "empty" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.href !== Ext.LOCAL_FEED_URL) {
      return { ok: false, reason: "protocol" };
    }
    const response = await fetch(url, { cache: "no-store", credentials: "omit" });
    if (!response.ok) return { ok: false, reason: `http-${response.status}` };
    const data = await response.json();
    const patches = Ext.sanitizePatchArray(data, { statuses: ["verified", "locally-verified", "retired"] });
    const evidenceBase = new URL("../", response.url);
    for (const patch of patches) {
      const evidence = patch.evidence || {};
      for (const key of ["before", "after", "control"]) {
        if (evidence[key]) evidence[key] = new URL(evidence[key], evidenceBase).href;
      }
    }
    return { ok: true, patches };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

async function refreshFeeds() {
  const state = await getState();
  const bundled = await loadBundledPatches();
  const localFeed = await fetchFeed(Ext.LOCAL_FEED_URL);
  const remoteFeed = state.feedUrl
    ? await fetchFeed(state.feedUrl.trim())
    : { ok: true, patches: [] };

  const errors = [];
  if (!localFeed.ok && localFeed.reason !== "fetch-failed") {
    errors.push(`local:${localFeed.reason}`);
  } else if (!localFeed.ok) {
    errors.push("local:unreachable");
  }
  if (state.feedUrl && !remoteFeed.ok) {
    errors.push(`remote:${remoteFeed.reason}`);
  }

  const feedLists = [];
  if (localFeed.ok) feedLists.push(localFeed.patches);
  if (state.feedUrl && remoteFeed.ok) feedLists.push(remoteFeed.patches);

  const patches =
    feedLists.length > 0
      ? Ext.mergeById(...feedLists)
      : bundled.patches;

  const next = await setState({
    patches,
    demoPatches: bundled.demoPatches,
    lastFeedAt: new Date().toISOString(),
    feedError: errors.length ? errors.join("; ") : null,
  });
  await broadcast("STATE_UPDATED", { state: next });
  return next;
}

let initialRefresh;
async function ensureSeeded() {
  const state = await getState();
  if (state.lastFeedAt) return state;
  initialRefresh ??= refreshFeeds().finally(() => { initialRefresh = null; });
  return initialRefresh;
}

async function broadcast(type, payload = {}) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return;
      try {
        await chrome.tabs.sendMessage(tab.id, { type, ...payload });
      } catch {
        return;
      }
    })
  );
}

async function pingTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    return response?.ok === true;
  } catch {
    return false;
  }
}

async function injectContentScripts(tabId) {
  const files = Ext.CONTENT_SCRIPTS;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files,
      injectImmediately: true,
    });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files,
    });
  }
}

async function ensureTab(tab) {
  if (!tab?.id) return null;
  if (!/^https?:/.test(tab.url || "")) return null;
  if (await pingTab(tab.id)) return tab;
  const pending = injectingTabs.get(tab.id);
  if (pending) {
    await pending;
    return (await pingTab(tab.id)) ? tab : null;
  }
  const job = (async () => {
    try {
      await injectContentScripts(tab.id);
    } catch {
      return false;
    }
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      if (await pingTab(tab.id)) return true;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return pingTab(tab.id);
  })();
  injectingTabs.set(tab.id, job);
  try {
    return (await job) ? tab : null;
  } finally {
    injectingTabs.delete(tab.id);
  }
}

async function sendToActiveTab(message, capturedTabId) {
  const tab = capturedTabId == null
    ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
    : await chrome.tabs.get(capturedTabId);
  if (!tab || tab.id == null) {
    return { ok: false, reason: "no-tab" };
  }
  await ensureTab(tab);
  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response || { ok: false, reason: "empty-response" };
  } catch {
    return { ok: false, reason: "no-content-script", tab };
  }
}

function buildTaskFilename(url) {
  let host = "page";
  try {
    host = new URL(url).hostname.replace(/[^a-z0-9.-]+/gi, "_");
  } catch {
    host = "page";
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `curbcut-task-${host}-${stamp}.json`;
}

async function downloadTask(payload) {
  const text = JSON.stringify(payload, null, 2);
  const dataUrl =
    "data:application/json;charset=utf-8," + encodeURIComponent(text);
  const filename = buildTaskFilename(payload.url);
  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true,
  });
  return { ok: true, downloadId, filename };
}

async function postTask(payload) {
  try {
    const response = await fetch(Ext.TASKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { ok: true, body };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

async function barrierQueueKeys() {
  const stored = await chrome.storage.local.get(null);
  return Object.keys(stored).filter((key) => key.startsWith(barrierQueuePrefix));
}

async function postDraft(payload) {
  try {
    const response = await fetch(Ext.TASKS_DRAFT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return { ok: false, reason: `http-${response.status}` };
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { ok: true, body };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

let flushingBarriers;
function flushBarrierQueue() {
  flushingBarriers ??= deliverBarrierQueue().finally(() => { flushingBarriers = null; });
  return flushingBarriers;
}

async function deliverBarrierQueue() {
  const keys = await barrierQueueKeys();
  for (const key of keys) {
    const entry = (await chrome.storage.local.get(key))[key];
    if (!entry) continue;
    const posted = await postDraft(entry);
    if (!posted.ok) return;
    await chrome.storage.local.remove(key);
  }
  if (!(await barrierQueueKeys()).length) {
    await chrome.alarms.clear(barrierQueueAlarm);
  }
}

async function queueBarrierDraft(payload) {
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [barrierQueuePrefix + id]: payload });
  await chrome.alarms.create(barrierQueueAlarm, { periodInMinutes: 2 });
  void flushBarrierQueue().catch(() => {});
  return { ok: true, queued: "storage", id };
}

function validEvidenceBase(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

let jobRefresh;
function refreshReport() {
  jobRefresh ??= (async () => {
    const { report } = await getState();
    if (!report || !["queued", "running"].includes(report.status)) return report;
    const response = await fetch(`${Ext.TASKS_URL}/${report.job}`, { cache: "no-store" });
    if (!response.ok) return report;
    const next = await response.json();
    if (next.status === "verified") {
      const state = await refreshFeeds();
      if (!state.patches.some(patch => patch.id === next.patchId)) return report;
    }
    if (next.status !== report.status || next.phase !== report.phase) await setState({ report: next });
    if (!["queued", "running"].includes(next.status)) await chrome.alarms.clear(jobAlarm);
    return next;
  })().finally(() => { jobRefresh = null; });
  return jobRefresh;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(Ext.FEED_ALARM, {
    periodInMinutes: Ext.FEED_PERIOD_MINUTES,
  });
  ensureSeeded().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(Ext.FEED_ALARM, {
    periodInMinutes: Ext.FEED_PERIOD_MINUTES,
  });
  ensureSeeded().catch(() => {});
  flushBarrierQueue().catch(() => {});
  getState().then(({ report }) => {
    if (["queued", "running"].includes(report?.status)) chrome.alarms.create(jobAlarm, { periodInMinutes: 0.5 });
  }).catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === Ext.FEED_ALARM) {
    refreshFeeds().catch(() => {});
  }
  if (alarm.name === jobAlarm) refreshReport().catch(() => {});
  if (alarm.name === barrierQueueAlarm) flushBarrierQueue().catch(() => {});
});

async function openCapture(tabId, fromPage = false) {
  const tab = tabId == null ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0] : await chrome.tabs.get(tabId);
  if (tab) await ensureTab(tab);
  const result = await sendToActiveTab({ type: "PREPARE_STUCK" }, tab?.id ?? tabId);
  const pendingBarrier = result?.ok ? result.report : null;
  await setState({
    pendingStuck: true,
    capturedTabId: tab?.id ?? tabId ?? null,
    pendingBarrier,
    pendingBarrierError: result?.ok ? null : result?.reason ?? "capture-failed",
  });
  if (fromPage) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    return result;
  }
  try {
    await chrome.action.openPopup();
  } catch {
    if ((tab?.id ?? tabId) != null) await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
  return result;
}

async function handleCommand(command, tab) {
  if (!tab?.id) {
    tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  }
  if (tab) await ensureTab(tab);
  if (command === "im-stuck") return openCapture(tab?.id);
  if (command === "instant-fix") return instantFix(tab?.id);
  if (command === "glance") return runGlance(tab?.id);
  if (command === "find-service") return openFinder(tab?.id);
  return { ok: false, reason: "unknown-command" };
}

chrome.commands.onCommand.addListener((command, tab) => {
  handleCommand(command, tab).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (!message || typeof message !== "object") {
      sendResponse({ ok: false, reason: "invalid-message" });
      return;
    }

    switch (message.type) {
      case "STUCK_EVALUATE": {
        sendResponse(await evaluateStuck(_sender, message.trace));
        return;
      }
      case "STUCK_ACCEPT": {
        sendResponse(await acceptStuck(_sender));
        return;
      }
      case "LIVE_NAMES_REQUEST": {
        sendResponse(await nameVisibleTab(_sender, message.token, message.once === true));
        return;
      }
      case "GET_LIVE_NAMES": {
        sendResponse(await sendToActiveTab({ type: "LIVE_NAMES_STATUS" }, message.capturedTabId));
        return;
      }
      case "VISUAL_STATE_REQUEST": {
        sendResponse(await syncVisibleState(_sender, message.token));
        return;
      }
      case "GET_VISUAL_STATE": {
        sendResponse(await sendToActiveTab({ type: "VISUAL_STATE_STATUS" }, message.capturedTabId));
        return;
      }
      case "UNDO_VISUAL_STATE": {
        sendResponse(await sendToActiveTab({ type: "VISUAL_STATE_UNDO" }, message.capturedTabId));
        return;
      }
      case "RUN_GLANCE": {
        const fromPage = _sender.tab && /^https?:/.test(_sender.url ?? "");
        const tabId = fromPage ? _sender.tab.id : message.capturedTabId ??
          (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
        sendResponse(await runGlance(tabId));
        return;
      }
      case "RUN_FINDER": {
        const fromPage = _sender.tab && /^https?:/.test(_sender.url ?? "");
        const tabId = fromPage ? _sender.tab.id : message.capturedTabId ??
          (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
        sendResponse(await openFinder(tabId));
        return;
      }
      case "FINDER_REQUEST": {
        sendResponse(await runFinder(_sender, message.query, message.candidates));
        return;
      }
      case "GET_STATE": {
        const state = await getState();
        sendResponse({ ok: true, state });
        return;
      }
      case "SET_ENABLED": {
        const state = await setState({ enabled: Boolean(message.enabled) });
        await broadcast("STATE_UPDATED", { state });
        sendResponse({ ok: true, state });
        return;
      }
      case "SET_PAGE_ENABLED": {
        const tab = message.capturedTabId == null
          ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
          : await chrome.tabs.get(message.capturedTabId);
        const key = Ext.pageKey(tab?.url);
        if (!key || key !== message.pageKey) {
          sendResponse({ ok: false, reason: "page-changed" });
          return;
        }
        const update = pageUpdate.catch(() => {}).then(async () => {
          const { pausedPages } = await getState();
          const pages = new Set(pausedPages);
          if (message.enabled) pages.delete(key);
          else pages.add(key);
          return setState({ pausedPages: [...pages] });
        });
        pageUpdate = update;
        const state = await update;
        await broadcast("STATE_UPDATED", { state });
        sendResponse({ ok: true, state });
        return;
      }
      case "SET_READER": {
        const state = await setState({
          readerEnabled: Boolean(message.readerEnabled),
        });
        await broadcast("STATE_UPDATED", { state });
        sendResponse({ ok: true, state });
        return;
      }
      case "SET_FIXTURE_PREVIEW": {
        const state = await setState({
          fixturePreview: Boolean(message.fixturePreview),
        });
        await broadcast("STATE_UPDATED", { state });
        sendResponse({ ok: true, state });
        return;
      }
      case "SET_FEED_URL": {
        const feedUrl =
          typeof message.feedUrl === "string" ? message.feedUrl.trim() : "";
        if (feedUrl) {
          try {
            const parsed = new URL(feedUrl);
            if (parsed.protocol !== "https:" && parsed.href !== Ext.LOCAL_FEED_URL) {
              sendResponse({ ok: false, reason: "invalid-feed-url" });
              return;
            }
          } catch {
            sendResponse({ ok: false, reason: "invalid-feed-url" });
            return;
          }
        }
        await setState({ feedUrl });
        const state = await refreshFeeds();
        sendResponse({ ok: true, state });
        return;
      }
      case "REFRESH_FEEDS": {
        const state = await refreshFeeds();
        sendResponse({ ok: true, state });
        return;
      }
      case "REFRESH_REPORT": {
        sendResponse({ ok: true, report: await refreshReport() });
        return;
      }
      case "CLEAR_PENDING_STUCK": {
        const state = await setState({
          pendingStuck: false,
          pendingBarrier: null,
          pendingBarrierError: null,
        });
        sendResponse({ ok: true, state });
        return;
      }
      case "SET_EVIDENCE_BASE": {
        const evidenceBase = typeof message.evidenceBase === "string" ? message.evidenceBase.trim() : "";
        if (evidenceBase && !validEvidenceBase(evidenceBase)) {
          sendResponse({ ok: false, reason: "invalid-evidence-base" });
          return;
        }
        const state = await setState({ evidenceBase });
        sendResponse({ ok: true, state });
        return;
      }
      case "CAPTURE_BARRIER": {
        sendResponse(await sendToActiveTab({ type: "CAPTURE_BARRIER" }, message.capturedTabId));
        return;
      }
      case "SUBMIT_BARRIER": {
        const payload = message.payload;
        if (!payload || typeof payload !== "object") {
          sendResponse({ ok: false, reason: "invalid-payload" });
          return;
        }
        if (!message.confirmed) {
          sendResponse({ ok: false, reason: "confirmation-required" });
          return;
        }
        if (typeof payload.url !== "string" || typeof payload.title !== "string") {
          sendResponse({ ok: false, reason: "invalid-payload" });
          return;
        }
        if (Ext.urlLooksSensitive(payload.url)) {
          sendResponse({ ok: false, reason: "sensitive-url" });
          return;
        }
        const persona = Ext.ALLOWED_PERSONAS.includes(payload.persona) ? payload.persona : "keyboard-only";
        const task = typeof payload.task === "string" ? payload.task.trim() : "";
        const keys = Array.isArray(payload.keys) ? payload.keys.slice(-16) : [];
        const focus = payload.focus && typeof payload.focus === "object" ? {
          role: typeof payload.focus.role === "string" ? payload.focus.role.slice(0, 80) : "",
          name: typeof payload.focus.name === "string" ? payload.focus.name.slice(0, 120) : "",
          selector: typeof payload.focus.selector === "string" ? payload.focus.selector.slice(0, 280) : "",
        } : null;
        const clean = {
          url: payload.url,
          title: payload.title.slice(0, 300),
          persona,
          task,
          focus,
          keys,
        };
        if (message.mode === "download") {
          sendResponse(await downloadTask(clean));
          return;
        }
        const posted = await postDraft(clean);
        if (posted.ok) {
          sendResponse(posted);
          return;
        }
        sendResponse({ ...await queueBarrierDraft(clean), postReason: posted.reason });
        return;
      }
      case "RUN_INSTANT": {
        if ((await chrome.storage.local.get("instantEnabled")).instantEnabled !== true) {
          sendResponse({ ok: false, reason: "disabled" });
          return;
        }
        const fromPage = _sender.tab && /^https?:/.test(_sender.url ?? "");
        const tabId = fromPage ? _sender.tab.id : message.capturedTabId ??
          (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
        if (!fromPage && message.capturedTabId != null) await chrome.tabs.update(tabId, { active: true });
        sendResponse(await instantFix(tabId));
        return;
      }
      case "OPEN_STUCK": {
        if (_sender.tab?.id == null) return sendResponse({ ok: false });
        await openCapture(_sender.tab.id, true);
        sendResponse({ ok: true });
        return;
      }
      case "QUERY_ACTIVE": {
        const result = await sendToActiveTab({ type: "GET_ACTIVE", includeMatches: message.includeMatches === true }, message.capturedTabId);
        sendResponse(result);
        return;
      }
      case "CAPTURE_SNAPSHOT": {
        const result = await sendToActiveTab({ type: "CAPTURE_SNAPSHOT" }, message.capturedTabId);
        sendResponse(result);
        return;
      }
      case "SUBMIT_TASK": {
        const payload = message.payload;
        if (!payload || typeof payload !== "object") {
          sendResponse({ ok: false, reason: "invalid-payload" });
          return;
        }
        if (!message.confirmed) {
          sendResponse({ ok: false, reason: "confirmation-required" });
          return;
        }
        if (
          typeof payload.url !== "string" ||
          typeof payload.persona !== "string" ||
          typeof payload.task !== "string" ||
          typeof payload.snapshot !== "object" ||
          payload.snapshot == null
        ) {
          sendResponse({ ok: false, reason: "invalid-payload" });
          return;
        }
        if (!Ext.ALLOWED_PERSONAS.includes(payload.persona)) {
          sendResponse({ ok: false, reason: "invalid-persona" });
          return;
        }
        if (!payload.task.trim()) {
          sendResponse({ ok: false, reason: "empty-task" });
          return;
        }
        if (Ext.urlLooksSensitive(payload.url)) {
          sendResponse({ ok: false, reason: "sensitive-url" });
          return;
        }
        const clean = {
          url: payload.url,
          persona: payload.persona,
          task: payload.task.trim(),
          snapshot: payload.snapshot,
        };
        if (message.mode === "download") {
          sendResponse(await downloadTask(clean));
          return;
        }
        const posted = await postTask(clean);
        if (posted.ok) {
          if (posted.body?.job) {
            await setState({ report: { job: posted.body.job, status: "queued" } });
            chrome.alarms.create(jobAlarm, { periodInMinutes: 0.5 });
          }
          sendResponse(posted);
          return;
        }
        const downloaded = await downloadTask(clean);
        sendResponse({
          ok: downloaded.ok,
          fallback: "download",
          postReason: posted.reason,
          ...downloaded,
        });
        return;
      }
      default:
        sendResponse({ ok: false, reason: "unknown-type" });
    }
  })().catch(() => {
    sendResponse({ ok: false, reason: "internal-error" });
  });
  return true;
});

self.handleCommand = handleCommand;
ensureSeeded().catch(() => {});
