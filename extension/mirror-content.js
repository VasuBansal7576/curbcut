(() => {
  if (globalThis.CurbCutMirror) return;
  const controls = 'a[href],button,input,select,textarea,summary,[role=menuitem],[role=button],[tabindex]';
  const visible = node => node.checkVisibility({
    visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true,
  }) && !node.closest('[inert],[aria-hidden=true]');
  let run, winner;

  function notice(text) {
    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;bottom:18px;right:18px;z-index:2147483647;pointer-events:none';
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.style.cssText = 'display:block;background:#111214;color:#fff;border-top:3px solid #ffce1f;padding:10px;font:600 15px system-ui';
    status.textContent = text;
    host.attachShadow({mode:'closed'}).append(status);
    document.documentElement.append(host);
    return host;
  }

  function undo() {
    if (!winner) return false;
    winner.cleanup();
    winner.badge.remove();
    winner = null;
    return true;
  }

  function end() {
    if (!run) return;
    const previous = run;
    run = null;
    clearTimeout(previous.timer);
    previous.cleanup?.();
    if (location.href === previous.url) {
      previous.focus.focus({preventScroll:true});
      scrollTo({left:previous.x,top:previous.y,behavior:'instant'});
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.matchMouseEnabled?.newValue === false || changes.enabled?.newValue === false)) {
      end();
      undo();
    }
  });

  window.addEventListener('pagehide', () => { end(); undo(); });
  navigation.addEventListener('currententrychange', () => { end(); undo(); });
  navigation.addEventListener('navigate', event => {
    if (!run) return;
    run.aborted = true;
    if (event.cancelable) event.preventDefault();
  });
  for (const type of ['submit', 'click', 'auxclick']) {
    window.addEventListener(type, event => {
      if (!run) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      run.aborted = true;
    }, true);
  }
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !event.isTrusted) return;
    if (run) run.aborted = true;
    else if (!undo()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  function select(node) {
    const selector = CurbCut.exactSelector(node);
    const found = document.querySelectorAll(selector);
    return selector.length <= 280 && found.length === 1 && found[0] === node ? selector : null;
  }

  globalThis.CurbCutMirror = (op, value) => {
    if (op === 'start') {
      if (run || winner || !CurbCutExt.canCapturePage(location.href, document).ok ||
          !CurbCut.instantPrivacy()) return null;
      const focus = document.activeElement;
      const trigger = focus.closest(controls) ?? focus.closest('li,nav')?.querySelector(controls);
      if (!trigger || !visible(trigger) || trigger.tabIndex < 0 ||
          trigger.matches('input,textarea,select,[contenteditable]')) return null;
      const selector = select(trigger);
      const owners = [];
      for (let node = trigger; node && node !== document.body && owners.length < 5; node = node.parentElement) {
        const scope = select(node);
        if (!scope) break;
        owners.push(scope);
      }
      if (!selector) return null;
      run = {focus, trigger, url:location.href, x:scrollX, y:scrollY, timer:setTimeout(end, 20000)};
      return {selector, owners, css:owners.filter(scope => CurbCut.observedHoverRules([scope]).length)};
    }
    if (op === 'end') { end(); return true; }
    if (!run || run.aborted || run.url !== location.href || !run.trigger.isConnected) throw Error('probe interrupted');
    if (op === 'blur') {
      document.activeElement.blur();
      scrollTo({left:run.x,top:run.y,behavior:'instant'});
    }
    if (op === 'focus') run.trigger.focus({preventScroll:true});
    if (op === 'point') {
      const box = run.trigger.getBoundingClientRect();
      const x = Math.round(box.left + box.width / 2);
      const y = Math.round(box.top + box.height / 2);
      return run.trigger.contains(document.elementFromPoint(x,y)) ? {x,y} : null;
    }
    if (op === 'snapshot') {
      const entries = [];
      for (const node of document.querySelectorAll(controls)) {
        if (!visible(node) || node.matches(':disabled,[aria-disabled=true]')) continue;
        const selector = select(node);
        if (!selector) throw Error('ambiguous control');
        entries.push({selector, href:node.matches('a[href]') ? node.href : '', focused:node === document.activeElement});
      }
      return entries;
    }
    if (op === 'widget') {
      const id = run.trigger.getAttribute('aria-controls');
      const panel = id && document.getElementById(id);
      return panel && select(panel);
    }
    if (op === 'revert') {
      run.cleanup?.();
      run.cleanup = null;
    }
    if (op === 'apply') {
      const matched = new Set();
      run.cleanup = CurbCut.apply(value, index => matched.add(index));
      return matched.size === value.rules.length;
    }
    if (op === 'keep') {
      winner = {cleanup:run.cleanup, badge:notice('Matches mouse · unverified')};
      run.cleanup = null;
      end();
      return true;
    }
    return true;
  };
})();
