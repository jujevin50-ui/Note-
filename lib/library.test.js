import test from 'node:test'
import assert from 'node:assert/strict'
import {selectLibraryItems} from './library.js'
import {moveDocumentToFolder} from './manual-order.js'
const items=[{id:'folder',title:'Racine',type:'folder',parent_id:null,pos:1},{id:'loose',title:'Page libre',type:'page',pos:2},{id:'sub',title:'Sous dossier',type:'folder',parent_id:'folder',pos:3},{id:'page',title:'Page classée',type:'page',parent_id:'sub',pos:4},{id:'invest',title:'Entreprise',type:'folder',space:'invest',parent_id:null,pos:5}]
test('root library includes unfiled documents but does not expose nested content',()=>{
 assert.deepEqual(selectLibraryItems(items).map(i=>i.id),['folder','loose','invest'])
 assert.deepEqual(selectLibraryItems(items,{filter:'page'}).map(i=>i.id),['loose'])
 assert.deepEqual(selectLibraryItems(items,{query:'classée'}).map(i=>i.id),['page'])
})
test('unfiled pages can move to nested folders and between spaces without changing their content',()=>{
 assert.deepEqual(moveDocumentToFolder(items,'loose','sub'),[{id:'loose',parent_id:'sub',pos:1028,space:'notes'}])
 assert.deepEqual(moveDocumentToFolder(items,'loose','invest'),[{id:'loose',parent_id:'invest',pos:1024,space:'invest'}])
 assert.deepEqual(moveDocumentToFolder(items,'page',null),[{id:'page',parent_id:null,pos:1026,space:'notes'}])
 assert.deepEqual(moveDocumentToFolder(items,'loose','page'),[])
 assert.deepEqual(moveDocumentToFolder(items,'folder','invest'),[])
 assert.deepEqual(moveDocumentToFolder(items,'page','sub'),[])
})
