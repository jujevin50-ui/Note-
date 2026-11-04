'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BubbleMenu } from '@tiptap/react'
import { TableMap } from '@tiptap/pm/tables'
import ToolbarIcon from './ToolbarIcon'
import './table-tools.css'

const COLORS = [['#fff3a3','Jaune'],['#ffe0b2','Orange'],['#ffd0d8','Rose'],['#c8f5d4','Vert'],['#cfe4ff','Bleu'],['#ead9ff','Violet']]
const SECTIONS = [['rows','Lignes'],['columns','Colonnes'],['cells','Cellules'],['style','Couleurs']]
export default function TableTools({ editor }) {
  const [section, setSection] = useState('rows')
  const [, refresh] = useState(0)
  useEffect(() => {
    const update = () => refresh(value => value + 1)
    editor.on('transaction', update)
    return () => editor.off('transaction', update)
  }, [editor])
  const selection = editor.state.selection
  let table
  for (let depth = selection.$from.depth; depth > 0; depth--) {
    if (selection.$from.node(depth).type.name === 'table') { table = selection.$from.node(depth); break }
  }
  const dimensions = table ? TableMap.get(table) : null
  const run = (command, ...args) => editor.chain().focus()[command](...args).run()
  const action = (label, command, { danger = false, active, args = [] } = {}) => <button type="button" key={command} className={'table-action' + (danger ? ' danger' : '')} disabled={!editor.can()[command](...args)} aria-pressed={active} onClick={() => run(command, ...args)}>{label}</button>
  const background = editor.getAttributes('tableCell').background || editor.getAttributes('tableHeader').background || null
  return createPortal(<BubbleMenu editor={editor} shouldShow={({ editor: current }) => current.isActive('table')} tippyOptions={{ placement:'top-start', maxWidth:'none', interactive:true, appendTo:() => document.body, zIndex:70, theme:'table-tools', offset:[0,12], popperOptions:{strategy:'fixed',modifiers:[{name:'preventOverflow',options:{padding:12}},{name:'flip',options:{fallbackPlacements:['bottom-start','top-end','bottom-end']}}]} }}>
    <div className="table-tools" role="group" aria-label="Outils du tableau" onMouseDown={e => e.preventDefault()}>
      <header className="table-tools-heading"><span><ToolbarIcon name="table"/>Tableau</span><small>{dimensions ? `${dimensions.height} lignes · ${dimensions.width} colonnes` : ''}</small></header>
      <div className="table-tools-sections" aria-label="Catégorie d’outils">{SECTIONS.map(([key,label]) => <button type="button" key={key} aria-pressed={section===key} onClick={() => setSection(key)}>{label}</button>)}</div>
      <div className="table-tools-actions">
        {section==='rows' && <>
          {action('Insérer au-dessus','addRowBefore')}{action('Insérer en dessous','addRowAfter')}
          {action('Ligne d’en-tête','toggleHeaderRow',{active: Boolean(table?.firstChild && Array.from({length:table.firstChild.childCount},(_,i)=>table.firstChild.child(i)).every(node=>node.type.name==='tableHeader'))})}
          {action('Supprimer la ligne','deleteRow',{danger:true})}
        </>}
        {section==='columns' && <>
          {action('Insérer à gauche','addColumnBefore')}{action('Insérer à droite','addColumnAfter')}
          {action('Colonne d’en-tête','toggleHeaderColumn',{active:Boolean(table && Array.from({length:table.childCount},(_,i)=>table.child(i).firstChild?.type.name==='tableHeader').every(Boolean))})}
          {action('Supprimer la colonne','deleteColumn',{danger:true})}
        </>}
        {section==='cells' && <>
          {action('Fusionner les cellules','mergeCells')}{action('Séparer la cellule','splitCell')}
          {action('Cellule d’en-tête','toggleHeaderCell',{active:editor.isActive('tableHeader')})}
          <p className="table-tools-help">Pour fusionner, sélectionne plusieurs cellules en glissant de l’une à l’autre.</p>
        </>}
        {section==='style' && <div className="table-colors"><p>Fond des cellules sélectionnées</p><div>{COLORS.map(([color,label]) => <button type="button" key={color} style={{'--cell-color':color}} className="table-color" aria-label={'Fond '+label.toLowerCase()} title={label} aria-pressed={background===color} onClick={() => run('setCellAttribute','background',color)} />)}</div>{action('Retirer la couleur','setCellAttribute',{args:['background',null]})}</div>}
      </div>
      <footer className="table-tools-footer"><small>Tab ↹ cellule suivante</small>{action('Supprimer le tableau','deleteTable',{danger:true})}</footer>
    </div>
  </BubbleMenu>, document.body)
}
