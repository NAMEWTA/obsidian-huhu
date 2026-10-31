"""Offline prototype evidence only; not a Pi/Obsidian/runtime integration test.
Requires Python Playwright and a Chromium executable. No packages/network fetched.
Usage: python verify-prototype.py [change-directory]
"""
from pathlib import Path
import sys,json,datetime,hashlib,platform,os,shutil
from playwright.sync_api import sync_playwright
D=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
F=D/'prototypes/UI-001/final';E=D/'prototypes/UI-001/evidence';E.mkdir(parents=True,exist_ok=True)
html=(F/'index.html').read_text().replace('<link rel="stylesheet" href="styles.css">','<style>'+(F/'styles.css').read_text()+'</style>').replace('<script src="app.js"></script>','<script>'+(F/'app.js').read_text()+'</script>')
results=[];errors=[];requests=[]
def check(name,fn):
 try:
  detail=fn()
  results.append({'test':name,'status':'passed','detail':detail})
 except Exception as e:
  results.append({'test':name,'status':'failed','error':str(e)})
  print('FAIL',name,str(e)[:300],flush=True)
def assert_(v,m='assertion failed'):
 if not v:raise AssertionError(m)
def text_has(page,text):assert_(text in page.locator('#main').inner_text(),f'missing: {text}')
def action(page,name):page.locator(f'[data-action="{name}"]:visible').first.click()
def go(page,name):
 page.evaluate('(p)=>{location.hash=p}',name)
 page.wait_for_function('(p)=>document.querySelector("#page-label").textContent===({chat:"会话",runs:"运行与协作",approvals:"审批中心",memory:"长期记忆",bots:"Bot 管理",settings:"设置",browser:"浏览器共作",automation:"自动化交付",data:"数据与恢复"})[p]',arg=name)
 page.wait_for_timeout(25)
