import test from 'node:test'
import assert from 'node:assert/strict'
import { snapMapNode, alignmentTargets, arrowAlignmentBox } from './whiteboard-alignment.js'
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
 assert.deepEqual(snapMapNode(moving,{x:104,y:304},[first],1,true),{x:104,y:304,guides:[],spacing:[]})
 assert.deepEqual(snapMapNode(moving,{x:504,y:504},[moving]),{x:504,y:504,guides:[],spacing:[]})
})
test('arrow shafts use their actual size and snap against shapes and other arrows',()=>{
 const arrow={id:'arrow:a',alignmentOnly:true,x:0,y:0,width:200,height:0}
 const target={id:'arrow:b',alignmentOnly:true,x:400,y:100,width:200,height:0}
 const snapped=snapMapNode(arrow,{x:404,y:104},[target])
 assert.equal(snapped.x,400);assert.equal(snapped.y,100);assert.equal(snapped.guides.length,2);assert.deepEqual(snapped.spacing,[])
 const shape=snapMapNode(moving,{x:403,y:104},[target]);assert.equal(shape.x,400);assert.equal(shape.y,100)
 const toShape=snapMapNode(arrow,{x:104,y:153},[first]);assert.equal(toShape.x,100);assert.equal(toShape.y,150)
})

test('alignment excludes arrows following the moving object, including chained junctions',()=>{
 const geometry={d:'M 0 10 L 200 10'}
 const links=[{id:'a',from:'node',geometry},{id:'b',fromArrow:{id:'a',position:.5},geometry},{id:'c',geometry}]
 assert.deepEqual(alignmentTargets([],links,{nodeId:'node'}).map(n=>n.id),['arrow:c'])
 assert.deepEqual(alignmentTargets([],links,{arrowId:'a'}).map(n=>n.id),['arrow:c'])
 assert.deepEqual(arrowAlignmentBox(links[0]),{id:'arrow:a',x:0,y:10,width:200,height:0,alignmentOnly:true})
})
