import test from 'node:test'
import assert from 'node:assert/strict'
import { arrowInsertion } from './arrow-insertion.js'
import { connectionGeometry } from './mindmap-connections.js'
test('a new arrow appears below its button rather than at the board centre',()=>{
 const canvas={left:350,top:110,width:1100,height:700},button={left:440,width:65,bottom:100},view={x:-420,y:200,k:1.2}
 const p=arrowInsertion(canvas,button,view),g=connectionGeometry(null,null,{...p.styles,...p}),x=canvas.left+view.x+g.bounds.x*view.k,y=canvas.top+view.y+g.bounds.y*view.k
 assert(x>=canvas.left+11);assert(y>=button.bottom+12);assert(y<=canvas.top+13);assert(x<canvas.left+canvas.width/3)
})
test('placement respects pan/zoom and remains inside narrow viewports',()=>{
 for(const k of [.3,1,2.5]){
  const canvas={left:0,top:100,width:390,height:420},button={left:100,width:65,bottom:94},view={x:600,y:-300,k},p=arrowInsertion(canvas,button,view),g=connectionGeometry(null,null,{...p.styles,...p}),x=view.x+g.bounds.x*k,y=canvas.top+view.y+g.bounds.y*k
  assert(x>=11);assert(x+g.bounds.width*k<=canvas.width-11);assert(y>=canvas.top+11);assert(y+g.bounds.height*k<=canvas.top+canvas.height-11)
 }
})

test('new arrows are straight and horizontal by default',()=>{
 const p=arrowInsertion({left:0,top:100,width:1000,height:700},{left:100,width:65,bottom:90},{x:120,y:150,k:1})
 assert.equal(p.styles.lineStyle,'straight');assert.equal(p.fromPoint.y,p.toPoint.y)
 const g=connectionGeometry(null,null,{...p.styles,...p})
 assert(!/[CQ]/.test(g.d))
})
