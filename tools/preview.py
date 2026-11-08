#!/usr/bin/env python3
"""Serve the self-contained pond locally and optionally open Chrome."""

import argparse
import functools
import http.server
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parent.parent


def same_pond(url):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            return response.read() == (ROOT / "index.html").read_bytes()
    except (OSError, urllib.error.URLError):
        return False


def open_chrome(url):
    if sys.platform == "darwin":
        result = subprocess.run(["/usr/bin/open", "-a", "Google Chrome", url], check=False)
        if result.returncode:
            print(f"Open this address in Chrome: {url}", flush=True)
    else:
        print(f"Open this address in your browser: {url}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8876)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    url = f"http://127.0.0.1:{args.port}/"
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError:
        if same_pond(url):
            print(f"The pond is already running at {url}", flush=True)
            if not args.no_browser:
                open_chrome(url)
            return
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    url = f"http://127.0.0.1:{server.server_port}/"
    print(f"Ink pond is running at {url}", flush=True)
    print("Keep this window open while viewing. Press Control-C to stop the server.", flush=True)
    if not args.no_browser:
        open_chrome(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nInk pond server stopped.", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
