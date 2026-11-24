import { writeFileSync } from 'node:fs'

const string = {type:'string',minLength:1,maxLength:240}
const selector = {...string,maxLength:280}
const css = Object.fromEntries(Object.entries({
  display:['block','inline-block','flex','grid','contents'],
  'flex-wrap':['wrap','wrap-reverse'], 'flex-direction':['column','row'],
  'grid-template-columns':['1fr','minmax(0, 1fr)','100%'],
  width:['auto','100%','fit-content'], 'min-width':['0','0px','auto'], 'max-width':['100%','none'],
  'white-space':['normal','pre-wrap'], 'overflow-wrap':['anywhere','break-word'],
  height:['auto'], 'max-height':['none'], 'box-sizing':['border-box'],
  color:['#000','#111','#222','#fff','CanvasText'], 'background-color':['#fff','#000','Canvas']
}).map(([property,values])=>[property,{enum:values}]))
const actions={
  makeFocusable:null, bindEnterToClick:null, restoreFocusOutline:null, removeFocusTrap:null,
  mirrorHoverEventToFocus:{enum:['mouseenter','mouseover','pointerenter','pointerover']},
  addLabel:string, setAltText:string, setLang:{type:'string',pattern:'^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$'},
  setRole:{enum:['button','link','navigation','main','search','region','heading','status','alert','dialog','checkbox','tab']},
  extendTimeout:{type:'integer',minimum:1000,maximum:3600000},
  injectCSS:{type:'object',properties:css,additionalProperties:false,minProperties:1}
}
const choice=(...values)=>({enum:values})
const object=(properties,required)=>({type:'object',properties,required,additionalProperties:false})
const widgets={
  toggleOnActivate:object({trigger:selector,target:selector,mode:choice('attribute','class','display'),
    className:{type:'string',pattern:'^-?[_a-zA-Z][_a-zA-Z0-9-]{0,119}$'},display:css.display},['trigger','target','mode']),
  arrowKeyNavigation:object({container:selector,items:selector,orientation:choice('horizontal','vertical','both'),
    activate:choice('focus','click')},['container','items','orientation','activate']),
  dialogBehavior:object({dialog:selector,opener:selector,close:selector},['dialog']),
  listboxBehavior:object({trigger:selector,list:selector,options:selector},['trigger','list','options'])
}
widgets.toggleOnActivate.allOf=[
  {if:{properties:{mode:{const:'class'}}},then:{required:['className']},else:{not:{required:['className']}}},
  {if:{properties:{mode:{const:'display'}}},else:{not:{required:['display']}}}
]
const rule={oneOf:[
  ...Object.entries({...actions,mirrorHoverToFocus:null}).map(([action,value])=>
    object({selector,action:{const:action},...(value?{value}:{})},value?['selector','action','value']:['selector','action'])),
  ...Object.entries(widgets).map(([action,widget])=>({...widget,properties:{action:{const:action},...widget.properties},required:['action',...widget.required]}))
]}
const journeyKey=choice('ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter','Space','Escape','Tab','Shift+Tab')
const pointerStep=object({selector,action:choice('click','hover')},['action'])
const readerTarget=object({role:string,name:string},['role','name'])
const outcome=object({selector,kind:choice('text','contains','value','visible','fits-width','url-path','expanded','hidden','focused','selected'),equals:{type:'string',maxLength:240}},['kind'])
const outcomes={type:'array',minItems:1,maxItems:4,items:outcome}
const journeyStep=object({selector,action:choice('activate','focus','key','observe'),key:journeyKey,pointer:pointerStep,reader:readerTarget,checks:outcomes},['selector','action'])
journeyStep.allOf=[
  {if:{properties:{action:{const:'key'}}},then:{required:['key','pointer']},else:{not:{required:['key']}}},
  {if:{properties:{action:{const:'focus'}}},then:{required:['pointer']}}
]
const schema={type:'object',additionalProperties:false,required:['id','site','match','persona','task','barrier','rules','status','evidence','history'],properties:{
 id:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{0,95}$'},site:string,match:{...string,maxLength:1000},persona:{enum:['keyboard-only','screen-reader-view','low-vision','color-blind']},
 task:{...string,maxLength:1400},barrier:{...string,maxLength:1400},rules:{type:'array',minItems:1,maxItems:24,items:rule},status:{enum:['candidate','verified','retired','broken']},
 evidence:{type:'object',additionalProperties:false,properties:{before:string,after:string,control:string,verifiedAt:string,kaneRunIds:{type:'array',items:string},kaneVerdicts:{type:'object',additionalProperties:false,properties:{before:{enum:['pass','fail','inconclusive','blocked']},control:{enum:['pass','fail','inconclusive','blocked']},after:{enum:['pass','fail','inconclusive','blocked']}}},localOracle:{type:'object',additionalProperties:false,properties:{before:{enum:['pass','fail','inconclusive','blocked']},control:{enum:['pass','fail','inconclusive','blocked']},after:{enum:['pass','fail','inconclusive','blocked']}}}}},
 history:{type:'array',items:{type:'object'}},
 url:{...string,maxLength:1000},controlTask:{...string,maxLength:1400},observedSelector:selector,successSelector:selector,requiredName:string,
 minimumTabPresses:{type:'integer',minimum:1,maximum:12},
 keyboardEvidence:{enum:['activate','text']},
 probe:{type:'object',properties:{action:{enum:['click','type','read']},value:{type:'string',maxLength:100},role:string},required:['action'],additionalProperties:false},
 barrierClass:{type:'integer',minimum:1,maximum:6},
 relatedSelectors:{type:'array',minItems:1,maxItems:18,uniqueItems:true,items:selector},
 journey:{type:'array',minItems:2,maxItems:6,items:journeyStep},
 outcomeChecks:outcomes
}}
schema.allOf=[{
  if:{properties:{status:{enum:['verified','broken','retired']}}},
  then:{properties:{evidence:{type:'object',required:['before','after','verifiedAt','kaneRunIds'],properties:{
    before:string,after:string,verifiedAt:string,kaneRunIds:{type:'array',items:string,minItems:3,uniqueItems:true}
  }}}}
}]
writeFileSync('schemas/patch.json',JSON.stringify(schema,null,2)+'\n')
