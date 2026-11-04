'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { documentVideo } from '../lib/youtube-preview'
export default function useVideoThumbnails(projectId, folderId, enabled) {
  const [state,setState]=useState({key:'',videos:{},error:false})
  const key=projectId+':'+folderId
  useEffect(()=>{
    if(!enabled || !projectId)return
    let live=true, sequence=0, timer
    const load=async()=>{
      const request=++sequence
      const {data,error}=await supabase.from('items').select('id,ydoc').eq('project_id',projectId).eq('parent_id',folderId).eq('type','page')
      if(!live || request!==sequence)return
      setState({key,videos:Object.fromEntries((data||[]).map(row=>[row.id,documentVideo(row.ydoc)])),error:Boolean(error)})
    }
    load()
    const channel=supabase.channel('video-preview:'+folderId+':'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'items',filter:'parent_id=eq.'+folderId},()=>{clearTimeout(timer);timer=setTimeout(load,200)}).subscribe()
    const visible=()=>{if(document.visibilityState==='visible')load()}
    document.addEventListener('visibilitychange',visible)
    return()=>{live=false;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);supabase.removeChannel(channel)}
  },[projectId,folderId,enabled,key])
  return {videos:enabled&&state.key===key?state.videos:{},error:enabled&&state.key===key&&state.error}
}
