import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import {LOCAL_MAP_CHANGE,insertMapNode,updateMapNode,removeMapBranch,mapNodes,mapConnections,layoutMap,fitMap,nodeHeight} from './mindmap.js'
const node=(id,parentId=null,x=0,y=0)=>({id,parentId,x,y,text:id,color:'#b18aef',shape:'card'})
test('nodes and links survive saving and reopening',()=>{
 const doc=new Y.Doc(),store=doc.getMap('mindmap-nodes'),links=doc.getMap('mindmap-links')
 insertMapNode(doc,store,node('root'));insertMapNode(doc,store,node('child','root',320,0));links.set('cross',{from:'root',to:'child'})
 const reopened=new Y.Doc();Y.applyUpdate(reopened,Y.encodeStateAsUpdate(doc))
 assert.deepEqual(mapNodes(reopened.getMap('mindmap-nodes')),mapNodes(store))
 assert.equal(mapConnections(mapNodes(store),links).length,1)
 reopened.destroy();doc.destroy()
})
test('editing text and moving a node concurrently preserve both fields',()=>{
 const a=new Y.Doc();insertMapNode(a,a.getMap('nodes'),node('root'))
 const b=new Y.Doc();Y.applyUpdate(b,Y.encodeStateAsUpdate(a))
 updateMapNode(a,a.getMap('nodes'),'root',{x:200});updateMapNode(b,b.getMap('nodes'),'root',{text:'Nouvelle idée'})
 Y.applyUpdate(a,Y.encodeStateAsUpdate(b),'remote');Y.applyUpdate(b,Y.encodeStateAsUpdate(a),'remote')
 assert.equal(mapNodes(a.getMap('nodes'))[0].x,200);assert.equal(mapNodes(a.getMap('nodes'))[0].text,'Nouvelle idée')
 assert.deepEqual(mapNodes(a.getMap('nodes')),mapNodes(b.getMap('nodes')))
 a.destroy();b.destroy()
})
test('deleting a branch removes its descendants and connections and can be undone',()=>{
 const doc=new Y.Doc(),store=doc.getMap('nodes'),links=doc.getMap('links')
 for(const n of [node('root'),node('child','root'),node('leaf','child'),node('other')])insertMapNode(doc,store,n)
 links.set('cross',{from:'leaf',to:'other'})
 const undo=new Y.UndoManager([store,links],{trackedOrigins:new Set([LOCAL_MAP_CHANGE])})
 removeMapBranch(doc,store,links,'child')
 assert.deepEqual(mapNodes(store).map(n=>n.id),['root','other']);assert.equal(links.size,0)
 undo.undo();assert.equal(store.size,4);assert.equal(links.size,1)
 undo.destroy();doc.destroy()
})
test('automatic layout handles forests and malformed cycles without duplicating nodes',()=>{
 const nodes=[node('root'),node('child','root'),node('leaf','child'),node('other'),node('a','b'),node('b','a')]
 const positions=layoutMap(nodes);assert.equal(positions.length,nodes.length);assert.equal(new Set(positions.map(p=>p.id)).size,nodes.length)
 assert(positions.find(p=>p.id==='leaf').x>positions.find(p=>p.id==='child').x)
 const fit=fitMap(positions.map(p=>({...p,text:p.id})),1200,800);assert(Number.isFinite(fit.x));assert(fit.k>=.15&&fit.k<=1.2)
 assert(nodeHeight('a'.repeat(1000))<=340)
})
