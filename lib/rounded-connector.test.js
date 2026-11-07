import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { roundedConnector, connectorSegmentPatch } from './rounded-connector.js'
import { connectionGeometry, updateConnection, connectionStyle } from './mindmap-connections.js'
import { LOCAL_MAP_CHANGE } from './mindmap.js'
const start={x:100,y:200,side:'right',normal:{x:1,y:0}},end={x:500,y:200,side:'left',normal:{x:-1,y:0}}
test('rounded connector exposes five segment handles without changing either endpoint',()=>{
 const r=roundedConnector(start,end);assert.equal(r.handles.length,5);assert.equal(r.points[0].x,100);assert.equal(r.points.at(-1).x,500)
 assert(r.points[2].y<200);assert(r.points[3].y<200)
 const g=connectionGeometry(null,null,{fromPoint:start,toPoint:end,lineStyle:'rounded'});assert(g.d.includes(' Q '));assert.equal(g.segmentHandles.length,5)
 const h=r.handles.find(h=>h.field==='routeOffset'),patch=connectorSegmentPatch(g,h,0,-60)
 assert.equal(patch.routeOffset,-140)
 const moved=roundedConnector(start,end,patch);assert.equal(moved.points[0].y,200);assert.equal(moved.points.at(-1).y,200);assert.equal(moved.points[2].y,60)
})
test('riser handles move their own bend and endpoint-leg handles move only their endpoint',()=>{
 const r=roundedConnector(start,end),g={start,end},first=r.handles.find(h=>h.field==='routeStart'),last=r.handles.find(h=>h.field==='routeEnd')
 assert.equal(connectorSegmentPatch(g,first,30,0).routeStart,r.leadStart+30)
 assert.equal(connectorSegmentPatch(g,last,-40,0).routeEnd,r.leadEnd+40)
 const patch=connectorSegmentPatch(g,r.handles.find(h=>h.endpoint==='from'),0,25)
 assert.equal(patch.endpoint,'from');assert.deepEqual(patch.point,{x:100,y:225});assert.equal(end.y,200)
})
test('vertical attachment, zero-length arrows and extreme handle movements remain finite',()=>{
 const a={x:100,y:100,side:'bottom',normal:{x:0,y:1}},b={x:100,y:600,side:'top',normal:{x:0,y:-1}},r=roundedConnector(a,b)
 assert.equal(r.handles.find(h=>h.id==='middle').axis,'x')
 for(const point of roundedConnector(a,a).points)assert(Number.isFinite(point.x)&&Number.isFinite(point.y))
 const patch=connectorSegmentPatch({start:a,end:b},r.handles.find(h=>h.id==='middle'),-10000,0);assert.equal(patch.routeOffset,-2000)
})
test('bend positions persist, undo independently, and merge between members',()=>{
 const a=new Y.Doc(),styles=a.getMap('styles');updateConnection(a,styles,'link',{lineStyle:'rounded',routeOffset:-80,routeStart:60})
 const b=new Y.Doc();Y.applyUpdate(b,Y.encodeStateAsUpdate(a));const undo=new Y.UndoManager(styles,{trackedOrigins:new Set([LOCAL_MAP_CHANGE])})
 updateConnection(a,styles,'link',{routeOffset:-160});updateConnection(b,b.getMap('styles'),'link',{routeStart:100});Y.applyUpdate(a,Y.encodeStateAsUpdate(b),'remote')
 assert.equal(connectionStyle(styles,'link').routeOffset,-160);assert.equal(connectionStyle(styles,'link').routeStart,100)
 undo.undo();assert.equal(connectionStyle(styles,'link').routeOffset,-80);assert.equal(connectionStyle(styles,'link').routeStart,100)
 const restored=new Y.Doc();Y.applyUpdate(restored,Y.encodeStateAsUpdate(a));assert.equal(connectionStyle(restored.getMap('styles'),'link').routeStart,100)
 undo.destroy();a.destroy();b.destroy();restored.destroy()
})
