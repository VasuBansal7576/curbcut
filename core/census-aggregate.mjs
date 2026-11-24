const z95=1.96

export function wilson(k,n,z=z95) {
  const hits=Number(k)||0,total=Number(n)||0
  if(total<=0) return {n:0,k:0,share:0,low:0,high:1}
  const p=hits/total,z2=z*z,denom=1+z2/total
  const center=(p+z2/(2*total))/denom
  const margin=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total))/denom
  return {n:total,k:hits,share:p,low:Math.max(0,center-margin),high:Math.min(1,center+margin)}
}

export function mean(values) {
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0
}

function round(value,digits=4) {
  return Number(value.toFixed(digits))
}

function compactInterval(interval) {
  return {n:interval.n,k:interval.k,share:round(interval.share),low:round(interval.low),high:round(interval.high)}
}

export function summarize(pages,recipes,{threshold=0.5}={}) {
  const sample=pages.filter(page=>page.set==='sample')
  const observed=sample.filter(page=>page.status==='observed')
  const blocked=sample.filter(page=>page.status==='blocked')
  const failed=sample.filter(page=>page.status==='failed' || page.status==='unavailable')
  const labelled=pages.filter(page=>page.status==='observed' && (page.labels??[]).some(label=>label.source==='patch-url'))
  const tokens={input:0,output:0,requests:0}
  for(const page of pages) {
    tokens.input+=(page.usage?.input_tokens??0)
    tokens.output+=(page.usage?.output_tokens??0)
    if(page.usage) tokens.requests++
  }
  const rows=recipes.map(recipe=>{
    const signalHits=observed.filter(page=>page.signals?.[recipe.id]?.hit).length
    const jevHits=observed.filter(page=>Number(page.jev?.[recipe.id]?.noul)>=threshold).length
    const noul=observed.map(page=>Number(page.jev?.[recipe.id]?.noul)).filter(Number.isFinite)
    const positives=labelled.filter(page=>(page.labels??[]).some(label=>label.recipeId===recipe.id && label.source==='patch-url'))
    const signalRecall=positives.filter(page=>page.signals?.[recipe.id]?.hit).length
    const jevRecall=positives.filter(page=>Number(page.jev?.[recipe.id]?.noul)>=threshold).length
    const agree=positives.filter(page=>{
      const signal=Boolean(page.signals?.[recipe.id]?.hit)
      const yes=Number(page.jev?.[recipe.id]?.noul)>=threshold
      return signal===yes
    }).length
    return {
      id:recipe.id,title:recipe.title,signature:recipe.signature,patchCount:recipe.patchCount,
      signal:compactInterval(wilson(signalHits,observed.length)),
      jev:compactInterval(wilson(jevHits,observed.length)),
      jevMeanNoul:round(mean(noul)),
      labelled:{n:positives.length,signalRecall,jevRecall,signalJevAgree:agree,
        signalRate:positives.length?round(signalRecall/positives.length):null,
        jevRate:positives.length?round(jevRecall/positives.length):null,
        agreeRate:positives.length?round(agree/positives.length):null}
    }
  })
  return {
    observed:observed.length,blocked:blocked.length,failed:failed.length,sample:sample.length,
    labelled:labelled.length,tokens,threshold,recipes:rows
  }
}

export function renderReadme(report) {
  const lines=[
    '# Recipe census',
    '',
    [report.seed?`Seed \`${report.seed}\`.`:'',report.source?`Sample source ${report.source}.`:''].filter(Boolean).join(' '),
    `Attempted ${report.sample} sample pages. Observed ${report.observed}, blocked ${report.blocked}, failed ${report.failed}.`,
    `Calibration pages with a patch URL label: ${report.labelled}. Labels are positives only, so recall is reported and precision is not.`,
    `Jev tokens: ${report.tokens.input} input, ${report.tokens.output} output, across ${report.tokens.requests} requests. Model ${report.model??'jev-1.14.0'}. A page counts as a Jev hit when noul is at least ${report.threshold}.`,
    '',
    'Estimated share is the Jev hit rate on observed sample pages, with a Wilson 95% interval. Signal share is the deterministic detector on the same pages.',
    '',
    '| Recipe | Patches | Signal share | Jev share | Jev 95% CI | Mean noul | Labelled | Signal recall | Jev recall |',
    '| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |'
  ]
  for(const recipe of report.recipes) {
    const ci=recipe.jev.n?`${(recipe.jev.low*100).toFixed(1)}–${(recipe.jev.high*100).toFixed(1)}%`:'—'
    const labelled=recipe.labelled.n?`${recipe.labelled.jevRecall}/${recipe.labelled.n}`:'0'
    const signalRecall=recipe.labelled.n?`${recipe.labelled.signalRecall}/${recipe.labelled.n}`:'0'
    lines.push(`| ${recipe.title} | ${recipe.patchCount} | ${(recipe.signal.share*100).toFixed(1)}% | ${(recipe.jev.share*100).toFixed(1)}% | ${ci} | ${recipe.jevMeanNoul.toFixed(2)} | ${recipe.labelled.n} | ${signalRecall} | ${labelled} |`)
  }
  lines.push('', 'Do not read these shares as repair success. They estimate how often a recipe’s barrier pattern appears. Agreement with labels is only as strong as the bundled-fix pages visited.',
    report.branch?`Branch ${report.branch}.`:'',
    report.commit?`Commit ${report.commit}.`:'')
  return lines.filter((line,index)=>line!=='' || lines[index-1]!=='').join('\n').trim()+'\n'
}
