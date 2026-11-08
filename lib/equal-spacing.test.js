import test from 'node:test'
import assert from 'node:assert/strict'
import { snapMapNode } from './whiteboard-alignment.js'
const box=(id,x,y=0,width=200,height=100)=>({id,x,y,width,height}),a=box('a',0),b=box('b',280),c=box('c',560)
test('three boxes snap to equal edge gaps with two matching measurements',()=>{
 for(const [moving,nodes,x,expected]of [[b,[a,b,c],283,280],[c,[a,b,c],564,560],[a,[a,b,c],-4,0]]){
  const result=snapMapNode(moving,{x,y:0},nodes);assert.equal(result.x,expected);assert.equal(result.spacing.length,1);assert.equal(result.spacing[0].gap,80);assert.equal(result.spacing[0].spans.length,2)
 }
})
test('vertical equal gaps and different box sizes use edge distances',()=>{
 const nodes=[box('a',0,0,200,100),box('b',0,180,200,150),box('c',0,410,200,200)],r=snapMapNode(nodes[1],{x:0,y:184},nodes)
 assert.equal(r.y,180);assert.equal(r.spacing[0].axis,'y');assert.equal(r.spacing[0].gap,80)
 const horizontal=[box('a',0,0,150),box('b',230,0,300),box('c',610,0,220)],h=snapMapNode(horizontal[1],{x:234,y:0},horizontal)
 assert.equal(h.x,230);assert.equal(h.spacing[0].gap,80)
})
test('spacing ignores other rows, overlapping boxes and distances outside the screen threshold',()=>{
 assert.equal(snapMapNode(b,{x:293,y:0},[a,b,c]).spacing.length,0)
 assert.equal(snapMapNode(b,{x:283,y:300},[a,b,c]).spacing.length,0)
 assert.equal(snapMapNode(b,{x:283,y:0},[a,b,c],2).spacing.length,1)
 assert.equal(snapMapNode(b,{x:284,y:0},[a,b,c],2).spacing.length,0)
 assert.equal(snapMapNode(b,{x:283,y:0},[a,b,c],1,true).spacing.length,0)
 const overlap=[box('a',0),box('b',100),box('c',200)];assert.equal(snapMapNode(overlap[1],{x:104,y:0},overlap).spacing.length,0)
})
