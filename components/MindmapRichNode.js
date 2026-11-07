'use client'
import { useEffect, useMemo } from 'react'
import { Extension } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import { ySyncPlugin } from 'y-prosemirror'
import { richExtensions } from './richExtensions'

export default function MindmapRichNode({fragment,navigation=false,editing,onActivate,onReady,onFinish,undoManager}) {
 const extensions=useMemo(()=>richExtensions([Extension.create({
  name:'mindmapSync',
  addProseMirrorPlugins(){return [ySyncPlugin(fragment)]},
  addKeyboardShortcuts(){return {'Mod-z':()=>{if(!this.editor.isEditable)return false;undoManager.current?.undo();return true},'Mod-Shift-z':()=>{if(!this.editor.isEditable)return false;undoManager.current?.redo();return true},'Mod-y':()=>{if(!this.editor.isEditable)return false;undoManager.current?.redo();return true}}},
 })]),[fragment])
 const editor=useEditor({immediatelyRender:false,extensions,editable:editing,editorProps:{attributes:{'aria-label':'Texte du sujet'}}},[fragment])
 useEffect(()=>{if(!editor)return;onReady?.(editor);return()=>onReady?.(null)},[editor])
 useEffect(()=>{
  if(!editor||editor.isDestroyed)return
  editor.setEditable(editing,false)
  if(editing){onActivate(editor);editor.commands.focus('end',{scrollIntoView:false})}
  return()=>{if(editing)onActivate(null)}
 },[editor,editing])
 return <div inert={navigation?'':undefined} className={'mindmap-rich-content'+(editing?' editing':'')} onKeyDown={event=>{if(!editing)return;event.stopPropagation();if(event.key==='Escape'||(event.key==='Enter'&&(event.ctrlKey||event.metaKey))){event.preventDefault();onFinish()}}}><EditorContent editor={editor}/></div>
}
