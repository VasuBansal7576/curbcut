import path from 'node:path'
import {readdir} from 'node:fs/promises'
import {ROOT,command,instant,readJSON,saveJSON} from '../core/io.mjs'
import {archiveKane} from './kane-archive.mjs'

const activeLedger=await archiveKane()
const byFile=new Map(activeLedger.filter(run=>run.recording).map(run=>[run.recording,run]))
const notes={
  'proof/live/chrome.mp4':'Headed Chromium on the original public page, including the keyboard test.',
  'proof/live/extension.mp4':'Installed extension report form, job progress and verified feed pickup.',
  'proof/local/toggle.mp4':'Local fixture with the installed extension switched off and back on.',
  'proof/kane/extension-toggle/toggle.mp4':'Local Chrome extension toggles alongside the fixture UI.'
}
const media=await Promise.all(['proof','evidence'].map(async dir=>
  (await readdir(path.join(ROOT,dir),{recursive:true})).filter(name=>/\.(?:mp4|webm|mov)$/i.test(name)).map(name=>dir+'/'+name)))
const files=media.flat().sort()
const recordings=new Map()
const pending=files.slice()
const live=await readJSON(path.join(ROOT,'proof/live/live-loop.json')).catch(()=>null)
await Promise.all(Array.from({length:4},async()=>{
  while(pending.length) {
    const file=pending.shift()
    const run=byFile.get(file)
    const parts=file.split('/')
    const what=notes[file]??(run?`${run.taskId} · Kane ${run.phase} · ${run.status}`:`${parts.slice(1,-1).join(' · ')} · local ${path.parse(file).name}`)
    const result=await command('ffprobe',['-v','error','-select_streams','v:0','-show_entries','format=duration:stream=width,height,avg_frame_rate','-of','json',path.join(ROOT,file)],{timeout:12000})
    if(result.code!==0) throw new Error(`Could not read ${file}: ${result.stderr}`)
    const metadata=JSON.parse(result.stdout)
    const stream=metadata.streams[0]
    const durationSeconds=Number(metadata.format.duration)
    if(!stream || !Number.isFinite(durationSeconds) || durationSeconds<=0) throw new Error('Invalid video '+file)
    recordings.set(file,{path:file,what,runner:run?'kane':file.startsWith('proof/live/')?'local-playwright-live':'local-playwright',
      kaneSessionId:run?.sessionId??null,...(file.startsWith('proof/live/') && live?{relatedKaneSessionIds:live.kaneRunIds}:{}),
      durationSeconds,width:stream.width,height:stream.height,frameRate:stream.avg_frame_rate,
      ...(run?{observations:run.result,evidencePack:run.evidencePack}:{}),...(file.startsWith('proof/live/') && live?{timeline:'proof/live/live-loop.json'}:{})})
  }
}))
await saveJSON(path.join(ROOT,'launch/footage-manifest.json'),{generatedAt:instant(),count:files.length,
  ...(live?{liveLoop:{timeline:'proof/live/live-loop.json',terminalTranscript:live.terminalTranscript,kaneRunIds:live.kaneRunIds}}:{}),
  recordings:files.map(file=>recordings.get(file))})
console.log(`Indexed ${files.length} proof recordings.`)
