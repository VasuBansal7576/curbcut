import { readFile, writeFile } from 'node:fs/promises'
import Ajv from 'ajv'
import standalone from 'ajv/dist/standalone/index.js'
import { build } from 'esbuild'
const schema = JSON.parse(await readFile(new URL('../schemas/patch.json',import.meta.url)))
const ajv = new Ajv({code:{source:true}})
const compiled = standalone(ajv,ajv.compile(schema))
await writeFile(new URL('../core/validate.generated.cjs',import.meta.url),compiled)
await build({entryPoints:['core/browser.js'],bundle:true,format:'iife',outfile:'extension/runtime.js',minify:true,legalComments:'none',platform:'browser'})
