import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Youtube from '@tiptap/extension-youtube'
import {Cell,HeadCell,LinkCard,Chart,PasteLink,NoteImage,NotePdf,UnderlineMark,ImagePaste} from './extensions'
export const TextLayout = Extension.create({
 name:'textLayout',
 addGlobalAttributes(){return[
  {types:['paragraph','heading'],attributes:{textAlign:{default:null,parseHTML:el=>el.style.textAlign||null,renderHTML:attrs=>attrs.textAlign?{style:`text-align:${attrs.textAlign}`}:{}}}},
  {types:['textStyle'],attributes:{fontSize:{default:null,parseHTML:el=>el.style.fontSize||null,renderHTML:attrs=>attrs.fontSize?{style:`font-size:${attrs.fontSize}`}:{}}}},
 ]},
 addCommands(){return{setTextAlign:align=>({commands})=>{if(!['left','center','right','justify'].includes(align))return false;const p=commands.updateAttributes('paragraph',{textAlign:align});const h=commands.updateAttributes('heading',{textAlign:align});return p||h}}},
})
export function richExtensions(syncExtensions=[]) {
 return [StarterKit.configure({history:false}),...syncExtensions,NoteImage,NotePdf,UnderlineMark,ImagePaste,TaskList,TaskItem.configure({nested:true}),Table.configure({resizable:true}),TableRow,HeadCell,Cell,TextStyle,TextLayout,Color,Highlight.configure({multicolor:true,HTMLAttributes:{class:'hl'}}),Youtube.configure({nocookie:true,width:640,height:360}),LinkCard,Chart,PasteLink]
}
