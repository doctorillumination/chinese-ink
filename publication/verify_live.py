"""Verify deployed Paper Water assets against the reviewed publication worktrees."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import re
import urllib.request

HERE = Path(__file__).resolve().parent
SITES = {
    'fieldworks': ('https://fieldworks.space/', Path('/tmp/fieldworks-paper-water-20261108/public'), ''),
    'cyberdelic': ('https://cyberdelic.space/', Path('/tmp/cyberdelic-paper-water-20261108'), 'fieldworks/'),
}
sha = lambda data: hashlib.sha256(data).hexdigest()

def verify(name):
    base, root, prefix = SITES[name]
    release = json.loads((HERE / 'release.json').read_text())
    catalog = json.loads((root / 'fieldworks.json').read_text())
    paths = [
        'fieldworks.json', 'narrations.json', 'paper-water-player.css', 'paper-water-player.js',
        'fieldwork-runtime/paper-water/THREE-LICENSE.txt',
        prefix + 'sources.json', prefix + 'previews/captures.json',
        prefix + 'readings/paper-water.md', prefix + 'readings/overview.md',
        prefix + 'readings/overview-eleven-works.md', prefix + 'images/paper-water.jpg',
        prefix + 'previews/paper-water.mp4',
        prefix + 'releases/paper-water-' + release['release_id'] + '.json',
    ]
    narrations = json.loads((root / 'narrations.json').read_text())
    readings = [item for item in narrations['items'] if item['id'] in ['fieldworks-paper-water', 'fieldworks-overview']]
    assert len(readings) == 2
    for item in readings:
        paths.extend([item['audio_path'], item['reading_path']])
    if name == 'cyberdelic':
        paths.extend(['artwork-bundles.json', 'artwork-bundles/paper-water.zip', 'audio-bundles/lewis-27.zip', 'cyberdelic-space.zip'])

    def fetch(path):
        request = urllib.request.Request(base + path, headers={'User-Agent': 'PaperWaterPublicationVerification/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read(), dict(response.headers)

    def exact(path):
        data, headers = fetch(path)
        assert sha(data) == sha((root / path).read_bytes()), (name, path, 'deployed bytes differ')
        return {'path': path, 'bytes': len(data), 'sha256': sha(data), 'content_type': headers.get('Content-Type', headers.get('content-type'))}

    with ThreadPoolExecutor(max_workers=5) as pool:
        files = list(pool.map(exact, paths))
    runtime, headers = fetch('fieldwork-runtime/paper-water/')
    local = (root / 'fieldwork-runtime/paper-water/index.html').read_text()
    text = runtime.decode()
    for tag in ['script', 'style']:
        expected = re.findall(r'<' + tag + r'\b[^>]*>(.*?)</' + tag + '>', local, re.S)
        actual = re.findall(r'<' + tag + r'\b[^>]*>(.*?)</' + tag + '>', text, re.S)
        for block in expected:
            assert block in actual, (name, tag, 'artwork code changed')
    assert '<title>Paper Water</title>' in text
    assert 'frame-ancestors' in headers.get('Content-Security-Policy', headers.get('content-security-policy', ''))
    viewer, _ = fetch(prefix + 'paper-water/')
    assert b'paper-water-player.css' in viewer and b'paper-water-player.js' in viewer
    gallery, _ = fetch(prefix)
    assert b'Enter Paper Water' in gallery and b'paper-water/#about' in gallery
    live_catalog, _ = fetch('fieldworks.json')
    assert json.loads(live_catalog)['items'] == catalog['items']
    result = {'site': base, 'verified_at': datetime.now(timezone.utc).isoformat(), 'viewer': base + prefix + 'paper-water/', 'release_id': release['release_id'], 'gallery_order': [item['slug'] for item in catalog['items']], 'runtime_title': 'Paper Water', 'runtime_script_and_style_exact': True, 'files': files}
    (HERE / ('live-' + name + '.json')).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'site': name, 'verified_assets': len(files), 'runtime_script_and_style_exact': True, 'viewer': result['viewer']}), flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('site', choices=SITES)
    verify(parser.parse_args().site)
