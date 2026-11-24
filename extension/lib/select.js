(() => {
  const root = globalThis.CurbCutExt || (globalThis.CurbCutExt = {});

  function selectActivePatches(url, state) {
    if (!state || state.enabled === false) return [];
    if (typeof url !== "string" || !url) return [];

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

  function evidenceHref(path) {
    if (!path || typeof path !== "string") return null;
    try {
      const link = new URL(path, root.EVIDENCE_BASE);
      return ["https:", "http:"].includes(link.protocol) ? link.href : null;
    } catch { return null; }
  }

  root.selectActivePatches = selectActivePatches;
  root.evidenceHref = evidenceHref;
})();
