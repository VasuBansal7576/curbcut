import {createReport} from './lib/report.js';

(() => {
  const Ext = globalThis.CurbCutExt;

  const els = {
    globalToggle: document.getElementById("global-toggle"),
    globalStatus: document.getElementById("global-toggle-status"),
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
    "writing-patch": "Codex is writing the repair.",
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

  function renderActive(active) {
    els.activeList.replaceChildren();
    const items = Array.isArray(active) ? active : [];
    els.activeCount.textContent = String(items.length);
    els.activeEmpty.hidden = items.length > 0;

    for (const patch of items) {
      const li = document.createElement("li");
      li.className = "patch-item";
      li.dataset.patchId = patch.id;

      const top = document.createElement("div");
      top.className = "patch-item-top";

      const name = document.createElement("div");
      name.className = "patch-name";
      name.textContent = patch.id;

      const badge = document.createElement("span");
      badge.className = "badge " + (patch.unverified ? "unverified" : "verified");
      badge.textContent = patch.unverified ? "Unverified" : patch.status === "locally-verified" ? "Local proof" : "Kane verified";

      top.append(name, badge);

      const links = document.createElement("div");
      links.className = "evidence-links";
      const before = Ext.evidenceHref(patch.evidence && patch.evidence.before);
      const after = Ext.evidenceHref(patch.evidence && patch.evidence.after);
      if (before) {
        const a = document.createElement("a");
        a.href = before;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Before";
        links.append(a);
      }
      if (after) {
        const a = document.createElement("a");
        a.href = after;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "After";
        links.append(a);
      }
      if (patch.status === "locally-verified") {
        const a = document.createElement("a");
        a.href = Ext.evidenceHref(patch.evidence.localMeasurement);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Measurements";
        links.append(a);
      } else if (!before && !after) {
        const span = document.createElement("span");
        span.className = "meta";
        span.textContent = "Evidence pending";
        links.append(span);
      }

      li.append(top, links);
      if (!patch.unverified && patch.matchedRules?.length) {
        const report = document.createElement("details");
        const title = document.createElement("summary");
        title.textContent = "Send the fix to the site owner";
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "ghost";
        copy.textContent = "Copy Markdown";
        const status = document.createElement("span");
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
    els.globalToggle.checked = Boolean(state.enabled);
    els.globalToggle.setAttribute("aria-checked", String(Boolean(state.enabled)));
    els.globalStatus.textContent = state.enabled ? "Applying verified patches" : "Paused";
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
    els.pageUrl.textContent = page.url || "No active tab";
    els.proofLink.href = Ext.PROOF_URL;
    renderActive(page.active);
  }

  async function refreshPageContext() {
    const result = await chrome.runtime.sendMessage({ type: "QUERY_ACTIVE", capturedTabId, includeMatches: true });
    if (result && result.ok) {
      page.url = result.url || "";
      page.isFixture = Boolean(result.isFixture);
      page.active = Array.isArray(result.active) ? result.active : [];
      page.sensitive = Boolean(result.sensitive);
    } else if (state.enabled) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      page.url = (tab && tab.url) || "";
      page.isFixture = Ext.isFixtureShopUrl(page.url);
      page.active = Ext.selectActivePatches(page.url, state);
      page.sensitive = Ext.urlLooksSensitive(page.url);
    } else {
      page.active = [];
    }
  }

  async function load() {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (response && response.ok) state = response.state;
    capturedTabId = state.pendingStuck ? state.capturedTabId : undefined;
    await refreshPageContext();
    if (state.pendingStuck) {
      setTaskStatus("Hotkey capture ready. Confirm and send your task.", "is-ok");
      await chrome.runtime.sendMessage({ type: "CLEAR_PENDING_STUCK" });
      state.pendingStuck = false;
    } else renderReport(state.report);
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
      return;
    }
    const task = els.taskInput.value.trim();
    if (!task) {
      setTaskStatus("Enter a one-line task.", "is-error");
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

  els.globalToggle.addEventListener("change", async () => {
    const response = await chrome.runtime.sendMessage({
      type: "SET_ENABLED",
      enabled: els.globalToggle.checked,
    });
    if (response && response.ok) state = response.state;
    await refreshPageContext();
    renderState();
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

  chrome.storage.onChanged.addListener(async ({ report }, area) => {
    if (area !== "local" || !report?.newValue) return;
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
