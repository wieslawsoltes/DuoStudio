#!/usr/bin/env python3
"""Produce actual browser screenshots of creative tools and simulator layouts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,os
R=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--chromium',default=os.getenv('CHROMIUM','/usr/bin/chromium'));a=p.parse_args()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1600,'height':1120})
 page.set_content((R/'dist/duo-studio.html').read_text());page.wait_for_function('window.Duo?.simulator');page.evaluate('Duo.store.data.prefs.reducedMotion=true;Duo.shell.refresh()')
 for app in ['home','draftline','scenelab','polyform','pulse','cutroom','folio','gridsheet','keydeck','inkpad','arcade']:
  page.evaluate('id=>id==="home"?Duo.shell.home():Duo.shell.open(id)',app);page.wait_for_timeout(250)
  if app=='inkpad':page.evaluate('Duo.shell.getInstance("inkpad").actions["ink-demo"]()');page.wait_for_timeout(100)
  page.screenshot(path=str(R/f'screenshots/v2-{app}.png'),full_page=True)
 page.evaluate('Duo.shell.pair("draftline","scenelab")');page.wait_for_timeout(300);page.screenshot(path=str(R/'screenshots/v2-pair.png'),full_page=True)
 page.evaluate('Duo.simulator.set("stack","vertical");Duo.shell.setPosture("tabletop")');page.wait_for_timeout(300);page.screenshot(path=str(R/'screenshots/v2-tabletop.png'),full_page=True)
 page.set_viewport_size({'width':393,'height':852});page.evaluate('Duo.shell.closeSecond();Duo.shell.open("pulse");Duo.shell.touch()');page.wait_for_timeout(200);page.screenshot(path=str(R/'screenshots/v2-touch.png'),full_page=True)
 b.close()
