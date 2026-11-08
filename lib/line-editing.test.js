import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { lineEditHandles, deformLine, pathSamples, slideLineSegment, encodeControlPoints, transformLineControls } from './line-editing.js'
import { connectionGeometry, updateConnection, connectionStyle } from './mindmap-connections.js'
const link={fromPoint:{x:100,y:100},toPoint:{x:500,y:100}},close=(a,b)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<.001)
test('every line type exposes segment sliders rather than free point controls',()=>{
 for(const lineStyle of ['straight','curve','step','rounded','points']){
  const g=connectionGeometry(null,null,{...link,lineStyle}),handles=lineEditHandles(g)
  assert(handles.length>0,lineStyle);assert(handles.every(h=>h.axis!=='free'&&!['vertex','insert'].includes(h.kind)))
  if(['straight','curve'].includes(lineStyle)){const samples=pathSamples(g.d,1000),h=handles[0];assert(Math.min(...samples.slice(1).map((b,i)=>{const a=samples[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((h.x-a.x)*dx+(h.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy)}))<1)}
 }
})
test('a curve slider moves perpendicular to the trait and keeps its ends fixed',()=>{
 for(const lineStyle of ['curve']){
  const g=connectionGeometry(null,null,{...link,lineStyle}),handle=lineEditHandles(g)[0],patch=deformLine(g,handle,40,-70),next=connectionGeometry(null,null,{...link,...patch}),h=lineEditHandles(next)[0]
  close(h,{x:handle.x,y:handle.y-70});close(next.start,g.start);close(next.end,g.end);close(pathSamples(next.d,100)[50],h)
 }
})
test('sliding a middle segment moves both corners together without moving endpoints',()=>{
 const controls=[{x:-100,y:-80},{x:100,y:-80}],g=connectionGeometry(null,null,{...link,lineStyle:'points',controlPoints:controls}),h=lineEditHandles(g).find(h=>h.index===1)
 const next=connectionGeometry(null,null,{...link,...deformLine(g,h,30,50)})
 close(next.controlPoints[0],{x:200,y:70});close(next.controlPoints[1],{x:400,y:70});close(next.start,g.start);close(next.end,g.end)
})
test('sliding terminal segments creates return legs and keeps both attachment positions fixed',()=>{
 const g=connectionGeometry(null,null,{...link,lineStyle:'points'})
 const patch=slideLineSegment(g,0,60),next=connectionGeometry(null,null,{...link,...patch})
 close(next.start,g.start);close(next.end,g.end);assert(next.controlPoints.some(p=>p.y===160));assert.equal(next.controlPoints.length,4)
 const round=connectionGeometry(null,null,{...link,lineStyle:'rounded'}),shifted=slideLineSegment(round,0,40);assert.equal(shifted.pointCorners,true)
 assert(connectionGeometry(null,null,{...link,...shifted}).d.includes(' Q '))
})
test('segment shape persists and follows whole-arrow translation',()=>{
 const g=connectionGeometry(null,null,{...link,lineStyle:'straight'}),controls=encodeControlPoints(g,[{x:250,y:160}]),doc=new Y.Doc(),styles=doc.getMap('styles')
 updateConnection(doc,styles,'arrow',{lineStyle:'points',controlPoints:controls,pointCorners:true})
 const restored=new Y.Doc();Y.applyUpdate(restored,Y.encodeStateAsUpdate(doc));const shape=connectionStyle(restored.getMap('styles'),'arrow'),translated=connectionGeometry(null,null,{...shape,fromPoint:{x:120,y:130},toPoint:{x:520,y:130}})
 close(translated.controlPoints[0],{x:270,y:190});assert.equal(shape.pointCorners,true);doc.destroy();restored.destroy()
})
test('custom line controls rotate and scale with the arrow',()=>{
 const g=connectionGeometry(null,null,{fromPoint:{x:0,y:0},toPoint:{x:200,y:0},lineStyle:'points',controlPoints:[{x:0,y:50}]})
 const next={start:{x:100,y:-200},end:{x:100,y:200}},patch=transformLineControls(g,next),rotated=connectionGeometry(null,null,{fromPoint:next.start,toPoint:next.end,lineStyle:'points',...patch})
 close(rotated.controlPoints[0],{x:0,y:0})
})

test('straight sliders create right-angle segments, never a curve, and preserve endpoints',()=>{
 for(const toPoint of [{x:500,y:100},{x:100,y:500},{x:500,y:300}]){
  const original={...link,toPoint,lineStyle:'straight'},g=connectionGeometry(null,null,original)
  for(const h of lineEditHandles(g)){
   assert.equal(h.kind,'segment')
   const patch=deformLine(g,h,40,-70),next=connectionGeometry(null,null,{...original,...patch}),vertices=pathSamples(next.d)
   assert(!/[CQ]/.test(next.d));assert.equal(patch.lineStyle,'points')
   close(next.start,g.start);close(next.end,g.end)
   for(let i=1;i<vertices.length;i++)assert(Math.abs(vertices[i].x-vertices[i-1].x)<.001||Math.abs(vertices[i].y-vertices[i-1].y)<.001)
  }
 }
})
test('short non-curved arrows never expose a curve slider',()=>{
 const g=connectionGeometry(null,null,{fromPoint:{x:0,y:0},toPoint:{x:10,y:0},lineStyle:'straight'})
 assert.deepEqual(lineEditHandles(g),[])
})
test('free endpoints retain horizontal and vertical routing after resizing',()=>{
 for(const lineStyle of ['straight','step','rounded']){
  for(const end of [{x:240,y:150},{x:-50,y:300},{x:0,y:300}]){
   const g=connectionGeometry(null,null,{fromPoint:{x:0,y:0},toPoint:end,lineStyle})
   const vertices=lineStyle==='rounded'?g.routePoints:pathSamples(g.d)
   for(let i=1;i<vertices.length;i++)assert(Math.abs(vertices[i].x-vertices[i-1].x)<.001||Math.abs(vertices[i].y-vertices[i-1].y)<.001)
  }
 }
})
