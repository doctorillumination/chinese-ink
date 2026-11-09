import { writeFile, readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { ProceduralFish } from '../src/fish.mjs';
import { ProceduralFish as OldFish } from '../archive/v0.14-living-pond/src/fish.mjs';
import { SchoolSimulation, bodySamples, closestBodies } from '../src/school.mjs';
import { SchoolSimulation as OldSchool } from '../archive/v0.14-living-pond/src/school.mjs';
import { FIXED_STEP } from '../src/simulation.mjs';
const results = { edition: '0.15', date: '2026-11-08', noFood: {}, geometry: {}, feeding: [] };
const old = new OldSchool(), current = new SchoolSimulation();
let maxMotionDeviation = 0;
for (let i = 0; i < 30 / FIXED_STEP; i++) {
  old.step(); current.step();
  for(let f=0;f<12;f++)for(const key of ['x','y','z','yaw','speed','phase','omega','effort']) maxMotionDeviation = Math.max(maxMotionDeviation, Math.abs(old.fish[f][key]-current.fish[f][key]));
}
assert.equal(maxMotionDeviation, 0);
results.noFood = { seconds: 30, fish:12, maxMotionDeviation };
const full = new OldFish(new THREE.Scene(), current.fish[0]);
const pond = new ProceduralFish(new THREE.Scene(), current.fish[0], 'pond');
for(const model of [full,pond]){model.setStyle('ink');model.setInspection({spine:false,translucent:false,wireframe:false});}
let maxBodyDeviation=0, compared=0;
for(let pose=0;pose<40;pose++){
 for(let i=0;i<6;i++)current.step(); full.update();pond.update();
 const a=full.geometry.attributes.position,b=pond.geometry.attributes.position;
 for(let ring=0;ring<pond.rings;ring++)for(let radial=0;radial<pond.radials;radial++)for(const key of ['getX','getY','getZ']){
  maxBodyDeviation=Math.max(maxBodyDeviation,Math.abs(a[key](ring*2*full.radials+radial*2)-b[key](ring*pond.radials+radial)));compared++;
 }
 for(let i=0;i<pond.fins.length;i++)for(const u of [0,.25,.5,.75,1])for(const v of [0,1/3,2/3,1]){
  const av=full.finPoint(full.fins[i].spec,u,v).clone(),bv=pond.finPoint(pond.fins[i].spec,u,v).clone();assert.ok(av.distanceTo(bv)<1e-10);
 }
}
assert.equal(maxBodyDeviation,0);
const timing=(model)=>{for(let i=0;i<20;i++)model.update();const times=[];for(let k=0;k<5;k++){const t=performance.now();for(let i=0;i<120;i++)model.update();times.push((performance.now()-t)/120);}return times.sort((a,b)=>a-b)[2];};
results.geometry={poses:40,comparedBodyValues:compared,maxBodyDeviation,sharedFinLandmarks:'identical',previousBodyVertices:full.geometry.attributes.position.count,currentBodyVertices:pond.geometry.attributes.position.count,previousFinVertices:full.fins.reduce((s,f)=>s+f.geometry.attributes.position.count,0),currentFinVertices:pond.fins.reduce((s,f)=>s+f.geometry.attributes.position.count,0),previousModelMs:timing(full),currentModelMs:timing(pond),timingNote:'Median CPU update cost for one fixed pose; not a browser FPS measurement.'};
full.dispose();pond.dispose();
for(const [edition,Class] of [['0.14',OldSchool],['0.15',SchoolSimulation]]) for(const offset of [[2.5,1],[-2.5,0],[0,0]]){
 const s=new Class();for(let i=0;i<360;i++)s.step();const f=s.fish[2];s.feed(f.x+offset[0],f.z+offset[1]);const start=s.time;
 let first=null,all=null,noticed=null,minGap=Infinity,maxResponders=0;
 for(let i=0;i<18/FIXED_STEP;i++){s.step();const responding=s.fish.filter(f=>f.foodGoal).length;maxResponders=Math.max(maxResponders,responding);if(noticed===null&&responding)noticed=s.time-start;if(first===null&&s.food.eaten)first=s.time-start;if(all===null&&s.food.eaten===3)all=s.time-start;if(i%12===0){const bodies=s.fish.map(f=>{f.updateSpine();return bodySamples(f)});for(let a=0;a<bodies.length;a++)for(let b=a+1;b<bodies.length;b++)minGap=Math.min(minGap,closestBodies(bodies[a],bodies[b]).clearance);}}
 results.feeding.push({edition,offset,noticeSeconds:noticed,firstBiteSeconds:first,allEatenSeconds:all,eaten:s.food.eaten,minTorsoClearance:minGap,maxResponders});
}
for(const result of results.feeding.filter(r=>r.edition==='0.15')){assert.ok(result.noticeSeconds<.25);assert.ok(result.firstBiteSeconds<8);assert.ok(result.allEatenSeconds<9);assert.equal(result.eaten,3);assert.ok(result.minTorsoClearance>0);}
for(const name of ['ink-material.mjs','ink-renderer.mjs','ink-garden.mjs','water.mjs','rhythm.mjs'])assert.equal(await readFile(new URL('../src/'+name,import.meta.url),'utf8'),await readFile(new URL('../archive/v0.14-living-pond/src/'+name,import.meta.url),'utf8'));
results.preservedSources=['ink-material.mjs','ink-renderer.mjs','ink-garden.mjs','water.mjs','rhythm.mjs'];
await writeFile(new URL('../verification/edition-15-comparison.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
