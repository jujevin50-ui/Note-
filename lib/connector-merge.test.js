import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { collapseConnector } from './connector-merge.js'
import { connectionGeometry, updateConnection, connectionStyle } from './mindmap-connections.js'
import { lineEditHandles, deformLine, slideLineSegment } from './line-editing.js'
import { LOCAL_MAP_CHANGE } from './mindmap.js'
const link={fromPoint:{x:0,y:0},toPoint:{x:400,y:0},lineStyle:'rounded',routeStart:100,routeEnd:100,routeOffset:-80}
test('almost aligning adjacent segments removes the dogleg and leaves exactly one slider',()=>{
 const g=connectionGeometry(null,null,link),handle=lineEditHandles(g).find(h=>h.id==='middle'),patch=deformLine(g,handle,0,77,1),merged=connectionGeometry(null,null,{...link,...patch})
 assert.deepEqual(patch.controlPoints,[]);assert.deepEqual(patch.orthogonalPoints,[]);assert.equal(lineEditHandles(merged).length,1)
 assert.equal(merged.start.x,0);assert.equal(merged.end.x,400);assert.equal(merged.start.y,0);assert.equal(merged.end.y,0)
 assert(!merged.d.includes(' Q '))
})
test('merging vertical runs keeps one continuous vertical segment and preserves endpoints',()=>{
 const g=connectionGeometry(null,null,{...link,toPoint:{x:400,y:80}}),patch=slideLineSegment(g,1,197,6),merged=connectionGeometry(null,null,{...link,toPoint:{x:400,y:80},...patch})
 assert.deepEqual([merged.start,...merged.controlPoints,merged.end].map(p=>({x:p.x,y:p.y})),[{x:0,y:0},{x:300,y:0},{x:300,y:80},{x:400,y:80}])
})
test('snap distance is measured in screen pixels; outside the threshold or Alt leaves the bend',()=>{
 const g=connectionGeometry(null,null,link),h=lineEditHandles(g).find(h=>h.id==='middle')
 assert.equal(connectionGeometry(null,null,{...link,...deformLine(g,h,0,77,2)}).controlPoints.length,0)
 assert(connectionGeometry(null,null,{...link,...deformLine(g,h,0,76,2)}).controlPoints.length>0)
 assert.equal(connectionGeometry(null,null,{...link,...deformLine(g,h,0,70,.5)}).controlPoints.length,0)
 assert(connectionGeometry(null,null,{...link,...deformLine(g,h,0,77,1,true)}).controlPoints.length>0)
})
test('redundant collinear runs and reversals collapse, including diagonal lines',()=>{
 assert.deepEqual(collapseConnector([{x:0,y:0},{x:100,y:0},{x:100,y:-80},{x:100,y:0},{x:200,y:0}]),[{x:0,y:0},{x:200,y:0}])
 assert.deepEqual(collapseConnector([{x:0,y:0},{x:100,y:100},{x:200,y:200}]),[{x:0,y:0},{x:200,y:200}])
 assert.equal(collapseConnector([{x:0,y:0},{x:100,y:0},{x:100,y:80}]).length,3)
})
test('the merged topology persists and undo restores the previous bends',()=>{
 const doc=new Y.Doc(),styles=doc.getMap('styles');updateConnection(doc,styles,'line',{lineStyle:'rounded',routeOffset:-80})
 const undo=new Y.UndoManager(styles,{trackedOrigins:new Set([LOCAL_MAP_CHANGE])}),g=connectionGeometry(null,null,link),h=lineEditHandles(g).find(h=>h.id==='middle')
 updateConnection(doc,styles,'line',deformLine(g,h,0,77))
 const reopened=new Y.Doc();Y.applyUpdate(reopened,Y.encodeStateAsUpdate(doc));assert.equal(lineEditHandles(connectionGeometry(null,null,{...link,...connectionStyle(reopened.getMap('styles'),'line')})).length,1)
 undo.undo();assert.equal(connectionStyle(styles,'line').lineStyle,'rounded');undo.redo();assert.equal(connectionStyle(styles,'line').controlPoints.length,0)
 undo.destroy();doc.destroy();reopened.destroy()
})
test('moving a case after merging does not restore removed doglegs and keeps right-angle routing',()=>{
 const a={x:-220,y:-75,width:220,height:150},b={x:400,y:-75,width:220,height:150},attached={...link,from:'a',to:'b',fromSide:'right',toSide:'left'},g=connectionGeometry(a,b,attached),h=lineEditHandles(g).find(h=>h.id==='middle'),patch=deformLine(g,h,0,77)
 assert.equal(patch.controlPoints.length,0)
 const moved=connectionGeometry(a,{...b,y:125},{...attached,...patch})
 assert(moved.controlPoints.length<=2)
 const points=[moved.start,...moved.controlPoints,moved.end]
 for(let i=1;i<points.length;i++)assert(Math.abs(points[i].x-points[i-1].x)<.001||Math.abs(points[i].y-points[i-1].y)<.001)
 assert.equal(moved.start.x,0);assert.equal(moved.start.y,0);assert.equal(moved.end.x,400);assert.equal(moved.end.y,200)
})
