from pathlib import Path
import json,datetime,os,shutil
from playwright.sync_api import sync_playwright
D=Path(__file__).resolve().parents[1];P=D/'prototypes/UI-001';F=P/'final';E=P/'evidence'
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH',shutil.which('chromium') or 'chromium'),headless=True,args=['--no-sandbox'])
 for k in 'abc':
  for width in [1440,420]:
   h=(P/f'comparison/variants/candidate-{k}.html').read_text().replace('<link rel="stylesheet" href="../../final/styles.css">','<style>'+(F/'styles.css').read_text()+'</style>').replace('<script src="../../final/app.js"></script>','<script>'+(F/'app.js').read_text()+'</script>')
   page=b.new_page(viewport={'width':width,'height':1000});err=[];page.on('pageerror',lambda e:err.append(str(e)));page.set_content(h)
   assert not err,err
   assert page.locator('h1').inner_text()=='整理下周的行动计划'
   assert page.locator('[data-action="review-approval"]').is_visible()
   if k=='b':assert page.locator('.chat-layout').get_attribute('class').endswith('no-inspector')
   if k=='c':assert page.locator('.message:not(.user) .message-body').evaluate('(e)=>e.firstElementChild.classList.contains("approval-card")')
   dims=page.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})');assert dims['s']<=dims['w']+1,dims
   page.screenshot(path=str(E/f'candidate-{k}-{width}.png'),full_page=True)
   results.append({'candidate':k,'width':width,'status':'passed','difference':{'a':'default context/inspector','b':'inspector initially hidden','c':'approval appears before explanation'}[k],'overflow':False,'page_errors':err})
   page.close()
 b.close()
(E/'candidate-results.json').write_text(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'load_method':'local HTML with referenced local CSS/JS inlined via set_content','summary':{'passed':len(results),'failed':0},'results':results,'approval':'not user-approved; formal check-preview not run'},ensure_ascii=False,indent=2)+'\n')
print(len(results),'candidate checks passed')
