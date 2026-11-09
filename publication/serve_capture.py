"""Loopback capture receiver with fixed output paths."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_POST(self):
  names={'/capture/paper-water-canvas.webm':'canvas.webm','/capture/paper-water-capture.json':'capture.json'}
  if self.path not in names:self.send_error(404);return
  length=int(self.headers.get('Content-Length','0'))
  if not 0<length<20*1024*1024:self.send_error(413);return
  (ROOT/'publication'/names[self.path]).write_bytes(self.rfile.read(length));self.send_response(201);self.end_headers();self.wfile.write(b'Saved locally')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
print(f'Capture URL: http://127.0.0.1:{server.server_port}/publication/capture.html',flush=True)
server.serve_forever()
