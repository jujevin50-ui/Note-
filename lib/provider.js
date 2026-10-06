import * as Y from 'yjs'
import {Awareness,encodeAwarenessUpdate,applyAwarenessUpdate} from 'y-protocols/awareness'
import {supabase} from './supabase'
export const b64=u=>{let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)}
export const un=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
// Provider Yjs minimal via Supabase Realtime (broadcast)
export function connect(id,ydoc,user){
 const awareness=new Awareness(ydoc);awareness.setLocalStateField('user',user)
 const ch=supabase.channel('doc:'+id)
 const send=(event,u)=>ch.send({type:'broadcast',event,payload:{d:b64(u)}})
 ydoc.on('update',(u,o)=>{if(o!=='remote')send('u',u)})
 awareness.on('update',({added,updated,removed},o)=>{if(o!=='remote')send('a',encodeAwarenessUpdate(awareness,[...added,...updated,...removed]))})
 ch.on('broadcast',{event:'u'},({payload})=>Y.applyUpdate(ydoc,un(payload.d),'remote'))
  .on('broadcast',{event:'a'},({payload})=>applyAwarenessUpdate(awareness,un(payload.d),'remote'))
  .subscribe(s=>{if(s==='SUBSCRIBED')send('a',encodeAwarenessUpdate(awareness,[ydoc.clientID]))})
 return {awareness,destroy(){awareness.destroy();supabase.removeChannel(ch)}}
}
