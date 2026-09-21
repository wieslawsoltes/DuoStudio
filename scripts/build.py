#!/usr/bin/env python3
"""Build the SDK, editable source bundle, developer IDE, and standalone simulator."""
from pathlib import Path
import base64, json, hashlib, re
ROOT=Path(__file__).resolve().parents[1]
APPS='chatgpt threads google tiktok whatsapp instagram youtube maps gmail gemini draftline scenelab polyform pulse cutroom folio gridsheet keydeck inkpad arcade'.split()
ASSET_TYPES={'.jpg':'image/jpeg','.mp4':'video/mp4'}
def script_json(value):
    return json.dumps(value,ensure_ascii=True,separators=(',',':')).replace('<','\\u003c')
def build():
    assets={p.name:f'data:{ASSET_TYPES[p.suffix]};base64,'+base64.b64encode(p.read_bytes()).decode('ascii') for p in sorted((ROOT/'assets').iterdir()) if p.suffix in ASSET_TYPES}
    order=['sdk/duokit.js','src/icons.js','src/core.js','src/data.js','src/gpu.js']+['src/engines/'+n+'.js' for n in ['studio','formula','formats','geometry','renderer3d','audio']]+['sdk/host.js']+[f'src/apps/{a}.js' for a in APPS]+['src/system/everyday.js','src/shell.js','src/system/simulator.js']
    files={p:(ROOT/p).read_text() for p in order+['src/template.html','src/styles.css','src/studio.css','sdk/duokit.css']}
    for p in sorted((ROOT/'views').glob('*.json')):files[p.relative_to(ROOT).as_posix()]=p.read_text()
    bundle={'version':'3.0.0','files':files,'order':order,'runtime':(ROOT/'src/ide/runtime.js').read_text(),'previewCSS':(ROOT/'src/ide/preview.css').read_text()}
    chunks=[]
    for path in order:
        chunks.append('\n/* SOURCE: '+path+' */\n'+files[path])
        if path=='src/icons.js':chunks.append('\nwindow.Duo.assets='+script_json(assets)+';\n')
    chunks += ['\n/* SOURCE: vendor/acorn.js */\n'+(ROOT/'vendor/acorn.js').read_text(),'\nwindow.DuoSources='+script_json(bundle)+';\n']
    for name in ['project','ide']:chunks.append('\n/* SOURCE: src/ide/'+name+'.js */\n'+(ROOT/f'src/ide/{name}.js').read_text())
    js=re.sub(r'</script',r'<\\/script','\n'.join(chunks),flags=re.IGNORECASE)
    css='\n'.join(files[n] for n in ['src/styles.css','src/studio.css','sdk/duokit.css'])+'\n'+(ROOT/'src/ide/ide.css').read_text()
    html=files['src/template.html'].replace('/*__STYLES__*/',css).replace('/*__SCRIPTS__*/',js)
    (ROOT/'dist').mkdir(exist_ok=True)
    for n in ['index.html','duo-studio.html']:(ROOT/'dist'/n).write_text(html)
    data=html.encode(); manifest={'version':'3.0.0','htmlBytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'assets':{k:len(v) for k,v in assets.items()},'sources':order,'sourceBundleFiles':len(files),'externalRuntimeDependencies':[]}
    (ROOT/'dist/build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    from build_pwa import build as build_pwa
    build_pwa()
    print(f'Built {len(data):,} bytes; {len(files)} editable sources; {len(assets)} inline media assets.')
if __name__=='__main__':build()
