import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { arrowDimensions, transformArrow, resizeArrow, translateArrow, commitArrowTransform } from './arrow-transform.js'
import { insertMapNode, mapNodes, mapConnections, LOCAL_MAP_CHANGE } from './mindmap.js'
import { connectionGeometry, connectionStyle, updateConnection } from './mindmap-connections.js'
const geometry={start:{x:100,y:100},end:{x:400,y:100}},near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`)
test('arrow length, width, height, rotation and position can be adjusted independently',()=>{
 let next=transformArrow(geometry,'height',200);near(arrowDimensions(next).height,200);near(arrowDimensions(next).width,300);near((next.start.y+next.end.y)/2,100)
 next=transformArrow(next,'length',600);near(arrowDimensions(next).length,600)
 next=transformArrow(next,'angle',-90);near(arrowDimensions(next).angle,-90);near(arrowDimensions(next).length,600)
 next=transformArrow(next,'x',-300);near(arrowDimensions(next).x,-300)
 next=transformArrow(next,'y',800);near(arrowDimensions(next).y,800)
 assert.deepEqual(transformArrow(geometry,'height',NaN),geometry)
})
test('box handles stretch horizontal and vertical arrows with the opposite edge fixed',()=>{
 let next=resizeArrow(geometry,'se',80,150);assert.deepEqual(next,{start:{x:100,y:100},end:{x:480,y:250}})
 next=resizeArrow(geometry,'nw',-50,-40);assert.deepEqual(next,{start:{x:50,y:60},end:{x:400,y:100}})
 const vertical={start:{x:100,y:400},end:{x:100,y:100}};next=resizeArrow(vertical,'se',200,60);assert.deepEqual(next,{start:{x:100,y:460},end:{x:300,y:100}})
 assert.deepEqual(translateArrow(geometry,-20,60),{start:{x:80,y:160},end:{x:380,y:160}})
})
test('transforming an attached arrow preserves shapes and appearance, detaches changed ends and undoes atomically',()=>{
 const doc=new Y.Doc(),nodes=doc.getMap('nodes'),links=doc.getMap('links'),styles=doc.getMap('styles')
 const a={id:'a',x:0,y:0,width:200,height:100,text:'A'},b={id:'b',x:500,y:0,width:200,height:100,text:'B',parentId:'a'}
 insertMapNode(doc,nodes,a);insertMapNode(doc,nodes,b);updateConnection(doc,styles,'parent:b',{width:5,headLength:1.8,headWidth:.7,stroke:'#aabbcc'})
 const link=mapConnections(mapNodes(nodes),links)[0],g=connectionGeometry(a,b,{...link,...connectionStyle(styles,link.id)}),undo=new Y.UndoManager([nodes,links,styles],{trackedOrigins:new Set([LOCAL_MAP_CHANGE])})
 commitArrowTransform(doc,nodes,links,styles,link,g,transformArrow(g,'height',200))
 assert.equal(nodes.size,2);assert.equal(links.get(link.id).from,null);assert.equal(links.get(link.id).to,null);assert.equal(connectionStyle(styles,link.id).width,5)
 const restored=new Y.Doc();Y.applyUpdate(restored,Y.encodeStateAsUpdate(doc));near(arrowDimensions(connectionGeometry(null,null,restored.getMap('links').get(link.id))).height,200);assert.equal(connectionStyle(restored.getMap('styles'),link.id).headLength,1.8)
 undo.undo();assert.equal(links.size,0);assert.equal(mapNodes(nodes).find(n=>n.id==='b').parentId,'a');undo.redo();assert.equal(links.size,1)
 undo.destroy();doc.destroy();restored.destroy()
})
test('a click without movement does not detach an arrow, and tip dimensions stay independent of line weight',()=>{
 const doc=new Y.Doc(),nodes=doc.getMap('nodes'),links=doc.getMap('links'),styles=doc.getMap('styles')
 links.set('free',{from:null,to:null,fromPoint:geometry.start,toPoint:geometry.end})
 const before=Y.encodeStateAsUpdate(doc);commitArrowTransform(doc,nodes,links,styles,{id:'free',extra:true},geometry,geometry);assert.deepEqual(Y.encodeStateAsUpdate(doc),before)
 const thin=connectionGeometry(null,null,{...links.get('free'),width:1,headLength:2,headWidth:.5}),thick=connectionGeometry(null,null,{...links.get('free'),width:8,headLength:2,headWidth:.5})
 assert.equal(thin.headLength,thick.headLength);assert.equal(thin.headWidth,thick.headWidth);assert.equal(4*thick.width*thick.headLength,64)
 doc.destroy()
})
