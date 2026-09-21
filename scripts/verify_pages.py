#!/usr/bin/env python3
"""Read-only public deployment validation; retries brief propagation delays."""
import hashlib,io,json,os,time,urllib.request,zipfile
BASE=os.getenv('SITE_URL','https://wieslawsoltes.github.io/DuoStudio/')
APPS='chatgpt threads google tiktok whatsapp instagram youtube maps gmail gemini draftline scenelab polyform pulse cutroom folio gridsheet keydeck inkpad arcade'.split()
def fetch(path):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'DuoStudio/3.0-PublicVerification'})
    with urllib.request.urlopen(req,timeout=40) as response:
        if response.status!=200 or not response.url.startswith(BASE):raise RuntimeError('Unexpected response for '+path)
        data=response.read();print(f'HTTP 200 {path or "/"}: {len(data):,} bytes');return data
for attempt in range(8):
    try:
        page=fetch('');manifest=json.loads(fetch('build-manifest.json'));assert page==fetch('duo-studio.html');assert manifest['version']=='3.0.0'
        assert hashlib.sha256(page).hexdigest()==manifest['sha256'] and len(page)==manifest['htmlBytes']
        assert b'DuoSources' in page and b'DuoKit' in page
        for app in APPS:assert ('/* SOURCE: src/apps/'+app+'.js */').encode() in page
        for path in ['manifest.webmanifest','sw.js','icon-192.png','icon-512.png']:fetch(path)
        raw=fetch('downloads/duo-studio-source.zip');assert hashlib.sha256(raw).hexdigest()==fetch('downloads/duo-studio-source.zip.sha256').decode().split()[0]
        inventory=json.loads(fetch('downloads/source-manifest.json'))
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            assert z.testzip() is None
            for entry in inventory['files']:
                value=z.read('duo-studio/'+entry['path']);assert len(value)==entry['bytes'] and hashlib.sha256(value).hexdigest()==entry['sha256']
            assert z.read('duo-studio/dist/duo-studio.html')==page
        print('Verified twenty-app HTTPS simulator, offline installation files and complete source checksums.');break
    except Exception:
        if attempt==7:raise
        time.sleep(12)
