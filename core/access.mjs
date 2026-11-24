export class BlockedPage extends Error {}

export async function pageBlock(page,response) {
  if(response?.status()>=400) return 'HTTP '+response.status()
  return page.evaluate(()=>{
    if(location.protocol==='chrome-error:') return 'Browser navigation error'
    const title=document.title.trim()
    const body=(document.body?.innerText??'').trim().slice(0,3000)
    const challenge=/\b(verify (?:that )?you are (?:a )?human|checking your browser|enable javascript and cookies to continue|complete the security check|security verification|unusual traffic|automated (?:requests|access)|press and hold to confirm)\b/i
    const denial=/^(?:access denied|forbidden|request blocked|attention required|just a moment|pardon our interruption|service unavailable)[.!\s|:–-]*$/i
    if(denial.test(title) || denial.test(body) || challenge.test(title) || (body.length<2400 && challenge.test(body))) {
      return 'Access challenge: '+(title||body.split('\n')[0]).slice(0,180)
    }
    const captcha=[...document.querySelectorAll('iframe[title],iframe[src]')].some(frame=>{
      const {width,height}=frame.getBoundingClientRect()
      return width>=180 && height>=60 && getComputedStyle(frame).visibility==='visible' &&
        /captcha|human verification|security challenge/i.test(frame.title+' '+frame.getAttribute('src'))
    })
    if(captcha) return 'Visible CAPTCHA or verification frame'
    return null
  }).catch(()=>null)
}
