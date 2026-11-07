import test from 'node:test'
import assert from 'node:assert/strict'
import { snapMapNode } from './whiteboard-alignment.js'
const first={id:'a',x:100,y:100,width:200,height:100},moving={id:'b',x:500,y:500,width:200,height:100}
test('moving shapes snap to edges and centres and return visible guide extents',()=>{
 let result=snapMapNode(moving,{x:104,y:304},[first,moving]);assert.equal(result.x,100);assert.equal(result.guides.length,1)
 result=snapMapNode(moving,{x:303,y:103},[first,moving]);assert.equal(result.x,300);assert.equal(result.y,100);assert.equal(result.guides.length,2)
 assert(result.guides[0].y2>=result.y+100);assert(result.guides[1].x2>=result.x+200)
 result=snapMapNode({...moving,width:140,height:70},{x:127,y:316},[first]);assert.equal(result.x,130)
})
test('alignment threshold stays consistent on screen, excludes self, and Alt can disable it',()=>{
 assert.equal(snapMapNode(moving,{x:104,y:304},[first],2).x,104)
 assert.equal(snapMapNode(moving,{x:109,y:304},[first],.5).x,100)
 assert.deepEqual(snapMapNode(moving,{x:104,y:304},[first],1,true),{x:104,y:304,guides:[]})
 assert.deepEqual(snapMapNode(moving,{x:504,y:504},[moving]),{x:504,y:504,guides:[]})
})
