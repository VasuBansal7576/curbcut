import {readFileSync} from 'node:fs'
import {study} from './study.mjs'
export {study}
export const shopRules=JSON.parse(readFileSync(new URL('../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/agent-answer.txt',import.meta.url))).rules
const stage=(headline,asset,focus,callout,extra={})=>({headline,asset,focus,callout,...extra})
const nav=(headline,asset,focus,extra={})=>({headline,asset,focus,nav:true,...extra})
const buy=[824,869,109,44],shipping=[448,951,145,44],receipt=[441,945,248,29]
export const states={
  browse:stage('Stillroom Supply','001bf033-1'),
  keyboard:stage('Keyboard only','001bf033-5','element','Search field'),
  tab:stage('Tab to the next control','001bf033-7',[807,454,80,44],'Search'),
  skipped:stage('Add to cart skipped','001bf033-8',shipping,'Shipping details',{cross:buy,fail:true}),
  cannot:stage('Purchase blocked','001bf033-9',shipping,'Shipping details',{cross:buy,fail:true}),
  lane1:stage('Try the keyboard journey','001bf033-5','element','Search field'),
  fails:stage('Keyboard test failed','001bf033-9',shipping,'Shipping details',{fail:true,cross:buy}),
  mouse:stage('Try the pointer','f1123b3e-5','element','Add to cart'),
  works:stage('Headphones added','f1123b3e-6',receipt,'Cart confirmation',{pass:true}),
  broken:stage('Keyboard barrier confirmed','001bf033-9',shipping,'Shipping details',{fail:true,cross:buy}),
  lane2:stage('Write the repair','f86e31e4-9',buy,'Add to cart'),
  rules:stage('Four declarative rules','f86e31e4-9',buy,null,{rule:true}),
  lane3:stage('Replay with the fix','f86e31e4-9',buy,'Add to cart'),
  cart:stage('Keyboard test passed','f86e31e4-10',receipt,'Cart confirmation',{pass:true}),
  proof:stage('Recorded replay','f86e31e4-11',receipt,'Cart confirmation',{pass:true}),
  lane4:stage('Distribute the repair','mass-off-0',null,null,{panel:'switch-off'}),
  everyone:stage('Fixes enabled','mass-off-0',null,null,{panel:'switch-on'}),
  site:nav('Mass.edu','mass-off-5'),
  aboutOff:nav('Tab to About.','mass-off-10','rect'),
  closed:nav('Menu stays shut.','mass-off-11','rect',{fail:true}),
  repaired:nav('Repairs on.','mass-on-10','rect'),
  opened:nav('Menu open.','mass-on-11','trigger',{pass:true}),
  link:nav('Tab to The DHE.','mass-on-12','rect',{pass:true}),
  arrived:nav('Destination reached.','mass-on-13','heading',{pass:true}),
  massFail:nav('Menu stays shut','efcfdd9f-13',[1080,89,76,27],{detail:'mass-off-11',fail:true}),
  massPass:nav('Destination reached','cb96e3af-17',[474,239,622,48],{detail:'mass-on-13',pass:true}),
  archive:stage('Find the named button','munich-off'),
  noName:stage('Accessible name missing','reader-off','rect','button · (unnamed)',{fail:true}),
  named:stage('Previous slide','reader-on','rect','Vorherige Folie',{pass:true}),
  witness:stage('Kane found the named row','munich-on','element','Vorherige Folie',{pass:true}),
  absent:stage('Baseline search failed','munich-off',null,'Named row absent',{fail:true}),
  faint:stage('Below the AA threshold','contrast-off','rect',null,{meter:true,fail:true}),
  nudge:stage('Adjust the text colour','contrast-on','rect',null,{meter:true}),
  measured:stage('AA threshold reached','contrast-on','rect',null,{meter:true,pass:true}),
  experiment:stage('Live naming experiment','jev-off','rect',null),
  pair:stage('Two unnamed buttons','jev-off','rect','button · (unnamed)'),
  labels:stage('Two live names','jev-on','rect','Menú  /  Buscar'),
  precision:stage('Names checked on real sites','jev-on','rect',null,{precision:true}),
  quiet:stage('Abstain when uncertain','jev-on','rect',null,{precision:true}),
  popup:stage('Fixes on this page','owner-report',null,null,{panel:'popup-multiple-fixes',owner:true}),
  export:stage('Send fix to site owner','owner-report',null,null,{panel:'popup-proof-and-report',owner:true}),
  change:stage('Source change','owner-report','rect',null,{owner:true}),
  recording:stage('Before and after recordings','owner-report',null,null,{owner:true}),
  native:stage('Native repair passes','958f7f45-12',receipt,'Cart confirmation',{pass:true}),
  retire:stage('Patch retired','958f7f45-12',receipt,'Cart confirmation',{pass:true})
}
states.tabToAbout=states.aboutOff
export const initial={shopping:'browse',skip:'keyboard',test:'keyboard',control:'fails',rules:'lane2',prove:'lane1',share:'lane4','mass-off':'site','mass-on':'closed',names:'archive',contrast:'faint',jev:'experiment',owner:'popup','teaser-before':'site','teaser-after':'closed'}
export const events={
 shopping:[['keyboard','keyboard']],skip:[['Tab','tab'],['skipped','skipped'],["can't",'cannot']],
 scale:[['2026','count'],['95.9','percent'],['six','sixTypes']],title:[['Curb Cut','logo']],
 test:[['Step one','lane1'],['fails','fails']],control:[['mouse','mouse'],['works','works'],['broken','broken']],
 rules:[['Step two','lane2'],['rules','rules']],prove:[['Step three','lane3'],['passes','cart'],['proof','proof']],
 share:[['Step four','lane4'],['everyone','everyone']],
 'mass-off':[['mass.edu','site'],['About','aboutOff'],['never','massFail']],
 'mass-on':[['Curb Cut','repaired'],['open','opened'],['menu','link'],['Enter','massPass']],
 names:[['blind','archive'],['no name','noName'],['previous slide','named'],['found','witness'],["couldn't",'absent']],
 contrast:[['faint','faint'],['nudges','nudge'],['measures','measured']],
 jev:[['experiment','experiment'],['unlabelled','pair'],['live','labels'],['13','precision'],['quiet','quiet']],
 results:[['locked','freeze'],['2,050','sample'],['99','fixed'],['51','hardCount']],
 six:[['400','sample6'],['five','categories'],['76','fixed6']],
 verified:[['random','samples'],['11','v5'],['7','v6'],['why','limits'],['105','inventory'],['61','shipped']],
 owner:[['every fix','popup'],['site owner','export'],['exact change','change'],['recording','recording'],['website','native'],['retires','retire']],
 close:[['Curb Cut','logo']],
 'teaser-before':[['mass.edu','site'],['Tab','tabToAbout'],['shut','closed']],
 'teaser-after':[['Curb Cut','repaired'],['opens','opened'],['Enter','arrived']],
 'teaser-title':[['Curb Cut','logo']]
}
export const still={shopping:'keyboard',skip:'skipped',scale:'percent',title:'logo',test:'fails',control:'works',rules:'rules',prove:'cart',share:'everyone','mass-off':'massFail','mass-on':'massPass',names:'named',contrast:'measured',jev:'precision',results:'hardCount',six:'fixed6',verified:'shipped',owner:'export',close:'logo','teaser-before':'closed','teaser-after':'opened','teaser-title':'logo'}
