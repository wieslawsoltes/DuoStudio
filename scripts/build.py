#!/usr/bin/env python3
"""Build a dependency-free, offline single-file application from readable sources."""
from pathlib import Path
import base64, json, hashlib, re
ROOT = Path(__file__).resolve().parents[1]
APPS = ['chatgpt','threads','google','tiktok','whatsapp','instagram','youtube','maps','gmail','gemini','draftline','scenelab','polyform','pulse','cutroom','folio','gridsheet','keydeck','inkpad','arcade']
ASSET_TYPES = {'.jpg':'image/jpeg','.mp4':'video/mp4'}
def build():
    assets = {p.name: f'data:{ASSET_TYPES[p.suffix]};base64,' + base64.b64encode(p.read_bytes()).decode('ascii') for p in sorted((ROOT/'assets').iterdir()) if p.suffix in ASSET_TYPES}
    sources = ['icons.js','core.js','data.js','gpu.js'] + ['engines/'+n+'.js' for n in ['studio','formula','formats','geometry','renderer3d','audio']] + [f'apps/{a}.js' for a in APPS] + ['system/everyday.js','shell.js','system/simulator.js']
    chunks=[]
    for i,name in enumerate(sources):
        chunks.append(f'\n/* SOURCE: src/{name} */\n'+(ROOT/'src'/name).read_text())
        if i==0: chunks.append('\nwindow.Duo.assets = '+json.dumps(assets,separators=(',',':'))+';\n')
    js='\n'.join(chunks)
    # Prevent script-like text in template literals from terminating the host script.
    js=re.sub(r'</script',r'<\\/script',js,flags=re.IGNORECASE)
    html=(ROOT/'src/template.html').read_text().replace('/*__STYLES__*/',(ROOT/'src/styles.css').read_text()+'\n'+(ROOT/'src/studio.css').read_text()).replace('/*__SCRIPTS__*/',js)
    (ROOT/'dist').mkdir(exist_ok=True)
    out=ROOT/'dist/duo-studio.html';out.write_text(html)
    (ROOT/'dist/index.html').write_text(html)
    manifest={'version':'2.0.0','htmlBytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'assets':{k:len(v) for k,v in assets.items()},'sources':sources,'externalRuntimeDependencies':[]}
    (ROOT/'dist/build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    from build_pwa import build as build_pwa
    build_pwa()
    print(f'Built {out}: {out.stat().st_size:,} bytes; {len(assets)} inline assets; no external runtime dependencies.')
if __name__=='__main__': build()
