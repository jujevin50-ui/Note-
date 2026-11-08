import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { resolveArrowGeometries, nearestArrowJunction, canJoinArrows, arrowPointAt } from './arrow-junctions.js'
import { moveConnectionEndpoint } from './mindmap-connections.js'
const base={id:'a',extra:true,from:null,to:null,fromPoint:{x:0,y:0},toPoint:{x:400,y:0},lineStyle:'straight'},branch={id:'b',extra:true,from:null,to:null,fromPoint:{x:200,y:0},toPoint:{x:200,y:200},fromArrow:{id:'a',position:.5},lineStyle:'straight'}
const near=(a,b)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<.01)
test('arrow endpoints snap to other tips and to the shaft, with endpoint priority',()=>{
 const links=resolveArrowGeometries([base,branch],[])
 const tip=nearestArrowJunction(links,'b',{x:399,y:3},10);assert.equal(tip.id,'a');assert.equal(tip.position,1);near(tip.point,{x:400,y:0})
 const shaft=nearestArrowJunction(links,'b',{x:125,y:4},10);assert.equal(shaft.id,'a');near(shaft.point,{x:125,y:0});assert.equal(shaft.position,.3125)
 assert.equal(nearestArrowJunction(links,'b',{x:800,y:800},10),null)
})
test('a junction follows translation, reshaping and chained junctions',()=>{
 const chain={...branch,id:'c',fromArrow:{id:'b',position:1},fromPoint:{x:200,y:200},toPoint:{x:300,y:300}}
 const links=resolveArrowGeometries([{...base,fromPoint:{x:100,y:50},toPoint:{x:500,y:50}},branch,chain],[])
 near(links.find(l=>l.id==='b').geometry.start,{x:300,y:50});near(links.find(l=>l.id==='c').geometry.start,links.find(l=>l.id==='b').geometry.end)
 const curved=resolveArrowGeometries([{...base,lineStyle:'curve',curveOffset:-100},branch],[]);near(curved[1].geometry.start,arrowPointAt(curved[0].geometry.d,.5))
})
test('self links and dependency cycles cannot be snapped; stale links keep their saved fallback',()=>{
 assert(!canJoinArrows([base,branch],'a','b'));assert(!canJoinArrows([base,branch],'a','a'));assert(canJoinArrows([base,branch],'b','a'))
 const stale=resolveArrowGeometries([{...branch,fromArrow:{id:'missing',position:.5}}],[]);near(stale[0].geometry.start,branch.fromPoint)
 const cycle=resolveArrowGeometries([{...base,fromArrow:{id:'b',position:.5}},branch],[]);assert.equal(cycle.length,2);assert(cycle.every(l=>Number.isFinite(l.geometry.start.x)))
})
test('junction references persist and an explicit free endpoint detaches them',()=>{
 const doc=new Y.Doc(),nodes=doc.getMap('nodes'),links=doc.getMap('links'),styles=doc.getMap('styles');links.set('b',branch)
 moveConnectionEndpoint(doc,nodes,links,styles,branch,'from',{from:null,fromPoint:{x:100,y:0},fromArrow:{id:'a',position:.25}})
 const restored=new Y.Doc();Y.applyUpdate(restored,Y.encodeStateAsUpdate(doc));assert.deepEqual(restored.getMap('links').get('b').fromArrow,{id:'a',position:.25})
 moveConnectionEndpoint(doc,nodes,links,styles,branch,'from',{from:null,fromPoint:{x:60,y:60}});assert.equal(links.get('b').fromArrow,null)
 doc.destroy();restored.destroy()
})
