import {spawn} from 'node:child_process'
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
export const ROOT=fileURLToPath(new URL('../',import.meta.url))
export const readJSON=async file=>JSON.parse(await readFile(file,'utf8'))
export async function saveJSON(file,data) {
  await mkdir(path.dirname(file),{recursive:true})
  const temp=file+'.'+randomUUID()+'.tmp'
  await writeFile(temp,JSON.stringify(data,null,2)+'\n')
  await rename(temp,file)
}
export async function command(executable,args,{input,cwd=ROOT,timeout=180000,processGroup=false}={}) {
  return new Promise((resolve,reject)=>{
    const detached=processGroup && process.platform!=='win32'
    const child=spawn(executable,args,{cwd,stdio:['pipe','pipe','pipe'],timeout:detached?undefined:timeout,detached,killSignal:'SIGKILL'})
    const deadline=detached && setTimeout(()=>{
      if(child.pid) {
        try {process.kill(-child.pid,'SIGKILL')} catch(error) {if(error.code!=='ESRCH') reject(error)}
      }
    },timeout)
    let stdout='',stderr=''
    child.stdout.on('data',data=>{stdout=(stdout+data).slice(-2000000)})
    child.stderr.on('data',data=>{stderr=(stderr+data).slice(-200000)})
    child.on('error',reject)
    child.stdin.on('error',()=>{})
    child.stdin.end(input)
    child.on('close',(code,signal)=>{
      clearTimeout(deadline)
      resolve({code,signal,stdout,stderr})
    })
  })
}
export const relative=file=>path.relative(ROOT,file)
export const instant=()=>new Date().toISOString()
