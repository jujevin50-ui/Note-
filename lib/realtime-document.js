import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
export const b64=u=>{let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)}
export const un=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
const pendingLeaves=new WeakMap()

export function connectDocument(client,id,doc,user) {
 const awareness=new Awareness(doc)
 awareness.setLocalStateField('user',user)
 const topic='doc:'+id
 let leaves=pendingLeaves.get(client)
 if(!leaves){leaves=new Map();pendingLeaves.set(client,leaves)}
 let channel,disposed=false,subscribed=false,timer,pending,awarenessDirty=true,sending=false
 const schedule=()=>{if(!disposed&&subscribed&&!timer&&!sending)timer=setTimeout(()=>{timer=null;flush()},100)}
 const send=async(event,update)=>{
  try{return await channel.send({type:'broadcast',event,payload:{d:b64(update)}})==='ok'}catch{return false}
 }
 const flush=async()=>{
  if(disposed||!subscribed||sending)return
  sending=true
  const update=pending;pending=null
  const announce=awarenessDirty;awarenessDirty=false
  try{
   if(update&&!await send('u',update))pending=pending?Y.mergeUpdates([update,pending]):update
   if(announce&&!await send('a',encodeAwarenessUpdate(awareness,[doc.clientID])))awarenessDirty=true
  }finally{sending=false;if(pending||awarenessDirty)schedule()}
 }
 const changed=(update,origin)=>{if(origin==='remote'||disposed)return;pending=pending?Y.mergeUpdates([pending,update]):update;schedule()}
 const presenceChanged=(_changes,origin)=>{if(origin==='remote'||disposed)return;awarenessDirty=true;schedule()}
 doc.on('update',changed);awareness.on('update',presenceChanged)
 const started=(leaves.get(topic)||Promise.resolve()).catch(()=>{}).then(()=>{
  if(disposed)return
  channel=client.channel(topic,{config:{broadcast:{ack:true}}})
  const receive=apply=>({payload})=>{if(disposed)return;try{apply(un(payload.d))}catch{}}
  channel.on('broadcast',{event:'u'},receive(update=>Y.applyUpdate(doc,update,'remote')))
   .on('broadcast',{event:'a'},receive(update=>applyAwarenessUpdate(awareness,update,'remote')))
   .on('broadcast',{event:'s'},receive(vector=>{pending=Y.mergeUpdates([...(pending?[pending]:[]),Y.encodeStateAsUpdate(doc,vector)]);schedule()}))
   .subscribe(status=>{
    if(disposed)return
    subscribed=status==='SUBSCRIBED'
    if(subscribed){
     // Reconcile missed edits after a reconnect; peers answer with their missing changes.
     pending=Y.encodeStateAsUpdate(doc);awarenessDirty=true
     send('s',Y.encodeStateVector(doc));schedule()
    }
   })
 })
 return {awareness,destroy(){
  if(disposed)return
  disposed=true;subscribed=false;clearTimeout(timer)
  doc.off('update',changed);awareness.off('update',presenceChanged)
  awareness.setLocalState(null)
  const lastUpdate=pending;pending=null
  const leaving=started.then(async()=>{
   if(!channel)return
   await Promise.all([...(lastUpdate?[send('u',lastUpdate)]:[]),send('a',encodeAwarenessUpdate(awareness,[doc.clientID]))])
   await client.removeChannel(channel)
  }).catch(()=>{})
  awareness.destroy();leaves.set(topic,leaving)
  leaving.finally(()=>{if(leaves.get(topic)===leaving)leaves.delete(topic)})
  return leaving
 }}
}
