import {readFileSync} from 'node:fs'

export const shopRules = JSON.parse(readFileSync(new URL('../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/agent-answer.txt',import.meta.url))).rules
const buy = [824,869,109,44], shipping = [448,951,145,44], receipt = [441,945,248,29]
const about = [1080,89,76,27], dhe = [474,239,622,48], cscTitle = [674,221,514,37]
const stage = (headline,asset,focus,callout,options={})=>({headline,asset,focus,callout,...options})
const nav = (headline,asset,focus,options={})=>({headline,asset,focus,nav:true,...options})
export const states = {
  browse:stage('Shopping.','001bf033-1'),
  keyboard:stage('Keyboard only.','001bf033-5','element','Headphones'),
  tab:stage('Press Tab.','001bf033-7',[807,454,80,44],'Search'),
  skipped:stage('Skipped.','001bf033-8',shipping,'Shipping details',{fail:true,cross:buy}),
  cannot:stage('Can’t buy.','001bf033-9',shipping,'Shipping details',{fail:true,cross:buy}),
  lane1:stage('Test the task.','001bf033-5','element','Headphones',{lane:1}),
  fails:stage('It fails.','001bf033-9',shipping,'Shipping details',{lane:1,fail:true,cross:buy}),
  mouse:stage('Mouse control.','f1123b3e-5','element','Add to cart',{lane:1}),
  works:stage('It works.','f1123b3e-6',receipt,'Field Headphones added to cart',{lane:1,pass:true}),
  broken:stage('Broken for keyboard users.','001bf033-9',shipping,'Shipping details',{lane:1,fail:true,cross:buy}),
  lane3:stage('Replay the task.','f86e31e4-8',[807,454,80,44],'Search',{lane:3}),
  reaches:stage('Button in focus.','f86e31e4-9',buy,'Add to cart',{lane:3}),
  press:stage('Press the key.','f86e31e4-9',buy,'Add to cart',{lane:3}),
  enter:stage('Enter.','f86e31e4-9',buy,'Add to cart',{lane:3}),
  cart:stage('In the cart.','f86e31e4-10',receipt,'Field Headphones added to cart',{lane:3,pass:true}),
  proof:stage('Recorded proof.','f86e31e4-11',receipt,'Field Headphones added to cart',{lane:3,pass:true}),
  lane4:stage('Share the fix.','mass-off-0',null,null,{lane:4,panel:'switch-off'}),
  everyone:stage('For everyone.','mass-off-0',null,null,{lane:4,panel:'switch-on',pass:true}),
  sharedPage:stage('The hard barriers.','mass-off-0'),
  hard:nav('The hard barriers.','mass-nav-home'),
  menus:nav('Hover-only menus.','mass-off-5'),
  site:nav('Mass.edu','mass-off-5'),
  aboutOff:nav('Tab to About.','mass-off-10','rect'),
  closed:nav('Menu stays shut.','mass-off-11','rect',{fail:true}),
  invisible:nav('Submenu links skipped.','mass-off-12','rect',{fail:true}),
  repaired:nav('Repairs on.','mass-on-10','rect'),
  opened:nav('Menu open.','mass-on-11','trigger',{pass:true}),
  link:nav('Tab to The DHE.','mass-on-12','rect',{pass:true}),
  arrived:nav('Destination reached.','mass-on-13','heading',{pass:true}),
  both:nav('Kane replays it.','efcfdd9f-12',[1080,127,76,27],{detail:'mass-off-11'}),
  before:nav('Without the fix.','efcfdd9f-12',[1080,127,76,27],{detail:'mass-off-11',fail:true}),
  failed:nav('Journey failed.','efcfdd9f-13',about,{detail:'mass-off-11',fail:true}),
  withFix:nav('With the fix.','cb96e3af-13',[1083,161,144,26],{detail:'mass-on-12'}),
  reached:nav('Page reached.','cb96e3af-17',dhe,{detail:'mass-on-13',pass:true}),
  csc:nav('CSC.gov.in','csc-off-8','rect'),
  cscAbout:nav('Tab to ABOUT.','csc-off-9','rect'),
  cscFail:nav('Keyboard blocked.','ad931ab3-13',[480,136,72,23],{detail:'csc-off-9',fail:true}),
  cscOpen:nav('Keyboard opens it.','csc-on-9','trigger',{pass:true}),
  meity:nav('About MeitY.','csc-on-10','rect',{pass:true}),
  ministry:nav('Destination verified.','ebcd0a03-18',cscTitle,{detail:'csc-on-11',pass:true}),
  reader:stage('Screen reader.','7c5102a9-2',[96,601,155,30],'(unnamed)'),
  unnamed:stage('No accessible name.','7c5102a9-2',[96,601,155,30],'(unnamed)',{fail:true}),
  named:stage('Sites search.','9aeb5f1b-2','element','Sites search',{pass:true}),
  clipped:stage('Text cut off.','zoom-off',null,null,{inset:'5e97e502-3',fail:true}),
  wraps:stage('Text wraps.','zoom-on',null,null,{inset:'8d678131-3',pass:true}),
  swatch:stage('ColorHexa.','3c57743a-4',[490,181,34,34],'Colour picker',{fail:true}),
  stuck:stage('“I’m stuck.”','3c57743a-4',[490,181,34,34],'Colour picker',{panel:'report-form'}),
  sent:stage('Report sent.','3c57743a-4',[490,181,34,34],'Colour picker',{panel:'report-sent'}),
  picker:stage('Picker open.','cbcbc771-5',[485,178,245,236],'Colour picker',{pass:true}),
  wormsSite:stage('World Register of Marine Species','5fc7e627-23'),
  wormsSkip:stage('Tools skipped','5fc7e627-23',[1651,150,95,49],'Tools'),
  wormsFail:stage('FAIL','5fc7e627-23',[1651,150,95,49],'Tools',{fail:true}),
  wormsPass:stage('PASS','eb14dcd6-24',[1587,201,157,32],'Match taxa',{pass:true}),
  recheck:stage('Nightly recheck.','958f7f45-9',[1345,869,111,44],'Add to cart'),
  native:stage('Site fixed itself.','958f7f45-12',receipt,'Field Headphones added to cart',{pass:true}),
  retire:stage('Retired.','958f7f45-12',receipt,'Field Headphones added to cart',{retire:true}),
  peel:stage('Patch removed.','958f7f45-12',receipt,'Field Headphones added to cart',{peel:true})
}
export const initial = {
  shopping:'browse',skip:'keyboard',test:'keyboard',control:'fails',prove:'keyboard',share:'sharedPage',
  'mass-off':'site','mass-on':'closed','mass-proof':'arrived',csc:'csc',reader:'reader',zoom:'clipped',swatch:'swatch',
  worms:'wormsSite',retire:'native','teaser-before':'site','teaser-after':'closed'
}
export const events = {
  shopping:[['keyboard','keyboard']],
  skip:[['Tab','tab'],['skipped','skipped'],["can't",'cannot']],
  scale:[['2026','count'],['95.9','percent']],
  title:[['Curb Cut','logo']],
  test:[['Step one','lane1'],['fails','fails']],
  control:[['mouse','mouse'],['works','works'],['broken','broken']],
  rules:[['Step two','lane2'],['rules','rules'],['reachable','focusRule'],['Enter','enterRule']],
  prove:[['Step three','lane3'],['reaches','reaches'],['presses','press'],['Enter','enter'],['cart','cart'],['proof','proof']],
  share:[['Step four','lane4'],['everyone','everyone']],
  'mass-off':[['hard','hard'],['menus','menus'],['mass.edu','site'],['reaches About','aboutOff'],['never','closed'],['invisible','invisible']],
  'mass-on':[['Curb Cut','repaired'],['same keys','opened'],['every link','link'],['Enter','arrived']],
  'mass-proof':[['Kane','both'],['without','before'],['failed','failed'],['with','withFix'],['reached','reached']],
  csc:[['csc.gov.in','csc'],['ABOUT','cscAbout'],['blocked','cscFail'],['Now','cscOpen'],['opens','meity'],['MeitY','ministry']],
  reader:[['Screen reader','reader'],['unnamed','unnamed'],['Sites search','named']],
  zoom:[['zoom','clipped'],['wraps','wraps']],
  swatch:[['ColorHexa','swatch'],["I'm stuck",'stuck'],['reports','sent'],['verifies','picker']],
  results:[['2,050','sample'],['142','barriers'],['99','fixed'],['51','hardCount'],['menus','menusCount'],['expanding','panelsCount'],['tabs','tabsCount'],['pop-ups','modalsCount']],
  worms:[['Tools','wormsSkip'],['failed','wormsFail'],['passed','wormsPass']],
  verified:[['Kane','gate'],['43','shipped'],['live','published']],
  retire:[['Every night','recheck'],['website','native'],['retires','retire'],['unnecessary','peel']],
  close:[['Curb Cut','logo']],
  'teaser-before':[['mass.edu','site'],['Tab','tabToAbout'],['shut','closed']],
  'teaser-after':[['Curb Cut','repaired'],['opens','opened'],['Enter','arrived']],
  'teaser-title':[['Curb Cut','logo']]
}
states.tabToAbout=states.aboutOff
export const still = {
 shopping:'keyboard',skip:'skipped',scale:'percent',title:'logo',test:'fails',control:'works',rules:'focusRule',prove:'cart',share:'everyone',
 'mass-off':'closed','mass-on':'link','mass-proof':'reached',csc:'meity',reader:'named',zoom:'wraps',swatch:'picker',results:'modalsCount',worms:'wormsPass',
 verified:'published',retire:'retire',close:'logo','teaser-before':'closed','teaser-after':'opened','teaser-title':'logo'
}
