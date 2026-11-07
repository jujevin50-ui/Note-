import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { lineEditHandles, deformLine, pathSamples, insertLinePoint, removeLinePoint } from './line-editing.js'
import { connectionGeometry, updateConnection, connectionStyle } from './mindmap-connections.js'
const link={fromPoint:{x:100,y:100},toPoint:{x:500,y:100}},close=(a,b)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<.001)
test('every line type exposes draggable handles on the actual stroke',()=>{
 for(const lineStyle of ['straight','curve','step','rounded','points']){
  const g=connectionGeometry(null,null,{...link,lineStyle}),handles=lineEditHandles(g)
  assert(handles.length>0,lineStyle)
  if(['straight','curve'].includes(lineStyle)){const samples=pathSamples(g.d,1000),h=handles[0];assert(Math.min(...samples.slice(1).map((b,i)=>{const a=samples[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((h.x-a.x)*dx+(h.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy)}))<1)}
 }
})
test('pulling a straight or curved line keeps its endpoints and passes through the dragged point',()=>{
 for(const lineStyle of ['straight','curve']){
  const g=connectionGeometry(null,null,{...link,lineStyle}),handle=lineEditHandles(g)[0],patch=deformLine(g,handle,40,-70),next=connectionGeometry(null,null,{...link,...patch}),h=lineEditHandles(next)[0]
  close(h,{x:handle.x+40,y:handle.y-70});close(next.start,g.start);close(next.end,g.end)
  close(pathSamples(next.d,100)[50],h)
 }
})
test('points can be inserted, dragged freely, and removed without deleting the arrow',()=>{
 const g=connectionGeometry(null,null,{...link,lineStyle:'straight'}),insert=insertLinePoint(g,{x:250,y:100}),withPoint=connectionGeometry(null,null,{...link,...insert})
 assert.equal(withPoint.controlPoints.length,1)
 const handle=lineEditHandles(withPoint).find(h=>h.kind==='vertex'),moved=connectionGeometry(null,null,{...link,...deformLine(withPoint,handle,-20,90)})
 close(moved.controlPoints[0],{x:230,y:190});assert(moved.d.includes('230 190'))
 const removed=connectionGeometry(null,null,{...link,...removeLinePoint(moved,0)});assert.equal(removed.controlPoints.length,0);close(removed.end,g.end)
})
test('control points follow a translated arrow and survive persistence with curve edits',()=>{
 const g=connectionGeometry(null,null,{...link,lineStyle:'straight'}),patch=insertLinePoint(g,{x:250,y:160}),doc=new Y.Doc(),styles=doc.getMap('styles')
 updateConnection(doc,styles,'arrow',patch);updateConnection(doc,styles,'curve',{curveAlong:40,curveOffset:-80})
 const restored=new Y.Doc();Y.applyUpdate(restored,Y.encodeStateAsUpdate(doc))
 const shape=connectionStyle(restored.getMap('styles'),'arrow'),translated=connectionGeometry(null,null,{...shape,fromPoint:{x:120,y:130},toPoint:{x:520,y:130}})
 close(translated.controlPoints[0],{x:270,y:190});assert.equal(connectionStyle(restored.getMap('styles'),'curve').curveOffset,-80)
 doc.destroy();restored.destroy()
})
test('custom line controls rotate and scale with the arrow',async()=>{
 const {transformLineControls}=await import('./line-editing.js')
 const g=connectionGeometry(null,null,{fromPoint:{x:0,y:0},toPoint:{x:200,y:0},lineStyle:'points',controlPoints:[{x:0,y:50}]})
 const next={start:{x:100,y:-200},end:{x:100,y:200}},patch=transformLineControls(g,next),rotated=connectionGeometry(null,null,{fromPoint:next.start,toPoint:next.end,lineStyle:'points',...patch})
 close(rotated.controlPoints[0],{x:0,y:0})
})
