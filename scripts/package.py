#!/usr/bin/env python3
"""Create a reproducible source ZIP containing the complete offline application."""
from pathlib import Path
import argparse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = {
    '01-launcher.png', '02-conversation-canvas.png',
    '03-map-and-conversation.png', '04-gallery-and-detail.png',
    '05-film-and-notebook.png', '06-tabletop.png',
    '07-folded.png', '08-direct-touch.png',
}
ROOT_FILES = {
    'README.md', 'LICENSE', '.gitignore', 'package.json',
    'requirements-dev.txt', 'requirements-assets.txt',
}
TEST_FILES = {'test_browser.py', 'browser-report.json', 'static-report.json'}


def included(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if '__pycache__' in relative.parts or path.suffix in {'.pyc', '.log'}:
        return False
    if len(relative.parts) == 1:
        return relative.name in ROOT_FILES
    top = relative.parts[0]
    if top in {'src', 'assets', 'dist', 'docs', 'scripts'}:
        return True
    if top == 'tests':
        return relative.name in TEST_FILES
    if top == 'screenshots':
        return relative.name in SCREENSHOTS
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / 'duo-studio-source.zip')
    args = parser.parse_args()
    required = ROOT / 'dist/duo-studio.html'
    if not required.exists():
        parser.error('Build first: python3 scripts/build.py')
    paths = sorted(p for p in ROOT.rglob('*') if p.is_file() and included(p))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in paths:
            info = zipfile.ZipInfo('duo-studio/' + path.relative_to(ROOT).as_posix(), (2026, 9, 20, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes(), compresslevel=9)
    with zipfile.ZipFile(args.output) as archive:
        bad = archive.testzip()
        if bad:
            raise RuntimeError('Archive CRC verification failed: ' + bad)
    print(f'{args.output}: {len(paths)} files, {args.output.stat().st_size:,} bytes; CRC verified.')


if __name__ == '__main__':
    main()
