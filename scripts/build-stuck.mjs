import {build} from 'esbuild'
await build({entryPoints:['core/jev-stuck.js'],bundle:true,format:'iife',globalName:'CurbCutStuck',
  outfile:'extension/jev-stuck-runtime.js',minify:true,legalComments:'none',platform:'browser'})
