#!/usr/bin/env python3
"""Package all readable source, offline assets, tests and distributions reproducibly."""
from pathlib import Path
import hashlib,json,shutil,zipfile
R=Path(__file__).resolve().parents[1]
def included(p):
    rel=p.relative_to(R)
    if any(v in {'.git','__pycache__','node_modules','.import-v2','releases','_site'} for v in rel.parts):return False
    if p.name.startswith(('failure-','export-fixture.','smoke_v2')) or p.suffix in {'.log','.pyc'}:return False
    return rel.parts[0] in {'src','assets','dist','scripts','docs','tests','screenshots','.github'} or (len(rel.parts)==1 and p.name in {'README.md','LICENSE','package.json','.gitignore','requirements-assets.txt','requirements-dev.txt','duo-studio.html','duo-studio-preview.png'})
def main():
    shutil.copyfile(R/'dist/duo-studio.html',R/'duo-studio.html')
    if (R/'screenshots/v2-home.png').exists():shutil.copyfile(R/'screenshots/v2-home.png',R/'duo-studio-preview.png')
    files=sorted(p for p in R.rglob('*') if p.is_file() and included(p));releases=R/'releases';releases.mkdir(exist_ok=True)
    inventory={'version':'2.0.0','files':[{'path':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
    path=releases/'duo-studio-source.zip'
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in files:
            info=zipfile.ZipInfo('duo-studio/'+p.relative_to(R).as_posix(),(2026,9,21,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,p.read_bytes(),compresslevel=9)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        for entry in inventory['files']:assert hashlib.sha256(z.read('duo-studio/'+entry['path'])).hexdigest()==entry['sha256']
    digest=hashlib.sha256(path.read_bytes()).hexdigest();(releases/'duo-studio-source.zip.sha256').write_text(digest+'  duo-studio-source.zip\n');(releases/'source-manifest.json').write_text(json.dumps(inventory,indent=2)+'\n')
    print(f'{len(files)} files; {path.stat().st_size:,} bytes; CRC and all entry hashes verified; SHA256 {digest}')
if __name__=='__main__':main()
