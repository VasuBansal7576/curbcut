import {appendFile,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,command} from '../core/io.mjs'
import {MARKER,renderComment} from './pr-comment.mjs'

function parseArgs(argv) {
  const flags={}
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i]
    if(arg==='--local' || arg==='--post' || arg==='--wait' || arg==='--no-wait') flags[arg.slice(2)]=true
    else if(arg==='--url' || arg==='--config' || arg==='--json-out' || arg==='--comment-out' || arg==='--timeout' || arg==='--artifact-url' || arg==='--pr') {
      flags[arg.slice(2)]=argv[++i]
    } else if(arg.startsWith('--url=')) flags.url=arg.slice(6)
    else if(arg.startsWith('--config=')) flags.config=arg.slice(9)
    else if(arg.startsWith('--json-out=')) flags['json-out']=arg.slice(11)
    else if(arg.startsWith('--comment-out=')) flags['comment-out']=arg.slice(14)
    else if(arg.startsWith('--timeout=')) flags.timeout=arg.slice(10)
    else if(arg.startsWith('--artifact-url=')) flags['artifact-url']=arg.slice(15)
    else if(arg.startsWith('--pr=')) flags.pr=arg.slice(5)
    else throw new Error('Unknown argument: '+arg)
  }
  return flags
}

function httpUrl(value) {
  const parsed=new URL(value)
  if(parsed.protocol!=='http:' && parsed.protocol!=='https:') throw new Error('url must be http or https')
  return parsed.href
}

export async function waitForUrl(url,{timeout=180000,interval=3000}={}) {
  const deadline=Date.now()+timeout
  let last=null
  while(Date.now()<deadline) {
    try {
      const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(8000)})
      if(response.status>0 && response.status<500) return true
      last='HTTP '+response.status
    } catch(error) {last=error.message.split('\n')[0]}
    await delay(interval)
  }
  throw new Error('Preview URL did not respond: '+url+(last?' ('+last+')':''))
}

function runLinks(flags) {
  const server=process.env.GITHUB_SERVER_URL||'https://github.com'
  const repo=process.env.GITHUB_REPOSITORY
  const runId=process.env.GITHUB_RUN_ID
  const runUrl=repo && runId?server+'/'+repo+'/actions/runs/'+runId:null
  return {artifactUrl:flags['artifact-url']||runUrl,runUrl}
}

async function eventPullNumber() {
  const file=process.env.GITHUB_EVENT_PATH
  if(!file) return null
  try {
    const event=JSON.parse(await readFile(file,'utf8'))
    return event.pull_request?.number??event.issue?.number??null
  } catch {return null}
}

async function github(method,pathname,token,body) {
  const response=await fetch('https://api.github.com'+pathname,{
    method,
    headers:{
      authorization:'Bearer '+token,
      accept:'application/vnd.github+json',
      'user-agent':'curbcut-gate',
      ...(body?{'content-type':'application/json'}:{})
    },
    body:body?JSON.stringify(body):undefined
  })
  const text=await response.text()
  if(!response.ok) throw new Error('GitHub '+method+' '+pathname+' failed ('+response.status+')')
  return text?JSON.parse(text):null
}

export async function postStickyComment({token,repo,pr,body}) {
  if(!token) throw new Error('GITHUB_TOKEN is required to post a comment.')
  if(!repo || !pr) throw new Error('Repository and pull request number are required to post a comment.')
  const comments=await github('GET','/repos/'+repo+'/issues/'+pr+'/comments?per_page=100',token)
  const existing=(comments??[]).find(comment=>typeof comment.body==='string' && comment.body.includes(MARKER))
  if(existing) {
    await github('PATCH','/repos/'+repo+'/issues/comments/'+existing.id,token,{body})
    return existing.id
  }
  const created=await github('POST','/repos/'+repo+'/issues/'+pr+'/comments',token,{body})
  return created.id
}

async function writeOutput(values) {
  const file=process.env.GITHUB_OUTPUT
  if(!file) return
  const lines=Object.entries(values).map(([key,value])=>key+'='+String(value??''))
  await appendFile(file,lines.join('\n')+'\n')
}

export async function runPrBot(argv) {
  const flags=parseArgs(argv)
  if(!flags.url) throw new Error('pr-bot requires --url')
  const url=httpUrl(flags.url)
  const config=flags.config||path.join(process.cwd(),'curbcut.gate.json')
  const local=Boolean(flags.local)
  const wait=!flags['no-wait']
  const timeout=Number(flags.timeout??180)*1000
  const failed=(reason,exitCode=2)=>({ok:false,exitCode,url,findings:[{status:'error',persona:'keyboard-only',task:'gate',reason,dom:null,recording:null,runner:local?'playwright':'kane'}]})
  let result
  try {
    if(wait) await waitForUrl(url,{timeout})
    const args=[path.join(ROOT,'curbcut.mjs'),'gate','--json','--config',config,'--url',url]
    if(local) args.push('--local')
    const cli=await command(process.execPath,args,{timeout:local?600000:3600000})
    try {result=JSON.parse(cli.stdout)}
    catch {result=failed((cli.stderr||cli.stdout||'gate produced no JSON').trim().split('\n')[0],cli.code??2)}
    if(!result.exitCode && cli.code) result.exitCode=cli.code
  } catch(error) {
    result=failed(error.message.split('\n')[0])
  }
  const {artifactUrl,runUrl}=runLinks(flags)
  const comment=renderComment(result,{artifactUrl,runUrl,previewUrl:url})
  if(flags['json-out']) await writeFile(flags['json-out'],JSON.stringify(result,null,2)+'\n')
  if(flags['comment-out']) await writeFile(flags['comment-out'],comment)
  const pr=flags.pr??await eventPullNumber()
  const token=process.env.GITHUB_TOKEN
  if(flags.post) await postStickyComment({token,repo:process.env.GITHUB_REPOSITORY,pr,body:comment})
  await writeOutput({ok:String(Boolean(result.ok)),'exit-code':String(result.exitCode??(result.ok?0:1)),'comment-file':flags['comment-out']??'','json-file':flags['json-out']??''})
  if(!flags['comment-out'] && !flags.post) process.stdout.write(comment)
  return result.exitCode??(result.ok?0:1)
}

const isCli=process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])
if(isCli) {
  try {process.exitCode=await runPrBot(process.argv.slice(2))}
  catch(error) {console.error(error.message);process.exitCode=2}
}
