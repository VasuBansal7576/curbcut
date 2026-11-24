const mirrorRuns = new Set();

async function matchMouse(tab) {
  const id = tab?.id;
  const state = await getState();
  if (!id || !tab.active || mirrorRuns.has(id) || state.enabled === false ||
      state.matchMouseEnabled !== true || Ext.isPagePaused(tab.url, state) || !publicInstantUrl(tab.url)) return {reason:'unavailable'};
  if (mirrorRuns.has(id)) return {reason:'busy'};
  mirrorRuns.add(id);
  const target = {tabId:id};
  const send = (method, params = {}) => chrome.debugger.sendCommand(target, method, params);
  let documentId, attached, blocked = false;
  const intercept = (source, method, params) => {
    if (source.tabId !== id || method !== 'Fetch.requestPaused') return;
    if (params.resourceType !== 'Document' && ['GET','HEAD'].includes(params.request.method)) {
      void send('Fetch.continueRequest', {requestId:params.requestId}).catch(() => {});
      return;
    }
    blocked = true;
    void send('Fetch.failRequest', {requestId:params.requestId, errorReason:'Aborted'}).catch(() => {});
  };
  const call = async (op, value = null) => {
    const [result] = await chrome.scripting.executeScript({
      target:{tabId:id, documentIds:[documentId]},
      func:(op,value) => CurbCutMirror(op,value), args:[op,value],
    });
    if (result?.result === undefined) throw Error('document unavailable');
    return result.result;
  };
  const wait = () => new Promise(resolve => setTimeout(resolve, 180));
  const check = async () => {
    const current = await chrome.tabs.get(id);
    if (blocked || current.url !== tab.url || !current.active) throw Error('probe interrupted');
  };
  const move = async point => {
    await check();
    await send('Input.dispatchMouseEvent', {type:'mouseMoved', ...point});
    await wait();
  };
  const key = async (key, code) => {
    await check();
    await call('check');
    for (const type of ['rawKeyDown','keyUp']) {
      await send('Input.dispatchKeyEvent', {type,key,code:key,windowsVirtualKeyCode:code});
    }
    await wait();
  };
  const identity = node => JSON.stringify([node.selector,node.href]);
  const signature = entries => JSON.stringify(entries.map(identity).sort());
  try {
    await ensureTab(tab);
    const [injection] = await chrome.scripting.executeScript({target:{tabId:id},files:['mirror-content.js']});
    documentId = injection.documentId;
    const scope = await call('start');
    if (!scope) return {reason:'no-trigger'};
    await chrome.debugger.attach(target, '1.3');
    attached = true;
    chrome.debugger.onEvent.addListener(intercept);
    await send('Fetch.enable', {patterns:[{}]});
    const point = await call('point');
    if (!point) return {reason:'trigger-obscured'};

    const reset = async () => {
      await call('blur');
      await move({x:-1,y:-1});
      return call('snapshot');
    };
    const baseline = signature(await reset());
    const mouse = async () => {
      const before = await reset();
      if (signature(before) !== baseline) throw Error('page did not reset');
      const known = new Set(before.map(identity));
      await move(point);
      const after = await call('snapshot');
      return {after, revealed:after.filter(node => !known.has(identity(node)))};
    };
    const reference = await mouse();
    if (!reference.revealed.length || reference.revealed.length > 12) return {reason:'no-bounded-hover-outcome'};
    const known = new Set(JSON.parse(baseline));
    const keyboard = async (rules = []) => {
      if (signature(await reset()) !== baseline) throw Error('page did not reset');
      await call('focus');
      await wait();
      const reached = new Map();
      const observe = async () => {
        for (const node of await call('snapshot')) {
          if (!known.has(identity(node)) && node.focused) reached.set(identity(node),node);
        }
      };
      await observe();
      const arrowCount = rules.some(rule => rule.action === 'arrowKeyNavigation') ? reference.revealed.length : 1;
      for (let count = 0; count < arrowCount; count++) {
        await key('ArrowDown',40);
        await observe();
      }
      for (let count = 0; count <= reference.revealed.length; count++) {
        await observe();
        await key('Tab',9);
      }
      await observe();
      return signature([...reached.values()]);
    };
    const expected = signature(reference.revealed);
    if (await keyboard() === expected) return {reason:'already-matches'};

    const candidates = scope.css.map(selector => [{selector,action:'mirrorHoverToFocus'}]);
    for (const selector of scope.owners) {
      const {result} = await send('Runtime.evaluate', {expression:'document.querySelector('+JSON.stringify(selector)+')',objectGroup:'mirror'});
      if (!result?.objectId) continue;
      const {listeners} = await send('DOMDebugger.getEventListeners', {objectId:result.objectId});
      const types = new Set(listeners.map(listener => listener.type));
      for (const value of ['mouseenter','mouseover','pointerenter','pointerover']) {
        if (types.has(value)) candidates.push([{selector,action:'mirrorHoverEventToFocus',value}]);
      }
    }
    const panel = await call('widget');
    if (panel) candidates.push([{action:'toggleOnActivate',trigger:scope.selector,target:panel,mode:'display'}]);
    const arrows = {action:'arrowKeyNavigation',container:scope.owners[1],orientation:'vertical',activate:'focus',
      items:[scope.selector,...reference.revealed.map(node => node.selector)].join(',')};
    if (arrows.container && arrows.items.length <= 280) {
      candidates.push(...candidates.slice(0,3).map(rules => [...rules,arrows]));
    }

    for (const rules of candidates.slice(0,8)) {
      if (signature(await reset()) !== baseline) throw Error('page did not reset');
      const patch = {
        id:'instant-'+crypto.randomUUID(), url:new URL(tab.url).origin+new URL(tab.url).pathname, site:new URL(tab.url).hostname,
        match:new URL(tab.url).origin+new URL(tab.url).pathname,
        persona:'keyboard-only', task:'Focus the menu trigger and check that its controls appear.',
        controlTask:'Hover over the menu trigger and check that its controls appear.',
        barrier:'Hover reveals controls that the keyboard cannot reach.',
        status:'candidate', evidence:{}, history:[], rules,
        observedSelector:scope.selector, barrierClass:1,
        journey:[{selector:scope.selector,action:'focus',pointer:{action:'hover'}},
          ...(rules.some(rule => rule.action === 'toggleOnActivate') ?
            [{selector:scope.selector,action:'key',key:'ArrowDown',pointer:{action:'hover'}}] : []),
          {selector:reference.revealed[0].selector,action:'observe'}],
        outcomeChecks:reference.revealed.slice(0,4).map(({selector}) => ({selector,kind:'visible'})),
      };
      if (await call('apply',patch) && await keyboard(rules) === expected &&
          signature((await mouse()).after) === signature(reference.after)) {
        if (signature(await reset()) !== baseline) throw Error('page did not reset');
        await check();
        await queueInstant(patch,{confidence:1,model:'dom-parity'});
        await call('keep');
        return {matched:true,patch,reference:reference.revealed};
      }
      await call('revert');
    }
    return {reason:'no-match'};
  } catch (error) {
    return {reason:'interrupted',detail:String(error.message)};
  } finally {
    if (documentId) await call('end').catch(() => {});
    if (attached) await chrome.debugger.detach(target).catch(() => {});
    chrome.debugger.onEvent.removeListener(intercept);
    mirrorRuns.delete(id);
  }
}
