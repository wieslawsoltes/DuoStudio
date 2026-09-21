#!/usr/bin/env python3
"""Finish the interrupted, checksum-verified DuoKit source transfer once."""
from pathlib import Path, PurePosixPath
import base64
import hashlib
import json
import lzma

PREFIX_SHA = '1d3a7a53adb3c5de44915d45f3e7d5c00cef805bd83bd649f3fed69dd7880b9a'
FINAL_SHA = 'f6b13765691a3b0ce5022f7d31bff292e7464c04b25e364927adbcca8dddd0fc'
ROOTS = {'src', 'sdk', 'vendor', 'views', 'scripts', 'tests', 'docs', 'README.md', 'package.json', '.gitignore'}

def safe(name):
    p = PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0] not in ROOTS:
        raise ValueError('Unsafe source path: ' + name)
    return Path(name)

def verified(encoded, expected):
    data = base64.b64decode(encoded, validate=True)
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('Source transfer checksum mismatch')
    return data

packed = verified(''.join((Path('.changes') / f'{i:02}.b64').read_text().strip() for i in range(5)), PREFIX_SHA)
text = lzma.LZMADecompressor().decompress(packed).decode('utf-8')
if not text.startswith('{"files":{'):
    raise ValueError('Unexpected source envelope')
decoder = json.JSONDecoder()
pos = len('{"files":{')
recovered = {}
while True:
    while text[pos] in ' \r\n\t,':
        pos += 1
    name, pos = decoder.raw_decode(text, pos)
    while text[pos] in ' \r\n\t:':
        pos += 1
    start = pos
    try:
        value, pos = decoder.raw_decode(text, pos)
    except json.JSONDecodeError:
        if name != 'tests/test_ide.py' or len(recovered) != 16:
            raise ValueError('Unexpected incomplete source boundary')
        break
    if not isinstance(value, str):
        raise ValueError('Source must be UTF-8 text')
    recovered[name] = value

partial = None
for trim in range(16):
    raw = text[start:]
    try:
        partial = json.loads((raw[:-trim] if trim else raw) + '"')
        break
    except json.JSONDecodeError:
        pass
if partial is None or " # Use the browser's real debugger" not in partial:
    raise ValueError('Cannot locate test recovery boundary')
extra = json.loads(lzma.decompress(verified(Path('.changes/final.b64').read_text().strip(), FINAL_SHA)))
# Validate every baseline before writing anything: fail on concurrent source edits.
patched = {}
for name, patch in extra['patches'].items():
    original = safe(name).read_bytes()
    if hashlib.sha256(original).hexdigest() != patch['before']:
        raise ValueError('Baseline changed: ' + name)
    lines = original.decode('utf-8').splitlines(keepends=True)
    for start_line, end_line, replacement in reversed(patch['edits']):
        lines[start_line:end_line] = replacement
    data = ''.join(lines).encode('utf-8')
    if hashlib.sha256(data).hexdigest() != patch['after']:
        raise ValueError('Patch result mismatch: ' + name)
    patched[name] = data

sources = {**recovered, **extra['files']}
sources['tests/test_ide.py'] = partial[:partial.index(" # Use the browser's real debugger")] + extra['testTail']
for name in sources:
    safe(name)
for name, value in sources.items():
    target = safe(name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value, encoding='utf-8')
for name, value in patched.items():
    safe(name).write_bytes(value)
Path('views').mkdir(exist_ok=True)
apps = list(Path('src/apps').glob('*.js'))
if len(apps) != 20:
    raise ValueError('Expected twenty baseline apps')
for app in apps:
    layout = Path('views') / (app.stem + '.layout.json')
    if not layout.exists():
        layout.write_text(json.dumps({'version': 1, 'patches': []}, indent=2) + '\n', encoding='utf-8')
print(f'Recovered {len(recovered)} original source files; restored {len(patched)} verified patches and complete IDE tests.')
