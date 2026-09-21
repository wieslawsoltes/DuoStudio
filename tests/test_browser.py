#!/usr/bin/env python3
"""Interaction tests; works with an HTTP origin or restricted offline content injection.
Run: python tests/test_browser.py [--url http://localhost:8765/duo-studio.html]
Requires Python playwright and a Chromium executable. No npm dependencies.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json,time,traceback,os
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--chromium',default=os.environ.get('CHROMIUM','/usr/bin/chromium'));args=parser.parse_args()
results=[];errors=[];network=[];console=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':1100},device_scale_factor=1)
 page.set_default_timeout(7000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) and r.url!=args.url else None)
 page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 if args.url: page.goto(args.url,wait_until='load')
 else: page.set_content((ROOT/'dist/duo-studio.html').read_text(),wait_until='load')
 page.wait_for_function('Duo.ready')
 def check(name,fn):
  t=time.monotonic()
  try:
   value=fn()
   if value is False: raise AssertionError('Expected a truthy result')
   results.append({'test':name,'passed':True,'ms':round((time.monotonic()-t)*1000)})
   print('PASS',name,flush=True)
  except Exception as exc:
   results.append({'test':name,'passed':False,'error':str(exc),'ms':round((time.monotonic()-t)*1000)})
   print('FAIL',name,str(exc),flush=True)
   page.screenshot(path=str(ROOT/'screenshots'/('failure-'+str(len(results))+'.png')))
 def ev(js,arg=None): return page.evaluate(js,arg)
 def app(id):
  ev("id=>{document.querySelector('#system-dialog').close();Duo.shell.closeSecond();Duo.shell.setPosture('open');Duo.shell.open(id)}",id)
  page.wait_for_timeout(150)
  return page.locator(f'#workspace [data-app="{id}"]')
 def act(id,name): page.locator(f'#workspace [data-app="{id}"] [data-action="{name}"]').first.click()
 def model(id):return ev('(id)=>Duo.store.data.apps[id]',id)
 def assert_true(v,msg='Assertion failed'):
  if not v:raise AssertionError(msg)
 check('Twenty app modules registered',lambda:ev('Duo.apps.size===20'))
 check('Home contains twenty apps and two system tiles',lambda:page.locator('#home-view .home-app').count()==22)
 check('Standalone contains no external scripts or styles',lambda:ev("!document.querySelector('script[src],link[rel=stylesheet]')"))
 for id in ['chatgpt','threads','google','tiktok','whatsapp','instagram','youtube','maps','gmail','gemini']:
  check(f'{id}: launch with two visible app panes',lambda id=id:(app(id),ev("id=>[...document.querySelectorAll('[data-app=\"'+id+'\"] .duo-panes > .pane')].every(p=>p.clientWidth>0&&p.clientHeight>0)",id))[1])
 def canvas():
  r=app('chatgpt');r.locator('[data-prompt="Build an HTML component"]').click();assert_true(model('chatgpt')['artifact']['type']=='code');r.locator('[name=artifact]').fill('<main><h1>My adaptive canvas</h1></main>');assert_true('My adaptive canvas' in model('chatgpt')['artifact']['body'])
 check('ChatGPT: prompt creates an editable HTML artifact',canvas)
 def preview():
  act('chatgpt','preview');assert_true(page.locator('[data-app=chatgpt] iframe').get_attribute('sandbox')=='');assert_true("default-src 'none'" in page.locator('[data-app=chatgpt] iframe').get_attribute('srcdoc'));act('chatgpt','preview')
 check('ChatGPT: sandboxed, network-isolated HTML preview',preview)
 def continuity():
  ev("window.retainedEditor=document.querySelector('[data-app=chatgpt] [name=artifact]');retainedEditor.focus();retainedEditor.setSelectionRange(4,9);window.retainedRoot=retainedEditor.closest('.app-root')")
  for posture in ['closed','open','tabletop','book','open']:
   ev('p=>Duo.shell.setPosture(p)',posture);page.wait_for_timeout(100)
   assert_true(ev("retainedEditor===document.querySelector('[data-app=chatgpt] [name=artifact]')&&retainedEditor.selectionStart===4&&retainedEditor.selectionEnd===9"))
 check('Fold, unfold, book and tabletop retain editor DOM and selection',continuity)
 def threads():
  r=app('threads');before=len(model('threads')['posts']);act('threads','compose');page.locator('#new-thread').fill('A locally published thought <not HTML>.');page.locator('#publish-thread').click();assert_true(len(model('threads')['posts'])==before+1);r.locator('[name=reply]').fill('A reply that stays beside the feed.');r.locator('[name=reply]').press('Enter');assert_true(model('threads')['posts'][0]['replies'][-1]['text'].startswith('A reply'));r.locator('.thread-detail [data-action=like]').click();assert_true(model('threads')['posts'][0]['liked'])
 check('Threads: publish, reply and like update the local model',threads)
 def google():
  r=app('google');r.locator('[name=query]').fill('WebGPU');r.locator('[name=query]').press('Enter');assert_true(model('google')['selected']=='gpu');act('google','save-result');assert_true('gpu' in model('google')['saved']);act('google','compare');assert_true(bool(model('google')['compare']))
 check('Google: ranked search, saved sources and comparison',google)
 def insta():
  r=app('instagram');act('instagram','create-post');page.locator('#post-caption').fill('A beautiful local photograph.');page.locator('#post-upload').set_input_files(str(ROOT/'assets/coast.jpg'));page.wait_for_function("document.querySelector('#post-preview img')?.src.startsWith('data:image/jpeg')");page.locator('#publish-photo').click();assert_true(model('instagram')['posts'][0]['dataURL'].startswith('data:image/jpeg'));act('instagram','save');assert_true(model('instagram')['posts'][0]['saved']);r.locator('[name=comment]').fill('The color is wonderful.');r.locator('[name=comment]').press('Enter');assert_true(model('instagram')['posts'][0]['comments'][-1]['text']=='The color is wonderful.')
 check('Instagram: import real image, publish, save and comment',insta)
 def gemini():
  r=app('gemini');r.locator('[data-prompt="Storyboard a mountain film"]').click();assert_true(len(model('gemini')['cards'])==3);act('gemini','card-edit');page.locator('#system-dialog [name=title]').fill('A custom opening frame');page.locator('#save-card').click();assert_true(model('gemini')['cards'][0]['title']=='A custom opening frame');r.locator('[data-action=card-up][data-index="1"]').click();assert_true(model('gemini')['cards'][1]['title']=='A custom opening frame')
 check('Gemini: build a board, edit a card, reorder cards',gemini)
 def mail():
  r=app('gmail');act('gmail','compose');r.locator('[name=to]').fill('local@example.com');r.locator('[name=subject]').fill('An unfolded invitation');r.locator('[name=body]').fill('This stays local. No real email.');r.locator('button[type=submit]').click();s=model('gmail');assert_true(s['messages'][0]['folder']=='sent' and s['messages'][0]['to']=='local@example.com');act('gmail','archive');assert_true(model('gmail')['messages'][0]['folder']=='archive');ev('Duo.store.undo()');assert_true(model('gmail')['messages'][0]['folder']=='sent')
 check('Gmail: compose, save to Sent, archive and undo',mail)
 def whatsapp():
  r=app('whatsapp');before=len(model('whatsapp')['conversations'][0]['messages']);r.locator('[name=message]').fill('Meet you by the water.');r.locator('[name=message]').press('Enter');assert_true(len(model('whatsapp')['conversations'][0]['messages'])==before+1)
 check('WhatsApp: message composer saves local messages',whatsapp)
 def graph_test():
  assert_true(ev("(()=>{const r=Duo.engine.shortestPath(Duo.demoMap.graph,'6-2','0-7');return r.path.length>2&&Number.isFinite(r.cost)&&r.path.every((id,i)=>i===0||Duo.demoMap.graph[r.path[i-1]].edges.some(e=>e.to===id))})()"))
  assert_true(ev("Duo.engine.shortestPath({a:{edges:[]},b:{edges:[]}},'a','b').path.length===0"))
  assert_true(ev("Duo.engine.shortestPath({a:{edges:[]}},'a','a').cost===0"))
 check('Dijkstra: connected, disconnected and zero-distance cases',graph_test)
 def map_test():
  r=app('maps');before=len(model('maps')['stops']);r.locator('[data-action=place][data-id=garden]').click();act('maps','add-stop');assert_true(len(model('maps')['stops'])==before+1);w=model('maps')['view']['w'];act('maps','zoom-in');assert_true(model('maps')['view']['w']<w);act('maps','simulate');page.wait_for_timeout(600);assert_true(ev("parseFloat(document.querySelector('[data-app=maps] .route-progress i').style.width)>1"));act('maps','simulate')
 check('Maps: add route stop, zoom and animate calculated route',map_test)
 def share():
  act('maps','share-route');page.locator('#system-dialog [data-target=whatsapp]').click();assert_true(ev("Duo.shell.getState().primary==='maps'&&Duo.shell.getState().secondary==='whatsapp'"));assert_true('Porto Alba' in model('whatsapp')['pending']['text']);page.locator('[data-app=whatsapp] [name=message]').fill('Here is the plan.');page.locator('[data-app=whatsapp] button[type=submit]').click();assert_true('Porto Alba' in model('whatsapp')['conversations'][0]['messages'][-1]['text'])
 check('Cross-app: Maps shares actual route into WhatsApp Split View',share)
 def split():
  handle=page.locator('.split-handle');handle.focus();handle.press('ArrowRight');assert_true(abs(ev('Duo.shell.getState().splitRatio')-.52)<.001);ev('Duo.shell.swap()');assert_true(ev("Duo.shell.getState().primary==='whatsapp'"));ev("Duo.shell.actions['save-pair']()");page.locator('#pair-name').fill('My route & conversation');page.locator('#save-pair-confirm').click();assert_true(ev("Duo.store.data.pairs[0].name==='My route & conversation'"))
 check('Split View: keyboard resize, swap sides and save app pair',split)
 def tiktok():
  r=app('tiktok');page.wait_for_function("document.querySelector('[data-app=tiktok] video').readyState>=2");r.locator('[data-action=play]').click();ev("document.querySelector('[data-app=tiktok] video').play()");page.wait_for_timeout(500);assert_true(ev("document.querySelector('[data-app=tiktok] video').currentTime>0.2"));act('tiktok','like');assert_true(model('tiktok')['liked']['dunes']);r.locator('[name=comment]').fill('A lovely local film.');r.locator('[name=comment]').press('Enter');assert_true(model('tiktok')['comments']['dunes'][-1]['text']=='A lovely local film.');act('tiktok','next');assert_true(model('tiktok')['index']==1)
 check('TikTok: real bundled playback, like, comment and next film',tiktok)
 def youtube():
  r=app('youtube');page.wait_for_function("document.querySelector('[data-app=youtube] video').readyState>=2");act('youtube','play');page.wait_for_timeout(400);assert_true(ev("document.querySelector('[data-app=youtube] video').currentTime>0"));r.locator('[data-tab=chapters]').click();r.locator('[data-action=chapter]').nth(2).click();assert_true(ev("document.querySelector('[data-app=youtube] video').currentTime>=9.9"));act('youtube','open-notes');r.locator('[name=notes]').fill('Remember this composition.');act('youtube','stamp');assert_true('[0:10]' in model('youtube')['notes']['dunes'] or '[0:11]' in model('youtube')['notes']['dunes']);act('youtube','captions');assert_true(model('youtube')['captions']);ev("window.retainedVideo=document.querySelector('[data-app=youtube] video');Duo.shell.setPosture('closed')");page.wait_for_timeout(300);assert_true(ev("retainedVideo===document.querySelector('[data-app=youtube] video')&&retainedVideo.currentTime>9"))
 check('YouTube: playback, seeking, notes, captions and fold continuity',youtube)
 def media_pause():
  ev('Duo.shell.home()');assert_true(ev("[...document.querySelectorAll('#workspace video')].every(v=>v.paused)"))
 check('Home suspends hidden media',media_pause)
 def theme():
  ev('Duo.shell.actions.dark()');page.wait_for_function("document.querySelector('#screen').classList.contains('dark')");ev('Duo.shell.actions.motion()');page.wait_for_function("document.body.classList.contains('reduce-motion')");ev('Duo.shell.actions.dark();Duo.shell.actions.motion()');page.wait_for_function("!document.querySelector('#screen').classList.contains('dark')&&!document.body.classList.contains('reduce-motion')")
 check('Appearance and reduced-motion controls affect rendered UI',theme)
 def import_test():
  raw=ev('Duo.store.export()');ev("Duo.store.data.apps.gmail.draft.subject='temporary change'");ev('(raw)=>Duo.store.import(raw)',raw);assert_true(ev("Duo.store.data.apps.gmail.draft.subject!=='temporary change'"));assert_true(ev('Duo.shell.getState().showingHome'))
  for id in ['chatgpt','threads','google','tiktok','whatsapp','instagram','youtube','maps','gmail','gemini']:app(id)
 check('Session: complete JSON round-trip and remount all ten apps',import_test)
 def invalid():
  for expr in ["v.version=99","v.apps.chatgpt.messages='bad'","v.apps.instagram.posts[0].dataURL='javascript:alert(1)'","v.apps.maps.view.w=0","v.apps.youtube.queue=[]","v.apps.unknown={}"]:
   rejected=ev("expr=>{const v=JSON.parse(Duo.store.export());Function('v',expr)(v);try{Duo.store.import(JSON.stringify(v));return false}catch{return true}}",expr);assert_true(rejected,expr)
  assert_true(ev("(()=>{try{Duo.store.import('{\"version\":1,\"apps\":{},\"__proto__\":{\"polluted\":true}}');return false}catch{return !({}).polluted}})()"))
 check('Session: malformed schemas, URLs, queues and prototype pollution rejected',invalid)
 def mobile():
  page.set_viewport_size({'width':393,'height':852});ev("Duo.shell.closeSecond();Duo.shell.open('chatgpt');Duo.shell.setPosture('closed');Duo.shell.touch()");page.wait_for_timeout(400);r=page.locator('[data-app=chatgpt]');r.locator('[data-pane=secondary]').click();assert_true(ev("document.querySelector('[data-app=chatgpt] .secondary-pane').clientWidth>0"));assert_true(ev('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(ROOT/'screenshots/06-direct-touch.png'));ev('Duo.shell.touch()');page.set_viewport_size({'width':1600,'height':1100});ev("Duo.shell.setPosture('open')")
 check('393-pixel touch layout: pane switching and no horizontal page overflow',mobile)
 def dialogs():
  ev("window.cleanups=[];Duo.dialog('First','<p>one</p>',()=>()=>cleanups.push('one'));Duo.dialog('Second','<p>two</p>',()=>()=>cleanups.push('two'))")
  page.wait_for_function("cleanups.join(',')==='one'");ev("document.querySelector('#system-dialog').close()");page.wait_for_function("cleanups.join(',')==='one,two'")
 check('Dialog replacement disposes resources exactly once',dialogs)
 def posture_sweep():
  for id in ['chatgpt','threads','google','tiktok','whatsapp','instagram','youtube','maps','gmail','gemini']:
   app(id);ev("id=>{window.sweepRoot=document.querySelector('#workspace [data-app=\"'+id+'\"]')}",id)
   for posture in ['open','book','tabletop','closed']:
    ev('p=>Duo.shell.setPosture(p)',posture);page.wait_for_timeout(70)
    assert_true(ev("sweepRoot.isConnected&&[...sweepRoot.querySelectorAll('.duo-panes > .pane')].some(p=>p.clientWidth>0&&p.clientHeight>0)"),id+': '+posture)
  ev("Duo.shell.setPosture('open')")
 check('All ten apps retain their instance through all four postures (40 states)',posture_sweep)
 def touch_postures():
  page.set_viewport_size({'width':393,'height':852});ev("Duo.shell.closeSecond();Duo.shell.open('chatgpt');Duo.shell.touch()")
  for posture in ['open','book','tabletop','closed']:
   ev('p=>Duo.shell.setPosture(p)',posture);page.wait_for_function("document.querySelector('[data-app=chatgpt] .pane-tabs').clientHeight>0&&document.querySelector('#screen').clientWidth===393")
   assert_true(ev("document.querySelector('[data-app=chatgpt] .pane-tabs').clientHeight>0"),posture)
   page.locator('#workspace [data-app=chatgpt] [data-pane=secondary]').click()
   assert_true(ev("document.querySelector('[data-app=chatgpt] .secondary-pane').clientWidth>0&&document.documentElement.scrollWidth<=innerWidth"),posture)
  ev("Duo.shell.touch();Duo.shell.setPosture('open')");page.set_viewport_size({'width':1600,'height':1100})
 check('Direct touch keeps both panes reachable from every simulated posture',touch_postures)
 check('No duplicate SVG gradient IDs',lambda:ev("(()=>{const ids=[...document.querySelectorAll('linearGradient,radialGradient')].map(x=>x.id);return new Set(ids).size===ids.length})()"))
 check('No unexpected JavaScript exceptions',lambda:len(errors)==0)
 check('No app-initiated HTTP or HTTPS requests',lambda:len(network)==0)
 environment=ev("({secureContext:isSecureContext,webGPU:!!navigator.gpu,renderer:Duo.gpu.mode,persistentStorage:Duo.store.persistent,userAgent:navigator.userAgent})")
 report={'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'results':results,'pageErrors':errors,'consoleErrors':console,'externalRequests':network,'environment':environment,'mode':'HTTP origin' if args.url else 'Offline content injection (browser URL policy blocks navigation in this environment)','boundaries':['WebGPU runtime and native camera/microphone permissions were not testable in the restricted browser context.','Session serialization/import was tested; persistent localStorage reload requires an unrestricted HTTP/HTTPS origin.','No physical iPhone Duo, Safari, VoiceOver, or real fold sensor was tested.']}
 (ROOT/'tests/browser-report.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({k:report[k] for k in ['passed','failed','pageErrors','environment']},indent=2),flush=True)
 b.close()
 raise SystemExit(1 if report['failed'] else 0)
