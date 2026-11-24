const instantJobs = new Map();
const activations = new Map();
chrome.tabs.onActivated.addListener(({ windowId }) => activations.set(windowId, (activations.get(windowId) ?? 0) + 1));
chrome.windows.onRemoved.addListener(windowId => activations.delete(windowId));
const instantBase = "http://127.0.0.1:4317/instant";
const instantQueuePrefix = "instant-queue:";
const instantQueueAlarm = "curbcut-instant-queue";

async function instantPost(path, payload) {
  const response = await fetch(instantBase + path, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Local bridge returned HTTP " + response.status + ".");
  return response.json();
}

async function captureInstantScreenshot(windowId) {
  const data = await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 65 });
  const bitmap = await createImageBitmap(await (await fetch(data)).blob());
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return data;
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.65 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 16384) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
    }
    return "data:image/jpeg;base64," + btoa(binary);
  } finally { bitmap.close(); }
}

let flushing;
function flushInstantQueue() {
  flushing ??= deliverInstantQueue().finally(() => { flushing = null; });
  return flushing;
}

async function deliverInstantQueue() {
  const keys = (await chrome.storage.local.getKeys()).filter(key => key.startsWith(instantQueuePrefix));
  for (const key of keys) {
    const entry = (await chrome.storage.local.get(key))[key];
    if (!entry) continue;
    try { await instantPost("/queue", entry); }
    catch { return; }
    await chrome.storage.local.remove(key);
  }
  if (!(await chrome.storage.local.getKeys()).some(key => key.startsWith(instantQueuePrefix))) {
    await chrome.alarms.clear(instantQueueAlarm);
  }
}

async function queueInstant(patch, decision) {
  const entry = { patch, confidence: decision.confidence, model: decision.model };
  await chrome.storage.local.set({ [instantQueuePrefix + patch.id]: entry });
  await chrome.alarms.create(instantQueueAlarm, { periodInMinutes: 2 });
  void flushInstantQueue().catch(() => {});
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === instantQueueAlarm) flushInstantQueue().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => flushInstantQueue().catch(() => {}));

function instantFix(tabId) {
  if (tabId == null) return Promise.resolve({ ok: false });
  if (instantJobs.has(tabId)) return instantJobs.get(tabId);
  const job = (async () => {
    const start = performance.now();
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active || globalThis.CurbCutExt.urlLooksSensitive(tab.url)) return { ok: false };
    const send = (message, documentId) => chrome.tabs.sendMessage(tabId, message, documentId ? { documentId } : { frameId: 0 });
    let captured, phase = "capture";
    try {
      const zoom = await chrome.tabs.getZoom(tabId);
      captured = await send({ type: "INSTANT_CAPTURE", zoom });
      if (!captured?.ok || !captured.hasCandidates) return { ok: false, reason: captured?.ok ? "no-candidates" : "privacy" };
      const active = (await chrome.tabs.query({ active: true, windowId: tab.windowId }))[0];
      if (active?.id !== tabId || active.url !== tab.url) return { ok: false };
      const activation = activations.get(tab.windowId);
      phase = "screenshot";
      const screenshot = await captureInstantScreenshot(tab.windowId);
      const after = (await chrome.tabs.query({ active: true, windowId: tab.windowId }))[0];
      if (after?.id !== tabId || after.url !== tab.url || activation !== activations.get(tab.windowId)) return { ok: false };
      const confirmed = await send({ type: "INSTANT_CONFIRM", token: captured.token });
      if (!confirmed?.ok || confirmed.url !== after.url) return { ok: false };
      phase = "decision";
      const key = await globalThis.CurbCutJevConfig.get();
      const decision = key
        ? await CurbCutJev.chooseInstant(key, captured.state, screenshot)
        : await instantPost("/decide", { state: captured.state, screenshot });
      if (!decision.rules || !(decision.confidence >= CurbCutJev.threshold)) return { ok: false, reason: decision.reason ?? "confidence", confidence: decision.confidence, providerMs: decision.providerMs };
      phase = "apply";
      const patch = CurbCutJev.instantPatch(captured.state.url, decision);
      const applied = await send({ type: "INSTANT_APPLY", token: captured.token, patch });
      if (!applied?.ok) return { ok: false, reason: "target-changed" };
      const endToEndMs = Math.round(performance.now() - start);
      await queueInstant(patch, decision);
      return { ok: true, endToEndMs, providerMs: decision.providerMs, confidence: decision.confidence, family: decision.family };
    } catch {
      return { ok: false, reason: phase };
    } finally {
      if (captured?.token) await send({ type: "INSTANT_FINISH", token: captured.token }).catch(() => {});
    }
  })().finally(() => instantJobs.delete(tabId));
  instantJobs.set(tabId, job);
  return job;
}
