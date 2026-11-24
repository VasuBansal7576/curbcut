import {readFile} from 'node:fs/promises'

export function jevKey() {
  const file=process.env.CURBCUT_JEV_KEY_FILE || '/Users/vasu/Desktop/Kane/.curbcut/jev/key'
  return readFile(file,'utf8').then(key=>key.trim(),()=>null)
}
