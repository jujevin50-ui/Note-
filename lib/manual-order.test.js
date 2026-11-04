import test from 'node:test'
import assert from 'node:assert/strict'
import { reorderItems, compareItems } from './manual-order.js'
const items = [{id:'a',type:'page',parent_id:'r',pos:1024},{id:'b',type:'folder',parent_id:'r',pos:2048},{id:'c',type:'pdf',parent_id:'r',pos:3072}]
const apply = (input, updates) => input.map(item => ({...item,...updates.find(update=>update.id===item.id)})).sort(compareItems).map(i=>i.id)
test('manual sorting mixes pages, subfolders and PDFs in the requested order',()=>{
 assert.deepEqual(apply(items,reorderItems(items,'c','a')),['c','a','b'])
 assert.deepEqual(apply(items,reorderItems(items,'a','c',true)),['b','c','a'])
 assert.deepEqual(reorderItems(items,'a','b'),[])
 assert.deepEqual(reorderItems(items,'a','a'),[])
})
test('cross-folder and cross-space drops cannot move content',()=>{
 assert.deepEqual(reorderItems([...items,{id:'d',parent_id:'elsewhere'}],'a','d'),[])
 assert.deepEqual(reorderItems([...items,{id:'d',parent_id:'r',space:'invest'}],'a','d'),[])
 assert.deepEqual(reorderItems(items,'missing','a'),[])
})
test('ties and exhausted position precision are rebalanced',()=>{
 const tied=items.map(item=>({...item,pos:1}))
 assert.deepEqual(apply(tied,reorderItems(tied,'c','b')),['a','c','b'])
 const close=items.map((item,index)=>({...item,pos:index===0?1:index===1?1+Number.EPSILON:2}))
 assert.deepEqual(apply(close,reorderItems(close,'c','b')),['a','c','b'])
})
