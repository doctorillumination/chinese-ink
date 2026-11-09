"""Install the reviewed Paper Water edition into both isolated site previews."""
from datetime import datetime, timezone
from html import escape
from pathlib import Path
import hashlib, json, re, shutil, subprocess, sys
ROOT=Path(__file__).resolve().parents[1];HERE=ROOT/'publication'
STUDIO=Path('/Users/bradley/Desktop/1 Art/8 Creative Coding/cyberdelic-studio')
sys.path.insert(0,str(STUDIO/'reader'))
import publish_fieldworks as publisher
publisher.SOURCE=HERE
SLUG='paper-water';ORDER=['lumen','aeria','everything-is-thinking','vellum','primitives','opalia','undra','soft-signal','of-three-musicians','btc-swarm','transplant']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def dump(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
meta=json.loads((HERE/'fieldwork.json').read_text());revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain','--','src','vendor','index.html','package.json','tools/build.mjs'],cwd=ROOT)
assert hashlib.sha256(subprocess.check_output(['git','show','HEAD:index.html'],cwd=ROOT)).hexdigest()==sha(ROOT/'index.html')
runtime={'index.html':ROOT/'index.html','THREE-LICENSE.txt':ROOT/'vendor/THREE-LICENSE.txt'}
packaged=[{'path':name,'sha256':sha(path)} for name,path in runtime.items()]
inputs=[ROOT/'tools/build.mjs',ROOT/'package.json',ROOT/'index.html',*sorted((ROOT/'src').glob('*')),*sorted((ROOT/'vendor').glob('*'))]
source={'slug':SLUG,'project':SLUG,'repository':meta['repository'],'revision':revision,'edition':meta['edition'],'source_version':'0.17.0','source_subdirectory':'.','source_files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p)} for p in inputs if p.is_file()],'packaged_files':packaged,'adaptations':'Exact self-contained Paper Water runtime. Host presentation keeps the artwork full size with no visible text or controls. The optional introduction is reached from the gallery or with I. Three.js licence retained.'}
now=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
files=[{'path':'runtime/'+name,'sha256':sha(path),'length':path.stat().st_size} for name,path in runtime.items()]
for name,ext in [('poster.jpg','jpg'),('preview.mp4','mp4')]:
 path=HERE/(SLUG+'.'+ext);files.append({'path':name,'sha256':sha(path),'length':path.stat().st_size})
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(HERE/(SLUG+'.mp4'))]))
video=probe['streams'][0];assert len(probe['streams'])==1 and video['codec_name']=='h264' and (video['width'],video['height'])==(960,720)
assert (HERE/(SLUG+'.mp4')).stat().st_size<1024*1024
capture=json.loads((HERE/'capture.json').read_text());assert capture['source_runtime_sha256']==sha(ROOT/'index.html')
capture.update(raw_sha256=sha(HERE/'canvas.webm'),source_snapshot_sha256=hashlib.sha256(json.dumps(packaged,sort_keys=True).encode()).hexdigest(),capture_driver_sha256=sha(HERE/'capture.html'),loop_method='one-second end-to-start crossfade',encoded_video={'codec':'h264','width':960,'height':720,'fps':24,'streams':1,'duration':float(probe['format']['duration'])})
release={'schema':'cyberdelic.space/fieldwork-release-v1','slug':SLUG,'edition':meta['edition'],'published_at':now,'source_record':source,'files':files,'capture':capture}
rid=release['release_id']=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest();dump(HERE/'release.json',release)
css='''/* Paper Water opens as an uninterrupted drawing. About is a separate opt-in view. */
.fieldwork-player[data-fieldwork="paper-water"]{grid-template-rows:1fr;background:#f7f5ee}
.fieldwork-player[data-fieldwork="paper-water"]>.fieldwork-bar,
.fieldwork-player[data-fieldwork="paper-water"]>.fieldwork-view-controls,
.fieldwork-player[data-fieldwork="paper-water"]>.fieldwork-announcement,
.fieldwork-player[data-fieldwork="paper-water"] .fieldwork-status{display:none!important}
'''
js='''/* The gallery can open the introduction without adding controls over the pond. */
(function(){
 var player=document.querySelector('[data-fieldwork="paper-water"]'),frame=player.querySelector('iframe'),about=player.querySelector('.fieldwork-about');
 function open(){if(!about.open)about.showModal();}
 function shortcut(event){if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,select,textarea,[contenteditable=true]'))return;if(event.key.toLowerCase()==='i'){event.preventDefault();open();}}
 function hash(){if(location.hash==='#about')open();}
 document.addEventListener('keydown',shortcut);window.addEventListener('hashchange',hash);
 frame.addEventListener('load',function(){if(frame.contentDocument)frame.contentDocument.addEventListener('keydown',shortcut);});
 about.addEventListener('close',function(){if(location.hash==='#about')history.replaceState(null,'',location.pathname+location.search);frame.focus();});hash();
})();
'''
def install(site,standalone):
 base=site if standalone else site/'fieldworks';catalog=json.loads((site/'fieldworks.json').read_text());assert [i['slug'] for i in catalog['items']]==ORDER
 frozen={p.relative_to(site).as_posix():sha(p) for folder in ['content','living-content','fieldwork-runtime','audio','audio-bundles','artwork-bundles'] for p in (site/folder).rglob('*') if p.is_file()}
 for folder in [base/'images',base/'previews']:
  for p in folder.rglob('*'):
   if p.is_file() and p.suffix in ['.jpg','.png','.mp4','.webm']:frozen[p.relative_to(site).as_posix()]=sha(p)
 name='standalone' if standalone else 'press';dump(HERE/(name+'-frozen.json'),frozen);dump(HERE/(name+'-narrations-before.json'),json.loads((site/'narrations.json').read_text()))
 for filename,path in runtime.items():
  dest=site/'fieldwork-runtime'/SLUG/filename;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
 readings=base/'readings';previous=dict(catalog['overview']);archive=readings/'overview-eleven-works.md';assert not archive.exists();shutil.copy2(site/previous['source_path'],archive)
 catalog.setdefault('archived_readings',[]).append({**previous,'slug':'overview-eleven-works','title':'Fieldworks, eleven-work edition','source':archive.name,'source_path':archive.relative_to(site).as_posix(),'href':archive.relative_to(site).as_posix()})
 for filename in ['overview.md','paper-water.md']:shutil.copy2(HERE/filename,readings/filename)
 catalog['overview'].update(source_sha256=sha(readings/'overview.md'),source_length=(readings/'overview.md').stat().st_size)
 item={**meta,'release_id':rid,'runtime_published_at':now,'source_path':(readings/'paper-water.md').relative_to(site).as_posix(),'source_sha256':sha(readings/'paper-water.md'),'source_length':(readings/'paper-water.md').stat().st_size,'href':SLUG+'/' if standalone else 'fieldworks/'+SLUG+'/'}
 for key,folder,ext in [('poster','images','jpg'),('preview','previews','mp4')]:
  dest=base/folder/(SLUG+'.'+ext);shutil.copy2(HERE/dest.name,dest);item[key]={'path':dest.relative_to(site).as_posix(),'sha256':sha(dest),'length':dest.stat().st_size,'kind':'actual-browser-capture' if key=='poster' else 'recorded-artwork-loop'}
 last=catalog['items'][-1];catalog['items'].append(item);catalog.update(version='1.10.0',date='2026-11-08',published_at=now);dump(site/'fieldworks.json',catalog)
 sources=json.loads((base/'sources.json').read_text());sources['items'].append(source);dump(base/'sources.json',sources);dump(base/'releases'/(SLUG+'-'+rid+'.json'),release)
 captures=json.loads((base/'previews/captures.json').read_text());captures['items'].append({**capture,'slug':SLUG,'path':SLUG+'.mp4','sha256':item['preview']['sha256'],'length':item['preview']['length']});dump(base/'previews/captures.json',captures)
 p=base/'index.html';html=p.read_text();html=re.sub(r'<div class="fieldworks-intro">.*?</div>','<div class="fieldworks-intro">'+publisher.prose_html((HERE/'overview.md').read_text())+'</div>',html,flags=re.S)
 card=f'''<li class="fieldworks-card"><a class="fieldworks-link" href="{SLUG}/" aria-label="Enter Paper Water"><div class="fieldworks-image"><img src="images/{SLUG}.jpg" alt="{escape(meta['alt'])}" width="960" height="720" decoding="async"><video data-preview-src="previews/{SLUG}.mp4" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div><p class="fieldwork-number">12 / Living artwork</p><h2>Paper Water</h2><p>{escape(meta['description'])}</p><div class="fieldworks-enter">Enter Paper Water<span aria-hidden="true">↗</span></div></a><a class="fieldworks-enter" href="paper-water/#about">About and listen<span aria-hidden="true">↗</span></a></li>'''
 assert html.count('</ol>')==1;html=html.replace('</ol>',card+'</ol>',1).replace('Eleven living artworks','Twelve living artworks');p.write_text(html)
 page=publisher.artwork_page(meta,last,catalog['items'][0]);page=page.replace('</head>','<link rel="stylesheet" href="../../read-aloud.css"><script src="../../read-aloud.js" defer></script><link rel="stylesheet" href="../../paper-water-player.css"><script src="../../paper-water-player.js" defer></script></head>')
 if standalone:
  page=page.replace('../../project/cyberdelic-os/field-notes/','https://cyberdelic.space/project/cyberdelic-os/field-notes/').replace('../../','../').replace('data-theme="psychedelic"','data-theme="paper"').replace(' · cyberdelic.space</title>',' · Brad Necyk</title>')
  page=re.sub(r'<script src="[^\"]*theme\.js[^\"]*"></script>','',page)
  page=page.replace('href="../favicon.ico"','href="../favicon.svg"').replace('https://cyberdelic.space/fieldworks/'+SLUG+'/','https://fieldworks.space/'+SLUG+'/').replace('https://cyberdelic.space/fieldworks/images/'+SLUG+'.jpg','https://fieldworks.space/images/'+SLUG+'.jpg').replace('</head>','<link rel="stylesheet" href="../paper.css"></head>')
 dest=base/SLUG/'index.html';dest.parent.mkdir();dest.write_text(page);(site/'paper-water-player.css').write_text(css);(site/'paper-water-player.js').write_text(js)
 for slug,index in [(ORDER[0],0),(ORDER[-1],1)]:
  p=base/slug/'index.html';text=p.read_text()
  def navigation(match):
   links=re.findall(r'<a\b.*?</a>',match[0]);links[index]=f'<a href="../{SLUG}/">'+(('← Paper Water') if index==0 else ('Paper Water →'))+'</a>';return '<nav class="fieldwork-switch" aria-label="Other Fieldworks">'+''.join(links)+'</nav>'
  text,count=re.subn(r'<nav class="fieldwork-switch".*?</nav>',navigation,text,flags=re.S);assert count==1;p.write_text(text)
 p=site/'_headers';text=p.read_text();blocks=text.split('\n\n');template='/of-three-musicians/*' if standalone else '/fieldworks/of-three-musicians/*'
 view=next(b for b in blocks if b.startswith(template+'\n')).replace(template,('/' if standalone else '/fieldworks/')+SLUG+'/*');runtime_headers=next(b for b in blocks if b.startswith('/fieldwork-runtime/of-three-musicians/*\n')).replace('/fieldwork-runtime/of-three-musicians/*','/fieldwork-runtime/'+SLUG+'/*')
 p.write_text(text.rstrip()+'\n\n'+view+'\n\n'+runtime_headers+'\n')
 p=site/'sitemap.xml';url='https://fieldworks.space/paper-water/' if standalone else 'https://cyberdelic.space/fieldworks/paper-water/';p.write_text(p.read_text().replace('</urlset>','<url><loc>'+url+'</loc></url>\n</urlset>'))
 shutil.copytree(HERE/'narration-site/audio',site/'audio',dirs_exist_ok=True)
 if standalone:
  p=site.parent/'scripts/check_site.py';text=p.read_text().replace("'btc-swarm', 'transplant']","'btc-swarm', 'transplant', 'paper-water']").replace("len(audio['items']) == 18","len(audio['items']) == 20").replace('eleven exact artwork runtimes, eighteen source-bound','twelve exact artwork runtimes, twenty source-bound');p.write_text(text)
  p=site.parent/'package.json';data=json.loads(p.read_text());data['description']='Twelve living artworks by Brad Necyk, in an independent paper gallery.';dump(p,data)
  p=site.parent/'README.md';text=p.read_text().replace('eleven living artworks','twelve living artworks').replace('and Transplant**','Transplant, and Paper Water**').replace('all eleven works','all twelve works').replace('eighteen narration','twenty narration');text+='\n## Paper Water\n\nThe twelfth work opens as a full-viewport ink pond with no visible text or controls. Click or tap to feed; drag to stir. The gallery has a separate About and listen link, and I opens the optional recorded introduction. The source-bound Paper Water runtime and Three.js licence are retained exactly.\n';p.write_text(text)
 else:
  p=site/'living-library.json';data=json.loads(p.read_text());data['items'].append({'id':'fieldwork-paper-water','release_id':'FW-PAPER-WATER','label':'FIELDWORK · LIVING','title':'Paper Water','href':item['href'],'author':'Brad Necyk','date':'2026-11-08','publication_state':'living','form':'generative-art','world':'cyberdelic-os','register':'play','themes':meta['themes'],'excerpt':meta['description'],'rationale':'Human-authorized Fieldworks publication. Thematic placements remain interpretive, separate from inscription evidence.'});dump(p,data)
  p=site/'living-relations/catalog.json';data=json.loads(p.read_text());data['items'].append({'id':'catalog:fieldworks:paper-water','record_kind':'artifact','title':'Paper Water','href':item['href'],'summary':meta['description'],'subjects':meta['themes']+['generative art','ink','Fieldworks'],'search_terms':['Paper Water','ink pond','fish','koi','ripples','paper'],'questions':['How does a small act of attention change a living drawing?'],'related':[],'evidence':[{'source':item['source_path'],'locator':'# Paper Water'}],'epistemic_status':'strong','review_state':'model-proposed','introduced_by':'human-authorized-fieldworks-publication','last_tended_at':now,'uncertainty':'Themes are interpretive. This living artwork is not an inscription.'});data['count']=len(data['items']);data['updated_at']=max(data.get('updated_at',''),now);dump(p,data)
 if not standalone:
  p=site/'project/cyberdelic-os/index.html';text=p.read_text();old='BTC / SWARM, and Transplant: generative artworks';assert old in text;p.write_text(text.replace(old,'BTC / SWARM, Transplant, and Paper Water: generative artworks',1))
 for filename,digest in frozen.items():assert sha(site/filename)==digest,filename
 print('Prepared '+str(site),flush=True)
install(Path('/tmp/cyberdelic-paper-water-20261108'),False)
install(Path('/tmp/fieldworks-paper-water-20261108/public'),True)
