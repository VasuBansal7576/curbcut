(() => {
  const root = globalThis.CurbCutExt || (globalThis.CurbCutExt = {});

  const SENSITIVE_PATH =
    /\/(login|signin|sign-in|signup|sign-up|register|account|checkout|payment|billing|auth|oauth|password|reset-password|wallet)(\/|$)/i;

  function urlLooksSensitive(url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return true;
      if ([...parsed.searchParams.keys()].some(name => /token|session|password|secret|api[_-]?key|access[_-]?code/i.test(name))) return true;
      if (SENSITIVE_PATH.test(parsed.pathname)) return true;
      return false;
    } catch {
      return true;
    }
  }

  function documentLooksSensitive(doc) {
    if (!doc || !doc.querySelector) return true;
    const password = doc.querySelector('input[type="password"]');
    if (password) return true;
    const authForm = doc.querySelector(
      'form[action*="login" i], form[action*="signin" i], form[action*="auth" i], form[action*="checkout" i], form[action*="payment" i]'
    );
    if (authForm) return true;
    const autocomplete = doc.querySelector(
      'input[autocomplete="current-password"], input[autocomplete="new-password"], input[autocomplete="cc-number"]'
    );
    if (autocomplete) return true;
    return false;
  }

  function canCapturePage(url, doc) {
    if (urlLooksSensitive(url)) {
      return { ok: false, reason: "sensitive-url" };
    }
    if (documentLooksSensitive(doc)) {
      return { ok: false, reason: "sensitive-document" };
    }
    return { ok: true };
  }

  root.urlLooksSensitive = urlLooksSensitive;
  root.documentLooksSensitive = documentLooksSensitive;
  root.canCapturePage = canCapturePage;
})();
