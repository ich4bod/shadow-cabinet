import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HOME, project, unproject, makeTiles } from '../public/geometry.mjs';
const presets=JSON.parse(fs.readFileSync(new URL('../fixtures/presets.json',import.meta.url)));
const near=(a,b)=>{assert.equal(a.length,b.length); a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${v} != ${b[i]}`));};
assert.deepEqual(HOME,[0,0,-600]);
near(project([60,15,-300],[30,-20,-600]),[90,50]);
near(unproject([90,50],-300,[30,-20,-600]),[60,15,-300]);
const counts={rabbit:193,moth:286,teapot:191};
for(const p of presets){
 const rows=structuredClone(p.rows), old=JSON.stringify(rows);
 const tiles=makeTiles(rows,1);
 assert.equal(tiles.length,counts[p.id]*2);
 assert.equal(JSON.stringify(rows),old);
 assert.deepEqual(tiles,makeTiles(rows,1));
 const ids=new Set();
 for(const tile of tiles){
  const {id,row,col,half,z,vertices}=tile;
  assert.equal(id,2*(row*24+col)+half); assert.ok(!ids.has(id)); ids.add(id);
  assert.equal(rows[row][col],'#'); assert.ok(half===0||half===1);
  assert.equal(z,-420+((id*73+97)%301)); assert.ok(z>=-420&&z<=-120);
  const x=-240+20*col,y=-240+20*row;
  const target=half===0?[[x,y],[x+20,y],[x+20,y+20]]:[[x,y],[x+20,y+20],[x,y+20]];
  assert.equal(vertices.length,3);
  vertices.forEach((v,i)=>{assert.equal(v[2],z);near(project(v,HOME),target[i]);
   for(const lamp of [[120,-80,-600],[-120,80,-600],[30,-20,-600]]){
    const t=600/(z+600);
    near(project(v,lamp),[lamp[0]+t*(v[0]-lamp[0]),lamp[1]+t*(v[1]-lamp[1])]);
    near(unproject(project(v,lamp),z,lamp),v);
   }
  });
 }
 const scattered=makeTiles(rows,2); assert.notDeepEqual(scattered,tiles);
 scattered.forEach((tile,i)=>tile.vertices.forEach((v,j)=>near(project(v,HOME),project(tiles[i].vertices[j],HOME))));
}
const blank=Array(24).fill('.'.repeat(24));assert.deepEqual(makeTiles(blank,1),[]);
const single=blank.slice();single[0]='#'+'.'.repeat(23);
assert.equal(makeTiles(single,1)[0].z,-323);assert.equal(makeTiles(single,2)[0].z,-226);
for(const bad of [[],Array(24).fill('.'),Array(24).fill('x'.repeat(24)),null])assert.throws(()=>makeTiles(bad,1));
for(const bad of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>makeTiles(blank,bad));
console.log('geometry pass');
