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
    liveNames: document.getElementById("live-names-status"),
    visualState: document.getElementById("visual-state-status"),
    glancePanel: document.getElementById("glance-panel"),
    glance: document.getElementById("glance"),
    glanceStatus: document.getElementById("glance-status"),
    finderPanel: document.getElementById("finder-panel"),
    findService: document.getElementById("find-service"),
    finderStatus: document.getElementById("finder-status"),
    activeCount: document.getElementById("active-count"),
    siteFixed: document.getElementById("site-fixed"),
    retiredList: document.getElementById("retired-patches"),
    barrierPreview: document.getElementById("barrier-preview"),
    barrierFields: document.getElementById("barrier-fields"),
    barrierBlocked: document.getElementById("barrier-blocked"),
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
    instantPatch: null,
    retired: [],
  };
  let barrierReport = null;

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

  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  function toggleClip(video) {
    if (video.paused) {
      const play = video.play();
      if (play && typeof play.catch === "function") play.catch(() => {});
    } else video.pause();
  }

  function evidencePlayer(href, label) {
    const figure = document.createElement("figure");
    figure.className = "clip";
    const video = document.createElement("video");
    video.src = href;
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    video.defaultMuted = true;
    video.tabIndex = 0;
    video.preload = "metadata";
    video.setAttribute("muted", "");
    video.setAttribute("aria-label", label);
    video.setAttribute("controlslist", "nodownload");
    if (!prefersReducedMotion()) {
      video.autoplay = true;
      video.muted = true;
    }
    video.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter" || event.key === "k" || event.key === "K") {
        event.preventDefault();
        toggleClip(video);
      }
    });
    const caption = document.createElement("figcaption");
    caption.textContent = label;
    figure.append(video, caption);
    return figure;
  }

  function evidenceUrl(path) {
    return Ext.evidenceHref(path, state.evidenceBase || Ext.EVIDENCE_BASE);
  }

  function proofKind(patch) {
    if (patch.unverified) return { cls: "unverified", label: "Unverified" };
    if (patch.status === "locally-verified") return { cls: "local", label: "Local proof" };
    return { cls: "verified", label: "Kane verified" };
  }

  function exportReport(patch, status) {
    try {
      const file = new Blob([createReport(patch)], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = patch.id + ".md";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Report downloaded.";
    } catch {
      status.textContent = "Could not export the report.";
    }
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
      const kind = proofKind(patch);
      li.setAttribute("aria-label", `${patch.barrier}. ${kind.label}. ${personaLabels[patch.persona] || patch.persona}`);

      const top = document.createElement("div");
      top.className = "patch-item-top";
      const persona = document.createElement("span");
      persona.className = "persona";
      persona.textContent = personaLabels[patch.persona] || patch.persona;

      const badge = document.createElement("span");
      badge.className = "badge " + kind.cls;
      badge.textContent = kind.label;

      const name = document.createElement("p");
      name.className = "patch-name";
      name.id = "patch-name-" + patch.id;
      name.textContent = patch.barrier;

      top.append(badge, persona);
      li.append(top, name);

      const before = evidenceUrl(patch.evidence?.before);
      const after = evidenceUrl(patch.evidence?.after);
      const measurement = evidenceUrl(patch.evidence?.localMeasurement);
      if (kind.cls === "local" && measurement) {
        const link = proofLink(measurement, "View measurements");
        link.className = "measurement";
        li.append(link);
      } else if (kind.cls === "verified" && (before || after)) {
        const clips = document.createElement("div");
        clips.className = "evidence-clips";
        clips.setAttribute("aria-label", "Proof recordings");
        if (before) clips.append(evidencePlayer(before, "Before recording"));
        if (after) clips.append(evidencePlayer(after, "After recording"));
        li.append(clips);
        const links = document.createElement("div");
        links.className = "evidence-links";
        links.setAttribute("aria-label", "Open proof recordings");
        if (before) links.append(proofLink(before, "Before recording"));
        if (after) links.append(proofLink(after, "After recording"));
        li.append(links);
      }

      if (!patch.unverified && ["verified", "locally-verified"].includes(patch.status)) {
        const actions = document.createElement("div");
        actions.className = "report-actions";
        const download = document.createElement("button");
        download.type = "button";
        download.className = "ghost";
        download.textContent = "Export report";
        download.setAttribute("aria-describedby", name.id);
        const status = document.createElement("span");
        status.className = "status";
        status.setAttribute("role", "status");
        download.addEventListener("click", () => exportReport(patch, status));
        actions.append(download, status);
        li.append(actions);
      }
      els.activeList.append(li);
    }
  }

  function renderRetired(retired) {
    const items = Array.isArray(retired) ? retired : [];
    els.retiredList.replaceChildren();
    els.siteFixed.hidden = items.length === 0;
    els.retiredList.hidden = items.length === 0;
    if (!items.length) {
      els.siteFixed.textContent = "";
      return;
    }
    const noun = items.length === 1 ? "barrier" : "barriers";
    els.siteFixed.textContent = `This site now works without Curb Cut’s patch. The original ${noun} ${items.length === 1 ? "was" : "were"} fixed on the site.`;
    for (const patch of items) {
      const li = document.createElement("li");
      li.className = "patch-item";
      li.dataset.patchId = patch.id;
      const badge = document.createElement("span");
      badge.className = "badge retired";
      badge.textContent = "Site fixed";
      const name = document.createElement("p");
      name.className = "patch-name";
      name.textContent = patch.barrier;
      li.append(badge, name);
      els.retiredList.append(li);
    }
  }

  function fieldRow(term, value) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = value || "None";
    return [dt, dd];
  }

  function renderBarrierPreview() {
    const blocked = state.pendingBarrierError && !barrierReport;
    els.barrierBlocked.hidden = !blocked;
    els.barrierBlocked.textContent = blocked
      ? (state.pendingBarrierError === "sensitive-url" || state.pendingBarrierError === "sensitive-document"
        ? "This page looks authenticated or sensitive. Capture blocked."
        : "Could not capture a barrier report on this page.")
      : "";
    els.barrierPreview.hidden = !barrierReport;
    els.barrierFields.replaceChildren();
    if (!barrierReport) return;
    const focus = barrierReport.focus;
    const keys = Array.isArray(barrierReport.keys) ? barrierReport.keys.map((step) => step.key).join(", ") : "";
    els.barrierFields.append(
      ...fieldRow("Address", barrierReport.url),
      ...fieldRow("Page title", barrierReport.title),
      ...fieldRow("Focused control", focus ? [focus.role, focus.name, focus.selector].filter(Boolean).join(" · ") : "None"),
      ...fieldRow("Recent navigation keys", keys),
    );
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
    const active = state.enabled && !pagePaused ? [...page.active] : [];
    if (state.enabled && !pagePaused && page.instantPatch) active.push({ ...page.instantPatch, unverified: true });
    if (state.enabled && !pagePaused) {
      for (const named of page.liveNames || []) {
        active.push({
          id: "jev-" + named.name,
          barrier: "Named “" + named.name + "” with Jev",
          persona: "screen-reader-view",
          unverified: true,
        });
      }
    }
    const emptyMessage = !state.enabled ? "Fixes are paused on all pages." :
      pagePaused ? "Fixes are paused for this page." :
        page.available ? "No known fix for this page." : "Fixes aren’t available on this tab.";
    renderActive(active, emptyMessage);
    renderRetired(page.retired);
    const names = page.liveNames || [];
    els.liveNames.hidden = true;
    els.liveNames.textContent = names.length ? `${names.length} named by Jev · unverified` : "";
    const states = page.visualStates || [];
    els.visualState.hidden = !states.length;
    els.visualState.textContent = states.length ? `${states.length} visual states synced · unverified` : "";
    const jevReady = state.enabled && !pagePaused && page.available && !page.sensitive && !page.isFixture && pageKey?.startsWith("https://");
    els.instantPanel.hidden = state.instantEnabled !== true || !jevReady || active.length > 0;
    els.glancePanel.hidden = state.glanceEnabled !== true || !jevReady;
    els.finderPanel.hidden = state.finderEnabled !== true || !jevReady;
  }

  async function refreshPageContext() {
    const result = await chrome.runtime.sendMessage({ type: "QUERY_ACTIVE", capturedTabId, includeMatches: true });
    if (result?.url !== page.url) page.snapshot = null;
    page.available = Boolean(result?.ok);
    page.url = result?.url || result?.tab?.url || "";
    page.isFixture = Boolean(result?.isFixture);
    const listed = Array.isArray(result?.active) ? result.active : [];
    const applied = listed.filter(patch => patch.matchedRules?.length || patch.unverified);
    const known = Ext.selectActivePatches(page.url, state).filter(patch =>
      ["verified", "locally-verified"].includes(patch.status) && (patch.evidence?.before || patch.evidence?.after));
    const byId = new Map(applied.map(patch => [patch.id, patch]));
    for (const patch of known) if (!byId.has(patch.id)) byId.set(patch.id, patch);
    page.active = [...byId.values()];
    page.sensitive = Boolean(result?.sensitive);
    page.instantPatch = result?.instantPatch || null;
    page.retired = Ext.selectRetiredPatches(page.url, state);
    page.liveNames = result?.ok ? (await chrome.runtime.sendMessage({ type: "GET_LIVE_NAMES", capturedTabId }))?.names : [];
    page.visualStates = result?.ok ? (await chrome.runtime.sendMessage({ type: "GET_VISUAL_STATE", capturedTabId }))?.states : [];
  }

  async function load() {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (response && response.ok) state = response.state;
    capturedTabId = state.pendingStuck ? state.capturedTabId : undefined;
    await refreshPageContext();
    if (state.pendingStuck) {
      els.stuck.open = true;
      barrierReport = state.pendingBarrier;
      if (barrierReport) setTaskStatus("Hotkey capture ready. Review what will be sent, then save the draft.", "is-ok");
      else setTaskStatus(state.pendingBarrierError === "sensitive-url" || state.pendingBarrierError === "sensitive-document"
        ? "This page looks authenticated or sensitive. Capture blocked."
        : "Hotkey capture ready. Confirm and save your report.", state.pendingBarrierError ? "is-error" : "is-ok");
      renderBarrierPreview();
      await chrome.runtime.sendMessage({ type: "CLEAR_PENDING_STUCK" });
      state.pendingStuck = false;
      state.pendingBarrier = null;
      state.pendingBarrierError = null;
    } else renderReport(state.report);
    els.globalToggle.disabled = false;
    renderState();
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
    if (!barrierReport) {
      const captured = await chrome.runtime.sendMessage({ type: "CAPTURE_BARRIER", capturedTabId });
      if (!captured?.ok) {
        const messages = {
          "sensitive-url": "URL looks sensitive. Capture blocked.",
          "sensitive-document": "Page has password or auth fields. Capture blocked.",
          "runtime-missing": "Patch runtime is not available on this page.",
          "no-content-script": "Open a normal http(s) page and try again.",
        };
        setTaskStatus(messages[captured?.reason] || "Could not capture a barrier report.", "is-error");
        return;
      }
      barrierReport = captured.report;
      renderBarrierPreview();
    }
    const payload = {
      url: barrierReport.url || page.url,
      title: barrierReport.title || "",
      persona: els.persona.value,
      task,
      focus: barrierReport.focus,
      keys: barrierReport.keys,
    };
    const response = await chrome.runtime.sendMessage({
      type: "SUBMIT_BARRIER",
      mode,
      confirmed: true,
      payload,
    });
    if (!response || !response.ok) {
      setTaskStatus("Send failed.", "is-error");
      return;
    }
    if (mode === "download") {
      setTaskStatus(`Downloaded ${response.filename || "report file"}.`, "is-ok");
      return;
    }
    if (response.queued === "storage") {
      setTaskStatus("Local queue unreachable. Draft saved in the extension and will retry.", "is-ok");
      return;
    }
    setTaskStatus("Draft saved to the local verification queue.", "is-ok");
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

  els.glance.addEventListener("click", async () => {
    els.glance.disabled = true;
    els.glanceStatus.textContent = "Looking at the page…";
    try {
      const result = await chrome.runtime.sendMessage({ type: "RUN_GLANCE", capturedTabId });
      els.glanceStatus.textContent = result?.ok ? "Glance is on the page." : "Glance is unavailable on this page.";
    } catch {
      els.glanceStatus.textContent = "Glance is unavailable on this page.";
    } finally {
      els.glance.disabled = false;
    }
  });

  els.findService.addEventListener("click", async () => {
    els.findService.disabled = true;
    els.finderStatus.textContent = "Opening search…";
    try {
      const result = await chrome.runtime.sendMessage({ type: "RUN_FINDER", capturedTabId });
      els.finderStatus.textContent = result?.ok ? "Search is on the page." : "Find a service is unavailable on this page.";
    } catch {
      els.finderStatus.textContent = "Find a service is unavailable on this page.";
    } finally {
      els.findService.disabled = false;
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

  chrome.storage.onChanged.addListener(async ({ report, instantEnabled, glanceEnabled, finderEnabled, visualStateEnabled }, area) => {
    if (area !== "local") return;
    if (instantEnabled) state.instantEnabled = instantEnabled.newValue;
    if (glanceEnabled) state.glanceEnabled = glanceEnabled.newValue;
    if (finderEnabled) state.finderEnabled = finderEnabled.newValue;
    if (visualStateEnabled) state.visualStateEnabled = visualStateEnabled.newValue;
    if (instantEnabled || glanceEnabled || finderEnabled || visualStateEnabled) renderState();
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
