const repo='https://github.com/VasuBansal7576/curbcut'
const rawRoot=repo+'/raw/main/'
const criteria={
  '1.1.1':['Non-text Content','People who rely on text alternatives for images'],
  '1.4.3':['Contrast (Minimum)','People with low vision or reduced contrast sensitivity'],
  '1.4.10':['Reflow','People who use zoom or a narrow viewport'],
  '2.1.1':['Keyboard','People who navigate with a keyboard or keyboard emulation'],
  '2.1.2':['No Keyboard Trap','People who navigate with a keyboard'],
  '2.2.1':['Timing Adjustable','People who need extra time to complete a task'],
  '2.4.3':['Focus Order','People who rely on keyboard focus order'],
  '2.4.4':['Link Purpose (In Context)','People who navigate links by accessible name'],
  '2.4.7':['Focus Visible','People who need to see where keyboard focus is'],
  '3.1.1':['Language of Page','People who rely on speech synthesis to pronounce the page'],
  '4.1.2':['Name, Role, Value','People who use assistive technology to identify controls']
}
const categoryCriteria={'missing-alt':'1.1.1','empty-link':'2.4.4','empty-button':'4.1.2',
  'low-contrast':'1.4.3','missing-language':'3.1.1'}
const ruleCriteria={setAltText:'1.1.1',setLang:'3.1.1',setContrast:'1.4.3',injectCSS:'1.4.10',
  addLabel:'4.1.2',setRole:'4.1.2',restoreFocusOutline:'2.4.7',removeFocusTrap:'2.1.2',
  extendTimeout:'2.2.1',dialogBehavior:'2.4.3',toggleOnActivate:'4.1.2',listboxBehavior:'4.1.2'}
const attributes={addLabel:'aria-label',setAltText:'alt',setLang:'lang',setRole:'role',makeFocusable:'tabindex'}
const native={
  mirrorHoverToFocus:'Apply the existing hover declarations to the same selector using :focus-within as well as :hover.',
  mirrorHoverEventToFocus:'Call the existing pointer-open handler on focus and keep the menu open while focus is inside.',
  bindEnterToClick:'Use native button or link markup for this activation behavior.',
  removeFocusTrap:'Handle Escape through the close control and return focus to the opener.',
  toggleOnActivate:'Use a button that toggles the target and updates aria-expanded and aria-controls.',
  arrowKeyNavigation:'Move focus among the given items with the configured Arrow keys.',
  dialogBehavior:'Use a native dialog, with a close control and focus returned to the opener.',
  listboxBehavior:'Use a native select for the given options or implement listbox keyboard navigation.',
  extendTimeout:'Update the source timeout and give the visitor control over additional time.'
}
const line=value=>String(value).replace(/[\r\n]+/g,' ').replace(/[\\`*_{}<>\[\]]/g,'\\$&')
const attr=value=>String(value).replace(/[&"<>]/g,char=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[char]))
function code(language,value) {
  const fence='`'.repeat(Math.max(3,...[...value.matchAll(/`+/g)].map(match=>match[0].length+1)))
  return fence+language+'\n'+value+'\n'+fence
}

function source(rule) {
  if(Object.hasOwn(attributes,rule.action)) {
    const value=rule.action==='makeFocusable'?'0':rule.value
    return 'Set this attribute on the element matching '+line(rule.selector)+'.\n\n'+code('html',attributes[rule.action]+'="'+attr(value)+'"')
  }
  if(['injectCSS','setContrast','restoreFocusOutline'].includes(rule.action)) {
    const declarations=rule.action==='restoreFocusOutline'?{outline:'3px solid Highlight','outline-offset':'3px'}:rule.value
    const selector=rule.action==='restoreFocusOutline'?':is('+rule.selector+'):focus-visible':rule.selector
    return code('diff',['+ '+selector+' {',...Object.entries(declarations).map(([key,value])=>'+   '+key+': '+value+';'),'+ }'].join('\n'))
  }
  return native[rule.action]+'\n\n'+code('json',JSON.stringify(rule,null,2))
}

function evidencePath(value) {
  if(typeof value!=='string') return null
  let relative=value
  if(/^https?:/.test(value)) {
    const parsed=new URL(value)
    if(parsed.hostname==='raw.githubusercontent.com' && parsed.pathname.startsWith('/VasuBansal7576/curbcut/main/')) {
      relative=parsed.pathname.slice('/VasuBansal7576/curbcut/main/'.length)
    } else if(parsed.href.startsWith(rawRoot)) {
      relative=parsed.href.slice(rawRoot.length)
    } else if(parsed.origin==='http://127.0.0.1:4317') {
      relative=parsed.pathname.slice(1)
    } else return null
  }
  return /^(?:proof|evidence)\/[a-zA-Z0-9./_-]+$/.test(relative) && !relative.split('/').includes('..')?relative:null
}

export function createReport(patch) {
  if(!['verified','locally-verified'].includes(patch.status)) throw new Error('A verified patch is required.')
  const local=patch.status==='locally-verified'
  const entries=[...new Set(patch.rules.map(rule=>categoryCriteria[patch.evaluation?.category] ??
    (rule.action==='injectCSS' && Object.hasOwn(rule.value,'color')?'1.4.3':ruleCriteria[rule.action]??'2.1.1')))]
  const evidence=local?[['Local measurement',patch.evidence.localMeasurement]]:
    [['Kane before recording',patch.evidence.before],['Kane after recording',patch.evidence.after]]
  const references=evidence.flatMap(([label,file])=>{
    const relative=evidencePath(file)
    return relative?['- ['+label+']('+(local?repo+'/blob/main/':rawRoot)+relative+')']:[]
  })
  return ['# Accessibility repair for '+line(patch.site),'**Page** '+line(patch.match),'**Patch** '+line(patch.id),
    '## Barrier',line(patch.barrier),'## Relevant WCAG criteria',
    entries.map(id=>'- '+id+' '+criteria[id][0]).join('\n'),'## Who it blocks',
    entries.map(id=>'- '+criteria[id][1]).join('\n'),'## Source change',...patch.rules.map(source),
    '## Verification',local?'Local proof (Chromium measurement).':'Kane task replay.',references.join('\n')].filter(Boolean).join('\n\n')+'\n'
}
