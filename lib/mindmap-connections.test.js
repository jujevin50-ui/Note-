import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { insertMapNode, mapNodes, mapConnections, LOCAL_MAP_CHANGE } from './mindmap.js'
import { connectionAnchor, nearestConnectionAnchor, connectionGeometry, updateConnection, connectionStyle } from './mindmap-connections.js'
const root={id:'root',x:100,y:100,width:300,height:180,color:'#b18aef',text:'Sujet'},child={id:'child',parentId:'root',x:650,y:400,width:220,height:120,text:'Branche'}
test('anchors support all sides, offsets and automatic vertical attachment',()=>{
 assert.equal(connectionAnchor(root,'top',.25).x,175)
 assert.equal(connectionAnchor(root,'bottom',.5).y,280)
 assert.equal(connectionAnchor(root,'left',.5).x,100)
 assert.equal(connectionAnchor(root,'right',.75).y,235)
 assert.equal(connectionAnchor(root,'auto',.5,{...child,x:100,y:700}).side,'bottom')
 assert.equal(connectionAnchor(root,'right',Infinity).y,190)
 assert.equal(connectionAnchor(root,'top',-1).x,100)
})
test('ellipses and rounded outlines remain attached after resizing and dragging',()=>{
 const ellipse={...root,shape:'ellipse'},anchor=connectionAnchor(ellipse,'top',.25)
 assert(Math.abs(((anchor.x-250)/150)**2+((anchor.y-190)/90)**2-1)<1e-9)
 const nearest=nearestConnectionAnchor(ellipse,anchor);assert.equal(nearest.side,'top');assert.equal(nearest.offset,.25)
 const rounded=connectionAnchor({...root,shape:'pill'},'top',0);assert.equal(rounded.y,145)
 const bigger=connectionAnchor({...ellipse,width:600,height:360},nearest.side,nearest.offset);assert.equal(bigger.x,250);assert(bigger.y>anchor.y)
})
test('curve, straight and elbow routes use exact chosen endpoints and arrow overrides',()=>{
 for(const lineStyle of ['curve','straight','step']){
  const g=connectionGeometry(root,child,{fromSide:'bottom',toSide:'top',fromOffset:.25,toOffset:.75,lineStyle,arrowEnd:false,arrowStart:true,stroke:'#123456',width:5,dash:'dotted'},{arrows:true})
  assert.equal(g.start.x,175);assert.equal(g.end.x,815);assert.equal(g.start.y,280);assert.equal(g.end.y,400)
  assert(g.d.startsWith('M 175 280'));assert(g.d.endsWith('815 400'));assert(!g.d.includes('NaN'))
  assert.equal(g.arrowEnd,false);assert.equal(g.arrowStart,true);assert.equal(g.color,'#123456');assert.equal(g.width,5)
 }
 assert(connectionGeometry(root,child,{}, {arrows:true}).arrowEnd)
 assert.equal(connectionGeometry(root,child,{width:999}).width,8)
})
test('primary and extra link settings survive persistence and support undo without detaching nodes',()=>{
 const doc=new Y.Doc(),nodes=doc.getMap('nodes'),links=doc.getMap('links'),styles=doc.getMap('styles')
 insertMapNode(doc,nodes,root);insertMapNode(doc,nodes,child);links.set('cross',{from:'child',to:'root'})
 const undo=new Y.UndoManager(styles,{trackedOrigins:new Set([LOCAL_MAP_CHANGE])})
 updateConnection(doc,styles,'parent:child',{fromSide:'bottom',toSide:'top',fromOffset:.3,arrowEnd:true})
 undo.stopCapturing();updateConnection(doc,styles,'parent:child',{fromOffset:.7})
 undo.undo();assert.equal(connectionStyle(styles,'parent:child').fromOffset,.3)
 assert.equal(mapNodes(nodes).find(n=>n.id==='child').parentId,'root');assert.equal(mapConnections(mapNodes(nodes),links).length,1)
 updateConnection(doc,styles,'cross',{width:5,dash:'dotted'})
 const restored=new Y.Doc();Y.applyUpdate(restored,Y.encodeStateAsUpdate(doc))
 assert.equal(connectionStyle(restored.getMap('styles'),'parent:child').toSide,'top');assert.equal(connectionStyle(restored.getMap('styles'),'cross').width,5)
 undo.destroy();doc.destroy();restored.destroy()
})
test('concurrent connection edits retain independent attributes',()=>{
 const a=new Y.Doc(),sa=a.getMap('styles');
 const b=new Y.Doc();Y.applyUpdate(b,Y.encodeStateAsUpdate(a));const sb=b.getMap('styles')
 updateConnection(a,sa,'link',{fromSide:'bottom'});updateConnection(b,sb,'link',{width:6})
 Y.applyUpdate(a,Y.encodeStateAsUpdate(b),'remote');Y.applyUpdate(b,Y.encodeStateAsUpdate(a),'remote')
 assert.deepEqual(connectionStyle(sa,'link'),{fromSide:'bottom',width:6});assert.deepEqual(connectionStyle(sa,'link'),connectionStyle(sb,'link'))
 a.destroy();b.destroy()
})
test('curved and elbow routes avoid the interior of both endpoint blocks for every side pairing',()=>{
 const sides=['top','right','bottom','left']
 const samples=d=>{const tokens=d.replaceAll(',',' ').split(/\s+/);let i=0,p,points=[];while(i<tokens.length){const op=tokens[i++],read=()=>({x:Number(tokens[i++]),y:Number(tokens[i++])});if(op==='M'){p=read();points.push(p);continue}const a=p;if(op==='L'){const b=read();for(let t=.01;t<=1;t+=.01)points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});p=b}else if(op==='Q'){const b=read(),c=read();for(let t=.01;t<=1;t+=.01)points.push({x:(1-t)**2*a.x+2*(1-t)*t*b.x+t*t*c.x,y:(1-t)**2*a.y+2*(1-t)*t*b.y+t*t*c.y});p=c}else if(op==='C'){const b=read(),c=read(),e=read();for(let t=.01;t<=1;t+=.01)points.push({x:(1-t)**3*a.x+3*(1-t)**2*t*b.x+3*(1-t)*t*t*c.x+t**3*e.x,y:(1-t)**3*a.y+3*(1-t)**2*t*b.y+3*(1-t)*t*t*c.y+t**3*e.y});p=e}else assert.fail('Unexpected path command '+op)}return points}
 for(const target of [child,{...child,x:650,y:100},{...child,x:100,y:600},{...child,x:-450,y:-350}])for(const lineStyle of ['curve','step'])for(const fromSide of sides)for(const toSide of sides){
  const g=connectionGeometry(root,target,{fromSide,toSide,lineStyle})
  for(const p of samples(g.d))for(const n of [root,target])assert(!(p.x>n.x+.01&&p.x<n.x+n.width-.01&&p.y>n.y+.01&&p.y<n.y+n.height-.01),`${lineStyle} ${fromSide} → ${toSide}: ${JSON.stringify(p)}`)
 }
})
