(() => {
  const root = globalThis.CurbCutExt || (globalThis.CurbCutExt = {});

  function pageKey(url) {
    try {
      const parsed = new URL(url);
      if (["https:", "http:"].includes(parsed.protocol)) return parsed.origin + parsed.pathname;
    } catch {}
    return null;
  }

  function isPagePaused(url, state) {
    return Array.isArray(state.pausedPages) && state.pausedPages.includes(pageKey(url));
  }

  function selectActivePatches(url, state) {
    if (!state || state.enabled === false) return [];
    if (!url || isPagePaused(url, state)) return [];

    const verified = root
      .sanitizePatchArray(state.patches, { statuses: ["verified", "locally-verified"] })
      .filter((patch) => root.matchPatch(patch, url))
      .map((patch) => ({
        ...patch,
        unverified: false,
        label: patch.id,
      }));

    if (!root.isFixtureShopUrl(url) || !state.fixturePreview) {
      return verified;
    }

    const demos = root
      .sanitizePatchArray(state.demoPatches, { statuses: ["candidate"] })
      .filter((patch) => root.matchPatch(patch, url))
      .map((patch) => ({
        ...patch,
        unverified: true,
        label: patch.id,
      }));

    return root.mergeById(verified, demos).map((patch) => {
      if (patch.unverified === true) return patch;
      if (patch.status === "candidate") {
        return { ...patch, unverified: true };
      }
      return { ...patch, unverified: false };
    });
  }

  function selectRetiredPatches(url, state) {
    if (!state || !url) return [];
    return root
      .sanitizePatchArray(state.patches, { statuses: ["retired"] })
      .filter((patch) => root.matchPatch(patch, url));
  }

  function evidenceHref(path, base) {
    if (!path || typeof path !== "string") return null;
    const origin = typeof base === "string" && base.trim() ? base.trim() : root.EVIDENCE_BASE;
    try {
      const link = new URL(path, origin.endsWith("/") ? origin : origin + "/");
      return ["https:", "http:"].includes(link.protocol) ? link.href : null;
    } catch { return null; }
  }

  root.pageKey = pageKey;
  root.isPagePaused = isPagePaused;
  root.selectActivePatches = selectActivePatches;
  root.selectRetiredPatches = selectRetiredPatches;
  root.evidenceHref = evidenceHref;
})();
