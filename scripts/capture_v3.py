#!/usr/bin/env python3
"""Capture actual authoring, designer, debugger and full-simulator views."""
import argparse,os
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--chromium',default=os.getenv('CHROMIUM','/usr/bin/chromium'));a=p.parse_args()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1720,'height':1120},device_scale_factor=1)
 page.set_content((R/'dist/duo-studio.html').read_text(),wait_until='load');page.evaluate('Duo.ide.enter()');page.wait_for_function('Duo.ide.frame&&!Duo.ide.pending',timeout=30000)
 def shot(name):
  page.wait_for_timeout(250);page.screenshot(path=str(R/'screenshots'/('v3-'+name+'.png')));print('Captured',name)
 shot('source')
 app=page.evaluate('Duo.ide.project.addApp("Field Notes", "notes")');page.evaluate('Duo.ide.run()');page.wait_for_function('Duo.ide.frame&&!Duo.ide.pending&&Duo.ide.project.revision===Duo.ide.builtRevision')
 page.evaluate('id=>{Duo.ide.selectFile("views/"+id+".view.json");Duo.ide.send("design",{enabled:true});Duo.ide.send("select",{app:id,selector:\'[data-view-id="editor"]\'});}',app)
 page.wait_for_function('Duo.ide.selection?.viewId==="editor"');shot('designer')
 app=page.evaluate('Duo.ide.project.addApp("Orbit Counter")');page.evaluate('Duo.ide.run()');page.wait_for_function('Duo.ide.frame&&!Duo.ide.pending&&Duo.ide.project.revision===Duo.ide.builtRevision')
 page.evaluate('id=>{Duo.ide.toggleBreak(id,"increment");Duo.ide.send("invoke",{app:id,action:"increment"});}',app);page.wait_for_function('Duo.ide.paused');page.evaluate('Duo.ide.nav="breaks";Duo.ide.renderNavigator()');shot('debugger')
 page.evaluate('Duo.ide.send("resume");Duo.ide.exit();Duo.ide.send("home")');shot('simulator')
 page.evaluate('Duo.ide.enter();Duo.ide.setTab("design");Duo.ide.send("launch",{app:"pulse"})');shot('music')
 b.close()
