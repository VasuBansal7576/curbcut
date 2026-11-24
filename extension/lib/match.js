(() => {
  const root = globalThis.CurbCutExt || (globalThis.CurbCutExt = {});

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function patternToRegExp(pattern) {
    const source = String(pattern)
      .split("*")
      .map(escapeRegex)
      .join(".*");
    return new RegExp(`^${source}$`, "i");
  }

  function matchUrlPattern(pattern, url) {
    if (typeof pattern !== "string" || !pattern || typeof url !== "string" || !url) {
      return false;
    }
    try {
      return patternToRegExp(pattern).test(url);
    } catch {
      return false;
    }
  }

  function matchPatch(patch, url) {
    if (globalThis.CurbCut && typeof globalThis.CurbCut.match === "function") {
      try {
        return Boolean(globalThis.CurbCut.match(patch, url));
      } catch {
        return false;
      }
    }
    return matchUrlPattern(patch && patch.match, url);
  }

  function isFixtureShopUrl(url) {
    try {
      const parsed = new URL(url);
      return (
        parsed.origin === root.FIXTURE_ORIGIN &&
        parsed.pathname.startsWith(root.FIXTURE_PREFIX)
      );
    } catch {
      return false;
    }
  }

  root.matchPatch = matchPatch;
  root.isFixtureShopUrl = isFixtureShopUrl;
})();
