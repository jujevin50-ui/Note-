import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import {connectDocument,b64,un} from './realtime-document.js'
const tick=()=>new Promise(resolve=>setImmediate(resolve))
function backend(){
 const channels=[]
 return {channels,channel(topic){
  const ch={topic,sent:[],listeners:{},on(_type,{event},fn){this.listeners[event]=fn;return this},subscribe(fn){this.status=fn;queueMicrotask(()=>fn('SUBSCRIBED'));return this},async send(message){this.sent.push(message);return this.result||'ok'}}
  channels.push(ch);return ch
 },async removeChannel(ch){channels.splice(channels.indexOf(ch),1)}}
}
test('typing and cursor bursts are merged without losing text or flooding the channel',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const client=backend(),doc=new Y.Doc(),connection=connectDocument(client,'page',doc,{name:'Alice'})
 await tick();t.mock.timers.tick(100);await tick();const ch=client.channels[0];ch.sent=[]
 for(let i=0;i<200;i++){doc.getText('body').insert(i,'x');connection.awareness.setLocalStateField('cursor',{position:i})}
 assert.equal(ch.sent.length,0);t.mock.timers.tick(100);await tick()
 assert.equal(ch.sent.filter(m=>m.event==='u').length,1);assert.equal(ch.sent.filter(m=>m.event==='a').length,1)
 const peer=new Y.Doc();for(const message of ch.sent)if(message.event==='u')Y.applyUpdate(peer,un(message.payload.d))
 assert.equal(peer.getText('body').toString(),'x'.repeat(200))
 await connection.destroy();doc.destroy();peer.destroy()
})
test('offline edits are retained, reconnect exchanges missing changes, and remote updates are not echoed',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const client=backend(),doc=new Y.Doc(),connection=connectDocument(client,'page',doc,{name:'Alice'})
 await tick();t.mock.timers.tick(100);await tick();const ch=client.channels[0];ch.sent=[]
 ch.status('CHANNEL_ERROR');doc.getText('body').insert(0,'offline');t.mock.timers.tick(1000);await tick();assert.equal(ch.sent.length,0)
 ch.status('SUBSCRIBED');t.mock.timers.tick(100);await tick();assert(ch.sent.some(m=>m.event==='s'))
 const peer=new Y.Doc();for(const m of ch.sent)if(m.event==='u')Y.applyUpdate(peer,un(m.payload.d));assert.equal(peer.getText('body').toString(),'offline')
 peer.getText('body').insert(7,' peer');ch.sent=[]
 ch.listeners.u({payload:{d:b64(Y.encodeStateAsUpdate(peer))}});t.mock.timers.tick(100);await tick();assert.equal(ch.sent.length,0);assert.equal(doc.getText('body').toString(),'offline peer')
 ch.listeners.s({payload:{d:b64(Y.encodeStateVector(new Y.Doc()))}});t.mock.timers.tick(100);await tick();assert.equal(ch.sent.filter(m=>m.event==='u').length,1)
 await connection.destroy();doc.destroy();peer.destroy()
})
test('failed broadcasts retry merged edits and destruction removes all document listeners',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const client=backend(),doc=new Y.Doc(),connection=connectDocument(client,'page',doc,{name:'Alice'})
 await tick();t.mock.timers.tick(100);await tick();const ch=client.channels[0];ch.sent=[];ch.result='timed out'
 doc.getText('body').insert(0,'a');t.mock.timers.tick(100);await tick()
 doc.getText('body').insert(1,'b');ch.result='ok';t.mock.timers.tick(100);await tick()
 const peer=new Y.Doc();for(const m of ch.sent)if(m.event==='u')Y.applyUpdate(peer,un(m.payload.d));assert.equal(peer.getText('body').toString(),'ab')
 await connection.destroy();const count=ch.sent.length
 doc.getText('body').insert(2,'c');t.mock.timers.tick(1000);await tick();assert.equal(ch.sent.length,count);assert.equal(client.channels.length,0)
 doc.destroy();peer.destroy()
})
test('immediate remount waits for the previous channel to leave',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const client=backend(),doc=new Y.Doc(),a=connectDocument(client,'page',doc,{name:'Alice'})
 await tick();const leaving=a.destroy(),b=connectDocument(client,'page',doc,{name:'Alice'})
 await leaving;await tick();assert.equal(client.channels.length,1)
 await b.destroy();doc.destroy()
})
test('two editors reconcile concurrent edits using their state vectors',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const client=backend(),originalChannel=client.channel.bind(client)
 client.channel=topic=>{
  const ch=originalChannel(topic),send=ch.send.bind(ch)
  ch.send=async message=>{const result=await send(message);for(const other of client.channels)if(other!==ch&&other.topic===topic)other.listeners[message.event]?.({payload:message.payload});return result}
  return ch
 }
 const one=new Y.Doc(),two=new Y.Doc();one.getText('body').insert(0,'Alice ');two.getText('body').insert(0,'Bob ')
 const a=connectDocument(client,'page',one,{name:'Alice'}),b=connectDocument(client,'page',two,{name:'Bob'})
 await tick();for(let i=0;i<3;i++){t.mock.timers.tick(100);await tick()}
 assert.equal(one.getText('body').toString(),two.getText('body').toString());assert(one.getText('body').toString().includes('Alice'));assert(one.getText('body').toString().includes('Bob'))
 one.getText('body').insert(0,'A');two.getText('body').insert(0,'B')
 t.mock.timers.tick(100);await tick()
 assert.equal(one.getText('body').toString(),two.getText('body').toString())
 await a.destroy();await b.destroy();one.destroy();two.destroy()
})
