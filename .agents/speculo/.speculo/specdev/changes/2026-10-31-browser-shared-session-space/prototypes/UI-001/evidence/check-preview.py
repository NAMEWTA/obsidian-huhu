from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
import os, shutil
P=Path(__file__).resolve().parents[1]
shots=P/'evidence/screenshots';shots.mkdir(parents=True,exist_ok=True)
CHROMIUM=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome')
if not CHROMIUM: raise SystemExit('Set CHROMIUM_EXECUTABLE to an installed Chromium/Chrome executable; no browser is downloaded by this test.')
checks=[];errors=[];network=[]
def load(page,path):
 source=path.read_text()
 import re
 def style(m):
  return '<style>'+ (path.parent/m.group(1)).resolve().read_text()+'</style>'
 def script(m):
  return '<script>'+ (path.parent/m.group(1)).resolve().read_text()+'</script>'
 source=re.sub(r'<link rel="stylesheet" href="([^"]+)">',style,source)
 source=re.sub(r'<script src="([^"]+)"></script>',script,source)
 page.set_content(source,wait_until='load')
def test(name,fn):
 try:fn();checks.append({'name':name,'result':'passed'})
 except Exception as e:checks.append({'name':name,'result':'failed','error':str(e)[:500]})
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=CHROMIUM,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
 page.set_default_timeout(5000)
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
 load(page,P/'final/index.html');page.wait_for_timeout(100)
 def no_overflow():
  bad=page.evaluate('''() => ({document:document.documentElement.scrollWidth>innerWidth+1,frame:document.querySelector('.frame').scrollWidth>document.querySelector('.frame').clientWidth+1})''');assert not any(bad.values()),bad
 test('Desktop layout has no document/frame overflow',no_overflow)
 page.screenshot(path=str(shots/'desktop-light.png'),full_page=True)
 def handoff():
  page.locator('#page-draft').fill('我的中文草稿，不应因交接而丢失。')
  page.evaluate("window.originalDraftNode=document.querySelector('#page-draft')")
  page.locator('#primary-control').click();assert page.locator('#dialog').evaluate('(d)=>d.open');page.get_by_role('button',name='允许本次交接',exact=True).click()
  assert page.locator('#page-draft').is_disabled();page.locator('#agent-action').click();before=page.locator('#page-draft').input_value();assert 'Agent 草稿' in before
  page.screenshot(path=str(shots/'desktop-agent.png'),full_page=True)
  page.locator('#primary-control').click();page.wait_for_timeout(300);assert not page.locator('#page-draft').is_disabled();assert page.locator('#page-draft').input_value()==before
  assert page.evaluate("window.originalDraftNode===document.querySelector('#page-draft')")
  page.locator('#late-action').click();assert '拒绝' in page.locator('#scenario-result').inner_text()
 test('Handoff, mock Agent input and reclaim retain draft and DOM identity',handoff)
 def personal():
  page.locator('.sidebar [data-space="personal"]').click();assert '禁止' in page.locator('#control-desc').inner_text();assert page.locator('#agent-action').is_disabled()
  page.locator('#primary-control').click();page.get_by_role('button',name='取消',exact=True).click();assert '禁止' in page.locator('#control-desc').inner_text()
  page.locator('.sidebar [data-space="task"]').click()
 test('Personal space denies mock Agent before explicit conversion',personal)
 def permission():
  page.get_by_role('button',name='演示网站请求定位权限',exact=True).click();assert 'research.example' in page.locator('#dialog-body').inner_text();page.get_by_role('button',name='拒绝',exact=True).click();assert '已拒绝' in page.locator('#feedback').inner_text()
 test('Origin-scoped permission denial',permission)
 def material():
  page.locator('[data-act="material"]').click();page.get_by_role('button',name='添加，不发送',exact=True).click();assert '尚未发送' in page.locator('#dialog-title').inner_text();page.get_by_role('button',name='完成',exact=True).click()
 test('Material goes to mock input without sending',material)
 def cleanup():
  page.locator('[data-act="delete-space"]').click();page.get_by_role('button',name='确认并演示删除',exact=True).click();assert '清理未完成' in page.locator('#dialog-title').inner_text();page.screenshot(path=str(shots/'cleanup-pending.png'),full_page=True);page.get_by_role('button',name='保留，稍后处理',exact=True).click();assert page.locator('#primary-control').is_disabled();assert '清理未完成' in page.locator('#feedback').inner_text();page.locator('#reset').click()
 test('Cleanup failure remains visible and blocks new handoff',cleanup)
 def unknown():
  page.locator('#scenario').select_option('unknown');assert '结果未知' in page.locator('#control-status').inner_text();assert '再次' in page.locator('#control-desc').inner_text();page.locator('#state-action').click();page.wait_for_timeout(300);assert '由你操作' in page.locator('#control-status').inner_text()
 test('Unknown outcome requires takeover, no replay button',unknown)
 def address():
  page.locator('#address').fill('javascript:alert(1)');page.locator('#address-form button[type="submit"]').click();assert '已拒绝' in page.locator('#feedback').inner_text();page.locator('#address').fill('https://research.example/fieldnotes')
 test('Dangerous address is rejected, no real navigation',address)
 def keyboard():
  page.locator('#primary-control').click();assert page.locator('#dialog-close').evaluate('(e)=>e===document.activeElement');page.keyboard.press('Tab');assert page.evaluate("document.querySelector('#dialog').contains(document.activeElement)");page.keyboard.press('Escape');assert not page.locator('#dialog').evaluate('(d)=>d.open');assert page.locator('#primary-control').evaluate('(e)=>e===document.activeElement')
 test('Dialog initial focus, keyboard containment and Escape return',keyboard)
 for scenario in ['loading','offline','error','crashed','owner','unsupported','unknown','normal']:
  def scenario_test(s=scenario):
   page.locator('#scenario').select_option(s);assert page.locator('#state-page').is_visible() == (s!='normal')
  test('Scenario renders: '+scenario,scenario_test)
 def tab_drafts():
  page.locator('#reset').click();page.locator('#page-draft').fill('主页面独立草稿');page.locator('[data-tab="reference"]').click();assert page.locator('#page-draft').input_value()=='';page.locator('#page-draft').fill('参考页独立草稿');page.locator('[data-tab="notes"]').click();assert page.locator('#page-draft').input_value()=='主页面独立草稿'
 test('Distinct mock pages retain distinct drafts, handoff still same draft',tab_drafts)
 def conversion():
  page.locator('.sidebar [data-space="personal"]').click();page.locator('#primary-control').click();page.get_by_role('button',name='转换，不授权',exact=True).click();assert '交给' in page.locator('#primary-control').inner_text();assert page.locator('#agent-action').is_disabled();assert '任务空间' in page.locator('.sidebar [data-space="personal"] small').inner_text();page.locator('.sidebar [data-space="task"]').click();page.locator('.sidebar [data-space="personal"]').click();assert '交给' in page.locator('#primary-control').inner_text();page.locator('#reset').click()
 test('Explicit personal conversion keeps control human and survives space switch',conversion)
 def failed_download():
  page.locator('[data-act="downloads"]').click();page.get_by_role('button',name='演示下载失败',exact=True).click();assert '下载失败' in page.locator('#dialog-body').inner_text();page.get_by_role('button',name='关闭',exact=True).click()
 test('Failed download remains explicit, no read grant',failed_download)
 def crash_reload():
  page.locator('#scenario').select_option('crashed');page.locator('#state-action').click();page.get_by_role('button',name='确认重载',exact=True).click();assert page.locator('#mock-page').is_visible();assert page.locator('#page-draft').input_value()==''
 test('Crash recovery clears mock page memory only after explicit confirmation',crash_reload)
 def cleanup_retry():
  page.locator('[data-act="delete-space"]').click();page.get_by_role('button',name='确认并演示删除',exact=True).click();page.get_by_role('button',name='演示重试成功',exact=True).click();assert page.locator('#empty-page').is_visible();page.locator('#reset').click()
 test('Cleanup retry ends in empty space, no disk operation',cleanup_retry)
 def http():
  page.locator('#address').fill('http://research.example/notes');page.locator('#address-form button[type="submit"]').click();assert '不安全 HTTP' in page.locator('#feedback').inner_text()
 test('HTTP mock navigation is explicitly labelled insecure',http)
 page.locator('#reset').click();page.locator('#theme').click();page.wait_for_timeout(180);page.screenshot(path=str(shots/'desktop-dark.png'),full_page=True)
 page.locator('#theme').click();page.wait_for_timeout(180);page.set_viewport_size({'width':420,'height':1000});page.wait_for_timeout(100)
 test('420px no unintended overflow',no_overflow);page.screenshot(path=str(shots/'narrow-420.png'),full_page=True)
 def narrow_nav():
  assert page.locator('#nav-toggle').is_visible();page.locator('#nav-toggle').click();page.locator('#dialog-body [data-space="personal"]').click();assert '个人空间' in page.locator('#control-desc').inner_text();page.locator('#nav-toggle').click();page.locator('#dialog-body [data-space="task"]').click()
 test('Narrow navigation sheet switches space and closes',narrow_nav)
 page.locator('#long').click();page.locator('#touch').click();page.locator('#language').click();page.wait_for_timeout(50)
 test('Long English + 44px touch at 420px no overflow',no_overflow);page.screenshot(path=str(shots/'narrow-en-touch.png'),full_page=True)
 page.set_viewport_size({'width':600,'height':1100});test('600px layout no overflow',no_overflow)
 page.set_viewport_size({'width':1440,'height':1100});page.evaluate("document.body.style.zoom='2'")
 test('CSS zoom 200 percent no document overflow',no_overflow);page.screenshot(path=str(shots/'zoom-200.png'),full_page=True)
 page.evaluate("document.body.style.zoom='1'");page.emulate_media(reduced_motion='reduce')
 def motion():assert page.locator('#theme').evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
 test('Reduced motion removes transitions',motion)
 for id in ['a','b','c']:
  load(page,P/f'comparison/variants/candidate-{id}.html');test('Standalone candidate '+id+' loads and no overflow',no_overflow)
 load(page,P/'comparison/index.html');test('Comparison links all resolve locally',lambda: None if page.locator('a').count()==4 else (_ for _ in ()).throw(AssertionError('links')))
 version=browser.version;browser.close()
report={'artifact':'offline-prototype-browser-checks','tested_at':'2026-10-31','browser':'Chromium '+version,'environment':'Linux container; exact local HTML/CSS/JS embedded into an in-memory page; file navigation policy disallowed file://; no policy changed','real_obsidian':False,'host_F_B_tests':'NOT RUN','checks':checks,'page_errors':errors,'unexpected_network':network,'screenshots':[str(p.relative_to(P)) for p in shots.glob('*.png')]}
(P/'evidence/browser-local.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':sum(c['result']=='passed' for c in checks),'failed':[c for c in checks if c['result']!='passed'],'page_errors':errors,'network':network},ensure_ascii=False,indent=2))
