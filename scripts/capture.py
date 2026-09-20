#!/usr/bin/env python3
"""Capture real app states from the bundled HTML; optional Python Playwright tool."""
from pathlib import Path
import argparse
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--chromium', default=os.environ.get('CHROMIUM', '/usr/bin/chromium'))
parser.add_argument('--url')
args = parser.parse_args()
output = ROOT / 'screenshots'
output.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1120}, device_scale_factor=1)
    page.set_default_timeout(10000)
    if args.url:
        page.goto(args.url, wait_until='load')
    else:
        page.set_content((ROOT / 'dist/duo-studio.html').read_text(), wait_until='load')
    page.wait_for_function('Duo.ready')
    page.wait_for_timeout(800)

    def ev(js):
        return page.evaluate(js)

    def shot(name):
        # Wait for folding transitions and any feedback toast to finish.
        page.wait_for_timeout(750)
        page.wait_for_function("!document.querySelector('#toast-host .toast')", timeout=12000)
        page.screenshot(path=str(output / name), full_page=True)
        print(name, flush=True)

    def open_app(name):
        page.evaluate("id=>{Duo.shell.closeSecond();Duo.shell.setPosture('open');Duo.shell.open(id)}", name)
        page.wait_for_timeout(650)

    def act(app, name):
        page.locator(f'#workspace [data-app={app}] [data-action="{name}"]').first.click()

    shot('01-launcher.png')
    open_app('chatgpt')
    shot('02-conversation-canvas.png')

    open_app('maps')
    page.locator('[data-app=maps] [data-action=place][data-id=garden]').click()
    act('maps', 'add-stop')
    act('maps', 'share-route')
    page.locator('#system-dialog [data-target=whatsapp]').click()
    page.locator('#workspace [data-app=maps] [data-pane=secondary]').click()
    page.locator('#workspace [data-app=whatsapp] [name=message]').fill('A coffee, a gallery, then the long way home. Shall we?')
    shot('03-map-and-conversation.png')

    open_app('instagram')
    shot('04-gallery-and-detail.png')

    open_app('youtube')
    page.wait_for_function("document.querySelector('[data-app=youtube] video').readyState>=2")
    act('youtube', 'open-notes')
    page.locator('[data-app=youtube] [name=notes]').fill('A study in stillness\n\n[0:04] Let the horizon breathe.\n\n[0:10] Keep the frame wide. A quiet score, a slow change of light.\n\nIdeas worth keeping, without leaving the film.')
    ev("document.querySelector('[data-app=youtube] video').currentTime=6")
    page.wait_for_timeout(500)
    shot('05-film-and-notebook.png')
    ev("Duo.shell.setPosture('tabletop')")
    shot('06-tabletop.png')

    open_app('chatgpt')
    ev("Duo.shell.setPosture('closed')")
    shot('07-folded.png')

    page.set_viewport_size({'width': 393, 'height': 852})
    ev('Duo.shell.touch()')
    page.wait_for_timeout(500)
    page.locator('[data-app=chatgpt] [data-pane=secondary]').click()
    shot('08-direct-touch.png')
    browser.close()
