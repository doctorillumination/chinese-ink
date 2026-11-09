"""Serve one isolated preview with the repository's production-header handler."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util,sys
root=Path(sys.argv[1]).resolve()
spec=importlib.util.spec_from_file_location('paper_water_preview_headers',Path('/tmp/fieldworks-paper-water-20261108/scripts/serve.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
module.PagesHandler.rules=module.parse_headers_file((root/'_headers').read_text())
server=ThreadingHTTPServer(('127.0.0.1',0),partial(module.PagesHandler,directory=str(root)))
print(f'Preview URL: http://127.0.0.1:{server.server_port}/',flush=True)
server.serve_forever()
