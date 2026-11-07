import * as Y from 'yjs'
import { b64, un, connect } from './provider'

export function openWhiteboardSession(client,{id,projectId,user,connectProvider=connect},onReady,onStatus) {
  const doc=new Y.Doc(),backupKey=`whiteboard-backup:${user.id}:${projectId}:${id}`
  let disposed=false,provider,timer,revision=0,saved=0,pending=false,initialized=false,failures=0,destroyed=false
  const finish=()=>{if(disposed&&!pending&&!destroyed){destroyed=true;queueMicrotask(()=>doc.destroy())}}
  const backup=encoded=>{try{localStorage.setItem(backupKey,encoded)}catch{}}
  const save=async()=>{
    if(!initialized||pending||revision===saved){if(disposed&&!pending)finish();return}
    clearTimeout(timer);pending=true
    const current=revision,encoded=b64(Y.encodeStateAsUpdate(doc))
    backup(encoded)
    if(!disposed)onStatus('saving')
    try{
      const {error}=await client.from('items').update({ydoc:encoded}).eq('id',id).eq('project_id',projectId)
      if(error)throw error
      saved=current;failures=0
      if(saved===revision){try{localStorage.removeItem(backupKey)}catch{}}
      if(!disposed)onStatus(saved===revision?'saved':'saving')
    }catch{failures++;if(!disposed)onStatus('error')}
    finally{
      pending=false
      if(revision!==saved&&(!disposed||failures<2))timer=setTimeout(save,disposed?300:3000)
      else finish()
    }
  }
  const changed=()=>{revision++;backup(b64(Y.encodeStateAsUpdate(doc)));if(!disposed)onStatus('saving');clearTimeout(timer);timer=setTimeout(save,650)}
  ;(async()=>{
    try{
      const{data,error}=await client.from('items').select('ydoc').eq('id',id).eq('project_id',projectId).single()
      if(error||!data)throw error||new Error('Tableau introuvable')
      if(disposed){finish();return}
      if(data.ydoc)Y.applyUpdate(doc,un(data.ydoc),'remote')
      try{const cached=localStorage.getItem(backupKey);if(cached){Y.applyUpdate(doc,un(cached),'recovery');revision++}}catch{}
      initialized=true
      doc.on('update',changed)
      provider=connectProvider(id,doc,{name:user.user_metadata?.name||user.email?.split('@')[0]||'Membre',color:'#a596e8'})
      onReady(doc);onStatus(revision?'saving':'saved')
      if(revision)timer=setTimeout(save,100)
    }catch{if(!disposed)onStatus('load-error');else finish()}
  })()
  return{retry:save,dispose(){disposed=true;clearTimeout(timer);doc.off('update',changed);provider?.destroy();if(initialized)save();else finish()}}
}
