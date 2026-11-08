import test from 'node:test'
import assert from 'node:assert/strict'
import { connectionGeometry } from './mindmap-connections.js'
import { slideLineSegment } from './line-editing.js'
import { isOrthogonal, orthogonalVertices, encodeOrthogonalPoints } from './orthogonal-controls.js'
const a={id:'a',x:0,y:0,width:220,height:150},b={id:'b',x:600,y:0,width:220,height:150},link={from:'a',to:'b',fromSide:'right',toSide:'left'}
const vertices=g=>{const numbers=g.d.match(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi).map(Number);return Array.from({length:numbers.length/2},(_,i)=>({x:numbers[i*2],y:numbers[i*2+1]}))}
test('straight and right-angle links stay orthogonal when either attached shape moves',()=>{
 for(const lineStyle of ['straight','step'])for(const x of [-300,100,600,1100])for(const y of [-400,100,600]){
  const g=connectionGeometry(a,{...b,x,y},{...link,lineStyle});assert(isOrthogonal(vertices(g)),`${lineStyle}: ${x},${y}`)
 }
})
test('manually shifted routes keep their topology when endpoints move and resize',()=>{
 const g=connectionGeometry(a,{...b,y:200},{...link,lineStyle:'step'}),patch=slideLineSegment(g,1,60)
 assert(Array.isArray(patch.orthogonalPoints))
 for(const x of [-300,300,900])for(const y of [-400,100,600]){
  const moved=connectionGeometry({...a,width:400,height:250},{...b,x,y},{...link,...patch});assert(moved.orthogonal);assert(isOrthogonal([moved.start,...moved.controlPoints,moved.end]))
 }
})
test('legacy free control points on attached links are repaired without mutating stored data',()=>{
 const controls=[{x:-100,y:-100},{x:100,y:-100}],copy=structuredClone(controls),g=connectionGeometry(a,{...b,y:250},{...link,lineStyle:'points',controlPoints:controls})
 assert(isOrthogonal([g.start,...g.controlPoints,g.end]));assert.deepEqual(controls,copy)
})
test('encoded horizontal and vertical runs keep shared coordinates after moving one end',()=>{
 const start={x:0,y:0},end={x:400,y:0},path=[start,{x:24,y:0},{x:24,y:80},{x:376,y:80},{x:376,y:0},end],refs=encodeOrthogonalPoints(start,end,path)
 const next=orthogonalVertices(start,{x:600,y:200},path.slice(1,-1),refs)
 assert(isOrthogonal(next));assert.equal(next[1].y,0);assert.equal(next.at(-2).y,200)
})
