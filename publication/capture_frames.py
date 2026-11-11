"""Render Paper Water frames at fixed times through a loopback browser page."""
import argparse
import hashlib
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


FPS = 60
FRAMES = 510
WARMUP = 120
RUNTIME = Path(__file__).resolve().parents[1] / 'index.html'
CLOCK = b'''<script>
  let pendingFrame;
  Object.defineProperty(window, 'devicePixelRatio', { value: 1 });
  window.requestAnimationFrame = callback => { pendingFrame = callback; };
  window.renderCaptureFrame = time => pendingFrame(time);
</script>'''

PAGE = '''<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Paper Water frame capture</title>
<style>iframe{display:block;width:960px;height:720px;border:0}body{font:16px system-ui}output{margin-left:1em}</style>
<button id="start" disabled>Capture 60 fps frames</button><output id="status">Loading artwork</output>
<iframe title="Paper Water capture canvas"></iframe>
<script>
const frame = document.querySelector('iframe');
const button = document.querySelector('#start');
const status = document.querySelector('#status');
const fps = __FPS__;
const total = __FRAMES__;
const warmup = __WARMUP__;

async function save(path, body) {
  const response = await fetch(path, { method: 'POST', body });
  if (!response.ok) throw new Error(`Could not save ${path}: ${response.status}`);
}

frame.onload = () => {
  button.disabled = false;
  status.textContent = 'Ready';
};
frame.src = '/runtime';
button.onclick = async () => {
  button.disabled = true;
  try {
    const artwork = frame.contentWindow;
    const canvas = frame.contentDocument.querySelector('canvas');
    if (canvas.width !== 960 || canvas.height !== 720) throw new Error('Unexpected canvas dimensions');
    status.textContent = 'Warming up the simulation';
    for (let index = 0; index < warmup; index++) artwork.renderCaptureFrame(index * 1000 / fps);
    for (let index = 0; index < total; index++) {
      artwork.renderCaptureFrame((warmup + index) * 1000 / fps);
      const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!png) throw new Error(`Canvas capture failed at frame ${index}`);
      await save(`/frames/${index}`, png);
      status.textContent = `Saved ${index + 1} of ${total} frames`;
    }
    await save('/complete', JSON.stringify({
      canvas_width: canvas.width,
      canvas_height: canvas.height,
      final_simulation_time: Number(frame.contentDocument.querySelector('#scene').dataset.simulationTime),
    }));
    status.textContent = `Complete: ${total} frames captured`;
  } catch (error) {
    status.textContent = error.message;
  }
};
</script>
</html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='A new directory for the PNG sequence')
    output = parser.parse_args().output
    output.mkdir()
    runtime = RUNTIME.read_bytes()
    assert runtime.count(b'<script>') == 1
    capture_runtime = runtime.replace(b'<script>', CLOCK + b'\n<script>', 1)
    page = PAGE.replace('__FPS__', str(FPS)).replace('__FRAMES__', str(FRAMES)).replace('__WARMUP__', str(WARMUP))
    frame_hashes = []

    class Handler(BaseHTTPRequestHandler):
        def send(self, code, data, content_type='text/plain'):
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == '/':
                self.send(200, page.encode(), 'text/html; charset=utf-8')
            elif self.path == '/runtime':
                self.send(200, capture_runtime, 'text/html; charset=utf-8')
            else:
                self.send_error(404)

        def do_POST(self):
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4_000_000:
                self.send_error(413)
                return
            data = self.rfile.read(length)
            index = len(frame_hashes)
            if index < FRAMES and self.path == f'/frames/{index}' and data.startswith(b'\x89PNG\r\n\x1a\n'):
                (output / f'{index:04d}.png').write_bytes(data)
                frame_hashes.append(hashlib.sha256(data).hexdigest())
            elif self.path == '/complete' and index == FRAMES:
                report = json.loads(data)
                report.update(
                    kind='actual browser canvas rendered at fixed time intervals',
                    source_runtime_sha256=hashlib.sha256(runtime).hexdigest(),
                    capture_driver_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                    capture_fps=FPS,
                    captured_frames=FRAMES,
                    warmup_frames=WARMUP,
                    distinct_png_frames=len(set(frame_hashes)),
                    frame_sequence_sha256=hashlib.sha256(''.join(frame_hashes).encode()).hexdigest(),
                )
                (output / 'capture.json').write_text(json.dumps(report, indent=2) + '\n')
                print(f'Saved {index} frames to {output}', flush=True)
            else:
                self.send_error(409)
                return
            self.send(201, b'Saved')

        def log_message(self, format, *args):
            if self.command != 'POST':
                super().log_message(format, *args)

    with HTTPServer(('127.0.0.1', 0), Handler) as server:
        print(f'http://127.0.0.1:{server.server_port}/', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    main()
