import { createReport } from './lib/report.js';

(() => {
  const Ext = globalThis.CurbCutExt;

  const els = {
    globalToggle: document.getElementById("global-toggle"),
    globalStatus: document.getElementById("global-toggle-status"),
    pageToggle: document.getElementById("page-toggle"),
    pageToggleRow: document.getElementById("page-toggle-row"),
    stuck: document.getElementById("stuck"),
    instantPanel: document.getElementById("instant-panel"),
    instantFix: document.getElementById("instant-fix"),
    instantStatus: document.getElementById("instant-status"),
    instantSettings: document.getElementById("instant-settings"),
    readerToggle: document.getElementById("reader-toggle"),
    fixtureRow: document.getElementById("fixture-preview-row"),
    fixtureToggle: document.getElementById("fixture-preview-toggle"),
    activeList: document.getElementById("active-patches"),
    activeEmpty: document.getElementById("active-empty"),
    activeCount: document.getElementById("active-count"),
    persona: document.getElementById("persona-select"),
    taskInput: document.getElementById("task-input"),
    taskConfirm: document.getElementById("task-confirm"),
    sendTask: document.getElementById("send-task"),
    downloadTask: document.getElementById("download-task"),
    taskStatus: document.getElementById("task-status"),
    feedUrl: document.getElementById("feed-url"),
    saveFeed: document.getElementById("save-feed"),
    refreshFeed: document.getElementById("refresh-feed"),
    feedStatus: document.getElementById("feed-status"),
    proofLink: document.getElementById("proof-link"),
    pageUrl: document.getElementById("page-url"),
  };

  let state = { ...Ext.DEFAULT_STATE };
  let capturedTabId;
  let page = {
    url: "",
    isFixture: false,
    active: [],
    sensitive: false,
    available: false,
    snapshot: null,
  };

  function setTaskStatus(text, kind) {
    els.taskStatus.textContent = text || "";
    els.taskStatus.classList.remove("is-error", "is-ok");
    if (kind) els.taskStatus.classList.add(kind);
  }

  const reportLabels = {
    queued: "Task sent to local loop.",
    reproducing: "Kane is reproducing the barrier.",
    "checking-control": "Kane is running the pointer control.",
    "writing-patch": "Writing the repair.",
    verifying: "Kane is testing the repair.",
    publishing: "Publishing the verified repair.",
    verified: "Kane verified the repair. It is available in the extension.",
    "already-accessible": "Kane completed the task on the original page.",
    blocked: "The loop stopped. See the local server log.",
    inconclusive: "Kane could not verify this task.",
    unresolved: "Kane could not verify a repair.",
  };

  function renderReport(report) {
    if (report) setTaskStatus(reportLabels[report.phase || report.status], "is-ok");
  }

  const personaLabels = {
    "keyboard-only": "Keyboard",
    "low-vision": "Low vision",
    "screen-reader-view": "Screen reader",
    "color-blind": "Color vision",
    "low-contrast-simulation": "Low vision",
    "document-language": "Screen reader",
  };

  function proofLink(href, label) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = label;
    return anchor;
  }

  function renderActive(active, emptyMessage) {
    els.activeList.replaceChildren();
    const items = Array.isArray(active) ? active : [];
    els.activeCount.textContent = String(items.length);
    els.activeCount.setAttribute("aria-label", `${items.length} active ${items.length === 1 ? "fix" : "fixes"}`);
    els.activeEmpty.hidden = items.length > 0;
    els.activeEmpty.textContent = emptyMessage;

    for (const patch of items) {
      const li = document.createElement("li");
      li.className = "patch-item";
      li.dataset.patchId = patch.id;

      const top = document.createElement("div");
      top.className = "patch-item-top";
      const persona = document.createElement("span");
      persona.className = "persona";
      persona.textContent = personaLabels[patch.persona] || patch.persona;

      const badge = document.createElement("span");
      const local = patch.status === "locally-verified";
      badge.className = "badge " + (patch.unverified ? "unverified" : local ? "local" : "verified");
      badge.textContent = patch.unverified ? "Unverified" : local ? "Local proof" : "Kane verified";

      const name = document.createElement("p");
      name.className = "patch-name";
      name.textContent = patch.barrier;

      top.append(badge, persona);
      li.append(top, name);

      const before = Ext.evidenceHref(patch.evidence?.before);
      const after = Ext.evidenceHref(patch.evidence?.after);
      const measurement = Ext.evidenceHref(patch.evidence?.localMeasurement);
      if (local && measurement) {
        const link = proofLink(measurement, "View measurements");
        link.className = "measurement";
        li.append(link);
      } else if (before || after) {
        const proof = document.createElement("details");
        const title = document.createElement("summary");
        title.textContent = "Watch proof";
        const links = document.createElement("div");
        links.className = "evidence-links";
        if (before) links.append(proofLink(before, "Before recording"));
        if (after) links.append(proofLink(after, "After recording"));
        proof.append(title, links);
        li.append(proof);
      }

      if (!patch.unverified && patch.matchedRules?.length && patch.selectorMatches?.every(({ count }) => count > 0)) {
        const report = document.createElement("details");
        const title = document.createElement("summary");
        title.textContent = "Send fix to site owner";
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "ghost";
        copy.textContent = "Copy Markdown";
        const status = document.createElement("span");
        status.className = "status";
        status.setAttribute("role", "status");
        const download = document.createElement("button");
        download.type = "button";
        download.className = "ghost";
        download.textContent = "Download .md";
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(createReport(patch));
            status.textContent = "Copied.";
          } catch {
            status.textContent = "Copy failed. Download the report instead.";
          }
        });
        download.addEventListener("click", () => {
          const file = new Blob([createReport(patch)], { type: "text/markdown;charset=utf-8" });
          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = url;
          link.download = patch.id + ".md";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        const controls = document.createElement("div");
        controls.className = "report-actions";
        controls.append(copy, download, status);
        report.append(title, controls);
        li.append(report);
      }
      els.activeList.append(li);
    }
  }

  function renderState() {
    const pageKey = Ext.pageKey(page.url);
    const pagePaused = Ext.isPagePaused(page.url, state);
    els.globalToggle.checked = Boolean(state.enabled);
    els.globalStatus.textContent = state.enabled ? "ON" : "OFF";
    els.pageToggleRow.hidden = !page.available || !pageKey;
    els.pageToggle.checked = state.enabled && !pagePaused;
    els.pageToggle.disabled = !state.enabled;
    els.readerToggle.checked = Boolean(state.readerEnabled);
    els.fixtureToggle.checked = Boolean(state.fixturePreview);
    els.fixtureRow.hidden = !page.isFixture;
    els.feedUrl.value = state.feedUrl || "";
    const stamp = state.lastFeedAt
      ? new Date(state.lastFeedAt).toLocaleString()
      : "never";
    const count = Array.isArray(state.patches) ? state.patches.length : 0;
    els.feedStatus.textContent = state.feedError
      ? `${count} verified cached · last refresh ${stamp} · ${state.feedError}`
      : `${count} verified cached · last refresh ${stamp}`;
    els.pageUrl.textContent = pageKey ? pageKey.replace(/^https?:\/\//, "") : "No web page selected";
    els.proofLink.href = Ext.PROOF_URL;
    const active = state.enabled && !pagePaused ? page.active : [];
    const emptyMessage = !state.enabled ? "Fixes are paused on all pages." :
      pagePaused ? "Fixes are paused for this page." :
        page.available ? "No known fix for this page." : "Fixes aren’t available on this tab.";
    renderActive(active, emptyMessage);
    els.instantPanel.hidden = state.instantEnabled !== true || !state.enabled || pagePaused ||
      !page.available || page.sensitive || page.isFixture || active.length > 0 || !pageKey?.startsWith("https://");
  }

  async function refreshPageContext() {
    const result = await chrome.runtime.sendMessage({ type: "QUERY_ACTIVE", capturedTabId, includeMatches: true });
    if (result?.url !== page.url) page.snapshot = null;
    page.available = Boolean(result?.ok);
    page.url = result?.url || result?.tab?.url || "";
    page.isFixture = Boolean(result?.isFixture);
    page.active = Array.isArray(result?.active)
      ? result.active.filter(patch => patch.matchedRules?.length || patch.unverified)
      : [];
    page.sensitive = Boolean(result?.sensitive);
  }

  async function load() {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (response && response.ok) state = response.state;
    capturedTabId = state.pendingStuck ? state.capturedTabId : undefined;
    await refreshPageContext();
    if (state.pendingStuck) {
      els.stuck.open = true;
      setTaskStatus("Hotkey capture ready. Confirm and send your task.", "is-ok");
      await chrome.runtime.sendMessage({ type: "CLEAR_PENDING_STUCK" });
      state.pendingStuck = false;
    } else renderReport(state.report);
    els.globalToggle.disabled = false;
    renderState();
  }

  async function ensureSnapshot() {
    if (page.snapshot) return {ok: true, snapshot: page.snapshot, url: page.url};
    const result = await chrome.runtime.sendMessage({ type: "CAPTURE_SNAPSHOT", capturedTabId });
    if (!result || !result.ok) {
      return { ok: false, reason: (result && result.reason) || "capture-failed" };
    }
    page.snapshot = result.snapshot;
    page.url = result.url || page.url;
    return { ok: true, snapshot: result.snapshot, url: result.url };
  }

  async function submit(mode) {
    setTaskStatus("");
    if (!els.taskConfirm.checked) {
      setTaskStatus("Confirm this is a public page before sending.", "is-error");
      els.taskConfirm.focus();
      return;
    }
    const task = els.taskInput.value.trim();
    if (!task) {
      setTaskStatus("Enter a one-line task.", "is-error");
      els.taskInput.focus();
      return;
    }
    if (page.sensitive || Ext.urlLooksSensitive(page.url)) {
      setTaskStatus("This page looks authenticated or sensitive. Capture blocked.", "is-error");
      return;
    }
    const captured = await ensureSnapshot();
    if (!captured.ok) {
      const messages = {
        "sensitive-url": "URL looks sensitive. Capture blocked.",
        "sensitive-document": "Page has password or auth fields. Capture blocked.",
        "runtime-missing": "Patch runtime is not available on this page.",
        "no-content-script": "Open a normal http(s) page and try again.",
      };
      setTaskStatus(messages[captured.reason] || "Could not capture snapshot.", "is-error");
      return;
    }
    const payload = {
      url: captured.url || page.url,
      persona: els.persona.value,
      task,
      snapshot: captured.snapshot,
    };
    const response = await chrome.runtime.sendMessage({
      type: "SUBMIT_TASK",
      mode,
      confirmed: true,
      payload,
    });
    if (!response || !response.ok) {
      setTaskStatus("Send failed.", "is-error");
      return;
    }
    if (response.fallback === "download") {
      setTaskStatus("Local loop unreachable. Task downloaded instead.", "is-ok");
      return;
    }
    if (mode === "download") {
      setTaskStatus(`Downloaded ${response.filename || "task file"}.`, "is-ok");
      return;
    }
    setTaskStatus("Task sent to local loop.", "is-ok");
  }

  let changingFixes = false;
  async function toggleFixes(message) {
    if (changingFixes) {
      els.globalToggle.checked = Boolean(state.enabled);
      els.pageToggle.checked = state.enabled && !Ext.isPagePaused(page.url, state);
      return;
    }
    changingFixes = true;
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (!response?.ok) throw new Error("Could not change fix settings.");
      state = response.state;
      await refreshPageContext();
    } catch {
      setTaskStatus("Could not change fix settings. Reopen the popup to try again.", "is-error");
    } finally {
      changingFixes = false;
      renderState();
    }
  }

  els.globalToggle.addEventListener("change", () => toggleFixes({
    type: "SET_ENABLED",
    enabled: els.globalToggle.checked,
  }));
  els.pageToggle.addEventListener("change", () => toggleFixes({
    type: "SET_PAGE_ENABLED",
    capturedTabId,
    pageKey: Ext.pageKey(page.url),
    enabled: els.pageToggle.checked,
  }));

  els.instantSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
  els.instantFix.addEventListener("click", async () => {
    els.instantFix.disabled = true;
    els.instantStatus.textContent = "Looking for a fix…";
    try {
      const result = await chrome.runtime.sendMessage({ type: "RUN_INSTANT", capturedTabId });
      els.instantStatus.textContent = result?.ok ? "Temporary fix applied. Press Escape on the page to undo." : "Can’t fix this one yet.";
    } catch {
      els.instantStatus.textContent = "Can’t fix this one yet.";
    } finally {
      els.instantFix.disabled = false;
    }
  });

  els.readerToggle.addEventListener("change", async () => {
    const response = await chrome.runtime.sendMessage({
      type: "SET_READER",
      readerEnabled: els.readerToggle.checked,
    });
    if (response && response.ok) state = response.state;
    renderState();
  });

  els.fixtureToggle.addEventListener("change", async () => {
    const response = await chrome.runtime.sendMessage({
      type: "SET_FIXTURE_PREVIEW",
      fixturePreview: els.fixtureToggle.checked,
    });
    if (response && response.ok) state = response.state;
    await refreshPageContext();
    renderState();
  });

  els.saveFeed.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
      type: "SET_FEED_URL",
      feedUrl: els.feedUrl.value.trim(),
    });
    if (!response || !response.ok) {
      els.feedStatus.textContent = "Feed URL rejected.";
      return;
    }
    state = response.state;
    await refreshPageContext();
    renderState();
  });

  els.refreshFeed.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({ type: "REFRESH_FEEDS" });
    if (response && response.ok) state = response.state;
    await refreshPageContext();
    renderState();
  });

  els.sendTask.addEventListener("click", () => submit("send"));
  els.downloadTask.addEventListener("click", () => submit("download"));

  chrome.storage.onChanged.addListener(async ({ report, instantEnabled }, area) => {
    if (area !== "local") return;
    if (instantEnabled) {
      state.instantEnabled = instantEnabled.newValue;
      renderState();
    }
    if (!report?.newValue) return;
    state.report = report.newValue;
    renderReport(state.report);
    if (state.report.status === "verified") {
      await refreshPageContext();
      renderState();
    }
  });

  setInterval(() => {
    if (["queued", "running"].includes(state.report?.status)) {
      chrome.runtime.sendMessage({ type: "REFRESH_REPORT" }).catch(() => {});
    }
  }, 2500);

  load().catch(() => {
    setTaskStatus("Popup failed to load extension state.", "is-error");
  });
})();
