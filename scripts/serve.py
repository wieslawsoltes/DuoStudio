#!/usr/bin/env python3
"""Serve the already-built standalone app. Python standard library only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', default='127.0.0.1', help='Defaults to loopback; use HTTPS when hosting for other devices.')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('port must be in the range 1–65535')
    root = Path(__file__).resolve().parents[1] / 'dist'
    if not (root / 'duo-studio.html').is_file():
        parser.error('Build first: python3 scripts/build.py')
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    try:
        with ThreadingHTTPServer((args.host, args.port), handler) as server:
            print(f'Duo Studio: http://{args.host}:{args.port}/duo-studio.html', flush=True)
            print('Ctrl+C stops the server. This server does not provide TLS.', flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print('\nServer stopped.')
    except OSError as error:
        parser.exit(1, f'Could not start server: {error}\n')


if __name__ == '__main__':
    main()