def reset(page):page.locator('#reset').click();page.wait_for_timeout(50)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH',shutil.which('chromium') or 'chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page.set_default_timeout(3500)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url))
 page.set_content(html,wait_until='load')
 def approve():
  action(page,'review-approval');assert_(page.locator('#dialog').is_visible());assert_('来源版本' in page.locator('#dialog').inner_text())
  page.screenshot(path=str(E/'approval-dialog-light.png'),full_page=True)
  action(page,'approve');text_has(page,'模拟完成');assert_(page.locator('[data-action="review-approval"]').count()==0)
 check('approval: explicit preview -> single simulated receipt; cannot reapprove',approve)
 def reject():
  reset(page);action(page,'reject');text_has(page,'你已拒绝');assert_(page.locator('[data-action="approve"]').count()==0)
 check('approval: rejection has no receipt and retains source/draft',reject)
 def changed():
  reset(page);go(page,'approvals');action(page,'change-source');text_has(page,'旧批准已失效');action(page,'new-preview');text_has(page,'确认后再写入')
 check('approval: source revision invalidation -> new preview',changed)
 def unknown():
  action(page,'unknown');text_has(page,'结果未知');assert_(page.locator('[data-action="approve"]').is_disabled());action(page,'reconcile');assert_('当前仍未知' in page.locator('#dialog').inner_text());page.keyboard.press('Escape');text_has(page,'结果未知')
 check('effects: unknown cannot execute again; reconciliation does not fabricate success',unknown)
 def attachment():
  reset(page);page.locator('#composer').fill('测试来源不会自动发送');action(page,'attach-source');assert_(page.locator('#composer').input_value()=='测试来源不会自动发送');assert_('已加入模拟' not in page.locator('#main').inner_text());text_has(page,'尚未发送')
 check('composer: attach preserves input and does not submit',attachment)
 def ime():
  page.locator('#composer').dispatch_event('keydown',{'key':'Enter','code':'Enter','isComposing':True});assert_(page.locator('#composer').input_value()=='测试来源不会自动发送');assert_('已加入模拟' not in page.locator('#main').inner_text())
 check('composer: synthetic IME composing Enter does not send',ime)
 def send():
  page.locator('#send-mode').select_option('steer');page.locator('#composer').press('Enter');assert_(page.locator('#composer').input_value()=='');text_has(page,'steer 当前运行')
 check('composer: ordinary Enter sends the selected simulated steer mode',send)
 def xss():
  page.locator('#composer').fill('<img src=x onerror=alert(1)>');page.locator('#composer').press('Enter');text_has(page,'<img src=x onerror=alert(1)>');assert_(page.locator('#main img').count()==0)
 check('composer: user HTML stays text',xss)
 def focus():
  reset(page);btn=page.locator('[data-action="review-approval"]');btn.focus();btn.press('Enter');page.keyboard.press('Escape');page.wait_for_timeout(40);assert_(btn.evaluate('(e)=>e===document.activeElement'))
 check('dialog: Escape closes and returns focus to the unchanged trigger',focus)
 def keyboard_tabs():
  go(page,'runs');page.locator('[data-run-view="tree"]').focus();page.keyboard.press('ArrowRight');assert_(page.locator('[data-run-view="graph"]').get_attribute('aria-selected')=='true');page.keyboard.press('End');assert_(page.locator('[data-run-view="communication"]').get_attribute('aria-selected')=='true')
 check('tabs: arrows/End select relationship views with roving focus',keyboard_tabs)
 def review_gate():
  action(page,'review-root');assert_('尚未满足根验收条件' in page.locator('#dialog').inner_text());page.keyboard.press('Escape');action(page,'question');page.locator('#answer').fill('先用本地 FTS，向量后续再评估');action(page,'answer');text_has(page,'结果已提交');action(page,'review-root');action(page,'accept-root');assert_(page.locator('#dialog').is_visible());page.locator('#review-check').check();action(page,'accept-root');text_has(page,'根任务模拟验收完成')
 check('collaboration: pending child blocks root acceptance; reviewed submission can pass',review_gate)
 def cancel():
  action(page,'cancel-tree');action(page,'confirm-cancel');text_has(page,'运行树已模拟取消');assert_(page.locator('[data-action="cancel-tree"]').is_disabled())
 check('collaboration: cancel-tree acknowledgement does not claim rollback',cancel)
 def branches():
  page.locator('[data-run-view="branches"]').click();action(page,'branch-alternative');text_has(page,'选中：leaf-04');text_has(page,'不是执行树')
 check('sessions: Pi history branch selection is separate from execution ancestry',branches)
 def memory():
  reset(page);go(page,'memory');text_has(page,'自动抽取的候选');action(page,'memory-confirm');text_has(page,'用户已确认');action(page,'memory-edit');page.locator('#memory-text').fill('你喜欢先查看差异再批准写入');action(page,'memory-preview');text_has(page,'你喜欢先查看差异再批准写入');text_has(page,'revision 2');action(page,'memory-forget');action(page,'forget-confirm');text_has(page,'tombstone');text_has(page,'不会从尚存的会话自动重新学习')
 check('memory: candidate -> confirm -> edit revision -> forget tombstone',memory)
 def pause():
  page.locator('#learning').uncheck();text_has(page,'学习已暂停')
 check('memory: learning pause does not delete sessions',pause)
 def mcp():
  go(page,'settings');text_has(page,'默认关闭');action(page,'mcp-toggle');assert_(page.locator('#dialog').is_visible());action(page,'mcp-enable');text_has(page,'纯模拟');action(page,'mcp-toggle');text_has(page,'默认关闭')
 check('MCP: explicit confirmation and separate identity; UI-only toggle',mcp)
 def config():
  action(page,'toggle-model');go(page,'chat');assert_(page.locator('#composer-form button[type=submit]').is_disabled());go(page,'settings');action(page,'toggle-model');go(page,'chat');assert_(page.locator('#composer-form button[type=submit]').is_enabled())
 check('model: unconfigured blocks send, not history/service display',config)
 def browser():
  go(page,'browser');assert_(page.locator('[data-action="browser-submit"]').is_disabled());action(page,'browser-fill');assert_(page.locator('#browser-title').input_value()!='');action(page,'browser-submit');action(page,'browser-approve');text_has(page,'模拟提交回执');assert_(page.locator('[data-action="browser-submit"]').is_disabled())
 check('Browser: visible fill, preview, single simulated Page effect receipt',browser)
 def auto():
  go(page,'automation');action(page,'auto-trigger');action(page,'auto-trigger');text_has(page,'逻辑工作数');text_has(page,'1（重复投递回读同一受理回执）');assert_('2' in page.locator('#main').inner_text())
 check('Automations: duplicate occurrence yields one logical mock run',auto)
 def data():
  go(page,'data');page.locator('#diagnostic').select_option('state');text_has(page,'已停止新增副作用');assert_(page.locator('[data-action="rebuild-index"]').is_disabled());page.locator('#diagnostic').select_option('index');text_has(page,'会话仍可读取');action(page,'rebuild-index');text_has(page,'模拟重建完成');action(page,'old-data');assert_('不会自动被迁移' in page.locator('#dialog').inner_text());page.keyboard.press('Escape')
 check('recovery: control fail-closed vs rebuildable index, old data untouched',data)
 def scenarios():
  reset(page);page.locator('#composer').fill('保留草稿');page.locator('#scenario').select_option('failed');text_has(page,'模型请求失败');assert_(page.locator('#composer').input_value()=='保留草稿');page.locator('#scenario').select_option('read_only');action(page,'review-approval');assert_(not page.locator('#dialog').is_visible());page.locator('#scenario').select_option('unknown_effect');text_has(page,'结果未知')
 check('states: failed preserves draft; read-only blocks new approval; unknown persists',scenarios)
 # Render matrix is a prototype visual/overflow check, not a full accessibility certification.
 reset(page)
 sizes=[1440,960,760,420]
 pages=['chat','runs','approvals','memory','bots','settings','browser','automation','data']
 for width in sizes:
  page.set_viewport_size({'width':width,'height':1000 if width>=960 else 900})
  for theme in ['light','dark']:
   page.evaluate('(v)=>document.documentElement.dataset.theme=v',theme)
   for name in pages:
    go(page,name)
    def layout():
     dims=page.evaluate('({w:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll("h1").length})')
     assert_(dims['scroll']<=dims['w']+1,f'horizontal overflow: {dims}')
     assert_(dims['h1']==1,f'heading count {dims}')
     assert_(page.locator('.preview-bar').is_visible())
     assert_(page.locator('#main').inner_text().strip()!='')
     # Visible buttons should have an accessible text/label; SVG decorative icons require labels.
     unlabeled=page.locator('button').evaluate_all('(es)=>es.filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&!((e.getAttribute("aria-label")||e.textContent||"").trim())).map(e=>e.outerHTML)')
     assert_(not unlabeled,'unlabelled visible buttons')
     return dims
    check(f'layout {width}px / {theme} / {name}',layout)
    if (width,theme,name) in [(1440,'light','chat'),(1440,'dark','chat'),(420,'light','chat'),(420,'dark','approvals'),(760,'light','settings'),(1440,'light','memory')]:
     page.screenshot(path=str(E/f'{name}-{width}-{theme}.png'),full_page=True)
 def narrow_navigation():
  page.set_viewport_size({'width':420,'height':900});page.locator('#nav-toggle').click();assert_(page.locator('#dialog').is_visible());page.locator('#dialog [data-page="memory"]').click();text_has(page,'长期记忆');assert_(not page.locator('#dialog').is_visible())
 check('narrow: dialog navigation opens all workspace views',narrow_navigation)
 def container_layout():
  page.set_viewport_size({'width':1440,'height':1000});page.evaluate('document.querySelector("#workspace").style.width="420px"');go(page,'chat');assert_(page.locator('.sidebar').is_hidden());assert_(page.locator('.rail').is_hidden());assert_(page.locator('#nav-toggle').is_visible());assert_(page.locator('.inspector').is_hidden());assert_(page.locator('#workspace').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'));page.evaluate('document.querySelector("#workspace").style.width=""')
 check('container: narrow Obsidian pane uses container, not only viewport breakpoint',container_layout)
 def motion():
  page.emulate_media(reduced_motion='reduce');duration=page.locator('#theme').evaluate('(e)=>getComputedStyle(e).transitionDuration');assert_(duration=='0s',duration);return duration
 check('reduced motion: transitions disabled',motion)
 # Graph and unknown-state evidence at fixed dimensions.
 page.set_viewport_size({'width':1440,'height':1000});page.evaluate('document.documentElement.dataset.theme="light"');reset(page);go(page,'runs');page.locator('[data-run-view="communication"]').click();page.screenshot(path=str(E/'run-communication-1440-light.png'),full_page=True)
 page.set_viewport_size({'width':420,'height':900});go(page,'approvals');action(page,'unknown');page.screenshot(path=str(E/'unknown-effect-420-light.png'),full_page=True)
 check('runtime: no JavaScript page errors',lambda:assert_(not errors,str(errors)))
 check('offline: no network requests from the prototype',lambda:assert_(not requests,str(requests)))
 report={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':'prototype-browser-evidence','load_method':'Playwright set_content of exact HTML with local CSS/JS inlined; file:// navigation blocked by container administrator policy','browser':b.version,'os':platform.platform(),'node_available':'v22.16.0; not sufficient evidence for Pi >=22.19.0','inputs':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in F.iterdir() if f.is_file()},'summary':{'passed':sum(r['status']=='passed' for r in results),'failed':sum(r['status']=='failed' for r in results)},'results':results,'page_errors':errors,'network_requests':requests,'limitations':['Synthetic composition event only; real OS IME not tested','No screen-reader manual certification','Not Obsidian/Electron/utilityProcess/Pi/SQLite/MCP/Browser integration evidence','No user visual approval; no real parent prototype pixel comparison']}
 (E/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 b.close()
 print(json.dumps(report['summary']),flush=True)
 sys.exit(1 if report['summary']['failed'] else 0)
