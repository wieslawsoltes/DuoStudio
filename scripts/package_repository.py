#!/usr/bin/env python3
"""Package the complete repository distribution, including CI and standalone files."""
from __future__ import annotations

import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = {'.github', 'src', 'assets', 'dist', 'docs', 'scripts', 'tests', 'screenshots'}
ROOT_FILES = {'README.md', 'LICENSE', '.gitignore', 'package.json',
              'requirements-assets.txt', 'requirements-dev.txt',
              'duo-studio.html', 'duo-studio-preview.png'}


def included(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if path.is_symlink() or not path.is_file():
        return False
    if '__pycache__' in relative.parts or path.suffix in {'.pyc', '.log'}:
        return False
    if relative.name.startswith('failure-'):
        return False
    return relative.name in ROOT_FILES if len(relative.parts) == 1 else relative.parts[0] in DIRECTORIES


def main() -> None:
    for required in ('dist/duo-studio.html', 'screenshots/01-launcher.png',
                     'assets/dunes.mp4', 'assets/coast.mp4', 'assets/alpine.mp4',
                     'tests/browser-report.json', '.github/workflows/pages.yml'):
        if not (ROOT / required).is_file():
            raise SystemExit(f'Missing required distribution file: {required}')
    shutil.copyfile(ROOT / 'dist/duo-studio.html', ROOT / 'duo-studio.html')
    shutil.copyfile(ROOT / 'screenshots/01-launcher.png', ROOT / 'duo-studio-preview.png')
    paths = sorted(path for path in ROOT.rglob('*') if included(path))
    entries = [(path.relative_to(ROOT).as_posix(), path.read_bytes()) for path in paths]
    manifest = {'format': 1, 'files': [
        {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        for name, data in entries
    ]}
    manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    output = ROOT / 'releases'
    output.mkdir(exist_ok=True)
    archive_path = output / 'duo-studio-source.zip'
    temporary = archive_path.with_suffix('.zip.tmp')
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name, data in entries + [('SOURCE-MANIFEST.json', manifest_bytes)]:
                info = zipfile.ZipInfo('duo-studio/' + name, (2026, 9, 20, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data, compresslevel=9)
        with zipfile.ZipFile(temporary) as archive:
            bad = archive.testzip()
            if bad:
                raise RuntimeError('ZIP CRC validation failed: ' + bad)
            for name, data in entries:
                if archive.read('duo-studio/' + name) != data:
                    raise RuntimeError('ZIP round-trip mismatch: ' + name)
        temporary.replace(archive_path)
    finally:
        temporary.unlink(missing_ok=True)
    (output / 'source-manifest.json').write_bytes(manifest_bytes)
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    (output / 'duo-studio-source.zip.sha256').write_text(digest + '  duo-studio-source.zip\n')
    print(f'{archive_path}: {len(entries) + 1} files, {archive_path.stat().st_size:,} bytes; CRC and all bytes verified.')
    print('SHA-256:', digest)


if __name__ == '__main__':
    main()
