import test from 'node:test'
import assert from 'node:assert/strict'
import {whiteboardPrintLayout} from './whiteboard-pdf.js'
test('PDF framing includes negative positions and distant arrow bends, independently of canvas zoom',()=>{
 const nodes=[{x:-1200,y:-600,width:220,height:150},{x:2000,y:400,width:300,height:200}],links=[{geometry:{bounds:{x:-1300,y:-900,width:4000,height:1800}}}]
 const layout=whiteboardPrintLayout(nodes,links)
 assert.equal(layout.x,-1300);assert.equal(layout.y,-900);assert.equal(layout.width,4040);assert.equal(layout.height,1840)
 assert.equal(layout.landscape,true);assert(layout.scale<1)
 assert(layout.width*layout.scale<=layout.paperWidth);assert(layout.height*layout.scale<=layout.paperHeight-56)
})
test('tall boards use portrait, compact boards are not upscaled and empty export is unavailable',()=>{
 assert.equal(whiteboardPrintLayout([],[]),null)
 assert.equal(whiteboardPrintLayout([{x:0,y:0,width:200,height:2000}],[]).landscape,false)
 assert.equal(whiteboardPrintLayout([{x:0,y:0,width:200,height:100}],[]).scale,1)
})
