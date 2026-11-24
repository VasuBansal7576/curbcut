(() => {
  const root = globalThis.CurbCutExt || (globalThis.CurbCutExt = {});

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  const widgetSelectors = {
    toggleOnActivate: ["trigger", "target"],
    arrowKeyNavigation: ["container", "items"],
    dialogBehavior: ["dialog"],
    listboxBehavior: ["trigger", "list", "options"],
  };

  function validateRule(rule) {
    if (!isPlainObject(rule)) return false;
    if (!root.ALLOWED_ACTIONS.includes(rule.action)) return false;
    const selectors = widgetSelectors[rule.action] || ["selector"];
    if (!selectors.every((key) => isNonEmptyString(rule[key]))) return false;
    if ("value" in rule) {
      const value = rule.value;
      const ok =
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        isPlainObject(value) ||
        Array.isArray(value) ||
        value === null;
      if (!ok) return false;
    }
    return true;
  }

  function validateEvidence(evidence) {
    if (evidence == null) return true;
    if (!isPlainObject(evidence)) return false;
    for (const key of ["before", "after", "verifiedAt"]) {
      if (key in evidence && evidence[key] != null && typeof evidence[key] !== "string") {
        return false;
      }
    }
    if ("kaneRunIds" in evidence && evidence.kaneRunIds != null) {
      if (!Array.isArray(evidence.kaneRunIds)) return false;
      if (!evidence.kaneRunIds.every((id) => typeof id === "string")) return false;
    }
    return true;
  }

  function validatePatch(patch) {
    if (!isPlainObject(patch)) return { ok: false, reason: "not-object" };
    if (!isNonEmptyString(patch.id)) return { ok: false, reason: "id" };
    if (!isNonEmptyString(patch.site)) return { ok: false, reason: "site" };
    if (!isNonEmptyString(patch.match)) return { ok: false, reason: "match" };
    if (!root.ALLOWED_PERSONAS.includes(patch.persona)) {
      return { ok: false, reason: "persona" };
    }
    if (!isNonEmptyString(patch.task)) return { ok: false, reason: "task" };
    if (!isNonEmptyString(patch.barrier)) return { ok: false, reason: "barrier" };
    if (!Array.isArray(patch.rules) || patch.rules.length === 0) {
      return { ok: false, reason: "rules" };
    }
    if (!patch.rules.every(validateRule)) return { ok: false, reason: "rule" };
    if (!root.ALLOWED_STATUSES.includes(patch.status)) {
      return { ok: false, reason: "status" };
    }
    if (!validateEvidence(patch.evidence)) return { ok: false, reason: "evidence" };
    if ("history" in patch && patch.history != null && !Array.isArray(patch.history)) {
      return { ok: false, reason: "history" };
    }
    return { ok: true, patch };
  }

  function sanitizePatchArray(input, { statuses } = {}) {
    if (!Array.isArray(input)) return [];
    const allowed = Array.isArray(statuses) ? new Set(statuses) : null;
    const out = [];
    const seen = new Set();
    for (const item of input) {
      const result = validatePatch(item);
      if (!result.ok) continue;
      if (allowed && !allowed.has(result.patch.status)) continue;
      if (seen.has(result.patch.id)) continue;
      seen.add(result.patch.id);
      out.push(result.patch);
    }
    return out;
  }

  function mergeById(...lists) {
    const map = new Map();
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const patch of list) {
        if (!patch || !patch.id) continue;
        map.set(patch.id, patch);
      }
    }
    return Array.from(map.values());
  }

  function toEnginePatch(patch) {
    if (!isPlainObject(patch)) return null;
    const engine = {
      id: patch.id,
      site: patch.site,
      match: patch.match,
      persona: patch.persona,
      task: patch.task,
      barrier: patch.barrier,
      rules: patch.rules,
      status: patch.status,
    };
    if ("evidence" in patch) engine.evidence = patch.evidence;
    if ("evaluation" in patch) engine.evaluation = patch.evaluation;
    if ("observedSelector" in patch) engine.observedSelector = patch.observedSelector;
    if ("history" in patch) engine.history = patch.history;
    const checked = validatePatch(engine);
    return checked.ok ? checked.patch : null;
  }

  root.validatePatch = validatePatch;
  root.sanitizePatchArray = sanitizePatchArray;
  root.mergeById = mergeById;
  root.toEnginePatch = toEnginePatch;
})();
