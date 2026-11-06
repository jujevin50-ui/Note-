import test from 'node:test'
import assert from 'node:assert/strict'
import { dropItems, compareItems } from './manual-order.js'
const items=[{id:'a',type:'folder',parent_id:null,pos:1},{id:'b',type:'folder',parent_id:null,pos:2},{id:'page',type:'page',parent_id:'a',pos:100},{id:'pdf',type:'pdf',parent_id:'b',pos:200},{id:'nested',type:'folder',parent_id:'a',pos:300},{id:'child',type:'page',parent_id:'nested',pos:100}]
const apply=changes=>items.map(item=>({...item,...changes.find(change=>change.id===item.id)}))
test('pages and PDFs can be moved to another folder or back to the root',()=>{
 for(const [id,parent] of [['page','b'],['pdf','a'],['page',null]]){
  const changes=dropItems(items,id,parent,'inside')
  assert.equal(changes.length,1)
  assert.equal(changes[0].parent_id,parent)
  assert(Number.isSafeInteger(changes[0].pos))
 }
})
test('moving a folder keeps its entire subtree attached',()=>{
 const next=apply(dropItems(items,'nested','b','inside'))
 assert.equal(next.find(i=>i.id==='nested').parent_id,'b')
 assert.equal(next.find(i=>i.id==='child').parent_id,'nested')
})
test('self, descendant, foreign-space and invalid destinations are rejected',()=>{
 assert.deepEqual(dropItems(items,'a','nested','inside'),[])
 assert.deepEqual(dropItems(items,'nested','nested','inside'),[])
 assert.deepEqual(dropItems(items,'a','child','before'),[])
 assert.deepEqual(dropItems(items,'page','missing','inside'),[])
 assert.deepEqual(dropItems(items,'page','pdf','inside'),[])
 assert.deepEqual(dropItems(items,'missing','b','inside'),[])
 assert.deepEqual(dropItems([...items,{id:'invest',type:'folder',space:'invest'}],'a','invest','inside'),[])
})
test('cross-folder insertion before or after a file saves parent and order together',()=>{
 for(const zone of ['before','after']){
  const changes=dropItems(items,'page','pdf',zone)
  const siblings=apply(changes).filter(i=>i.parent_id==='b').sort(compareItems)
  assert.equal(changes.find(i=>i.id==='page').parent_id,'b')
  assert.deepEqual(siblings.map(i=>i.id),zone==='before'?['page','pdf']:['pdf','page'])
 }
 assert.deepEqual(dropItems(items,'page','a','inside'),[])
})
