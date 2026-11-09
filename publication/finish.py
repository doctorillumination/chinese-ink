"""Finish the two source-bound readings and preserve earlier portable assets."""
from pathlib import Path
import hashlib, importlib.util, json, re, subprocess, sys, zipfile
HERE=Path(__file__).resolve().parent
STUDIO=Path('/Users/bradley/Desktop/1 Art/8 Creative Coding/cyberdelic-studio')
PRESS=Path('/tmp/cyberdelic-paper-water-20261108');SITE=Path('/tmp/fieldworks-paper-water-20261108/public')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def dump(path,data):path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
old=json.loads((HERE/'press-narrations-before.json').read_text());catalog=json.loads((PRESS/'narrations.json').read_text());parts=old['mirror_audio_bundles'];packaged=set()
for part in parts:
 assert sha(PRESS/part['path'])==part['sha256']
 with zipfile.ZipFile(PRESS/part['path']) as archive:packaged.update(archive.namelist())
expected={item['audio_path'] for item in catalog['items']};assert packaged.issubset(expected);missing=sorted(expected-packaged);assert len(missing)==2,missing
name=f'audio-bundles/lewis-{len(parts)+1:02d}.zip'
with zipfile.ZipFile(PRESS/name,'w',zipfile.ZIP_STORED) as archive:
 for path in missing:
  info=zipfile.ZipInfo(path,date_time=(1980,1,1,0,0,0));info.external_attr=0o644<<16;archive.writestr(info,(PRESS/path).read_bytes())
parts.append({'path':name,'sha256':sha(PRESS/name),'length':(PRESS/name).stat().st_size});catalog['mirror_audio_bundles']=parts;dump(PRESS/'narrations.json',catalog)
sys.path.insert(0,str(STUDIO/'reader'))
from templates import recorded_mirror_section
p=PRESS/'mirror/index.html';text,count=re.subn(r'<section id="lewis-mirror">.*?</section>',recorded_mirror_section(parts),p.read_text(),flags=re.S);assert count==1;p.write_text(text)
spec=importlib.util.spec_from_file_location('paper_water_mirror',PRESS/'.github/scripts/mirror_archive.py');mirror=importlib.util.module_from_spec(spec);spec.loader.exec_module(mirror);mirror.build_core_mirror(PRESS);mirror.validate_mirror(PRESS)
for root,label in [(PRESS,'press'),(SITE,'standalone')]:
 frozen=json.loads((HERE/(label+'-frozen.json')).read_text());changes=[]
 for path,digest in frozen.items():
  if sha(root/path)==digest:continue
  assert path.startswith('audio/') and path.endswith('.json'),path
  repo=root.parent if label=='standalone' else root
  before=json.loads(subprocess.check_output(['git','show','HEAD:'+('public/' if label=='standalone' else '')+path],cwd=repo));after=json.loads((root/path).read_text())
  for key in ['audio_sha256','audio_length','text_sha256','document_sha256','chunks','checks']:assert before[key]==after[key],(path,key)
  assert 'overview' in before['id'] and 'overview-eleven-works' in after['id'],path
  changes.append(path)
 print(label+': earlier runtimes, media, MP3s, source bytes, and ZIP parts preserved. Overview metadata aliases: '+str(len(changes)),flush=True)
provenance=json.loads((SITE/'provenance.json').read_text())
for path in SITE.rglob('*'):
 if path.is_file() and path.name!='provenance.json':provenance['files'][path.relative_to(SITE).as_posix()]=sha(path)
release=json.loads((HERE/'release.json').read_text());provenance.setdefault('artwork_additions',[]).append({'slug':'paper-water','release_id':release['release_id'],'repository':release['source_record']['repository'],'revision':release['source_record']['revision'],'published_at':release['published_at']});dump(SITE/'provenance.json',provenance)
print('Finished both narration catalogs, new audio part, Paper Water artwork part, and bounded deterministic core mirror.',flush=True)
