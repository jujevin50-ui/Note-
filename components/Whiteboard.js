'use client'
import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { supabase } from '../lib/supabase'
import { openWhiteboardSession } from '../lib/whiteboard-session'
import { LOCAL_MAP_CHANGE, MAP_COLORS, NODE_WIDTH, nodeHeight, mapNodes, insertMapNode, updateMapNode, removeMapBranch, mapConnections, layoutMap, fitMap } from '../lib/mindmap'
import './whiteboard.css'

export default function Whiteboard({id,projectId,user,title}) {
  const [doc,setDoc]=useState(null),[status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0)
  const session=useRef(null)
  useEffect(()=>{setDoc(null);setStatus('loading');const current=openWhiteboardSession(supabase,{id,projectId,user},setDoc,setStatus);session.current=current;return()=>{session.current=null;current.dispose()}},[id,projectId,attempt])
  if(!doc)return <div className="whiteboard-loading" role="status"><p>{status==='load-error'?'Impossible de charger ce tableau blanc.':'Chargement du tableau blanc…'}</p>{status==='load-error'&&<button type="button" onClick={()=>setAttempt(value=>value+1)}>Réessayer</button>}</div>
  return <MindMapCanvas key={id+':'+attempt} doc={doc} title={title} status={status} retry={()=>session.current?.retry()}/>
}

export function MindMapCanvas({doc,title='Tableau blanc',status='saved',retry}) {
  const store=doc.getMap('mindmap-nodes'),links=doc.getMap('mindmap-links')
  const [nodes,setNodes]=useState(()=>mapNodes(store)),[connections,setConnections]=useState(()=>mapConnections(mapNodes(store),links))
  const [selected,setSelected]=useState(null),[editing,setEditing]=useState(null),[draft,setDraft]=useState('')
  const [view,setView]=useState({x:120,y:150,k:1}),[preview,setPreview]=useState(null),[linking,setLinking]=useState(false)
  const [history,setHistory]=useState({undo:false,redo:false}),[help,setHelp]=useState(false)
  const canvas=useRef(null),gesture=useRef(null),undo=useRef(null),initialFit=useRef(false),editField=useRef(null),editingId=useRef(null)
  const active=nodes.find(node=>node.id===selected)
  useEffect(()=>{
    const manager=new Y.UndoManager([store,links],{trackedOrigins:new Set([LOCAL_MAP_CHANGE]),captureTimeout:400})
    undo.current=manager
    const refresh=()=>{const next=mapNodes(store);setNodes(next);setConnections(mapConnections(next,links));setHistory({undo:manager.undoStack.length>0,redo:manager.redoStack.length>0})}
    store.observeDeep(refresh);links.observeDeep(refresh)
    manager.on('stack-item-added',refresh);manager.on('stack-item-popped',refresh);manager.on('stack-cleared',refresh)
    refresh()
    return()=>{store.unobserveDeep(refresh);links.unobserveDeep(refresh);manager.destroy();undo.current=null}
  },[doc,store,links])
  useEffect(()=>{if(!initialFit.current&&nodes.length&&canvas.current){const rect=canvas.current.getBoundingClientRect();setView(fitMap(nodes,rect.width,rect.height));initialFit.current=true}},[nodes])
  useEffect(()=>{if(editing){editField.current?.focus();editField.current?.select()}},[editing])
  useEffect(()=>{const surface=canvas.current;if(!surface)return;const prevent=event=>event.preventDefault();surface.addEventListener('wheel',prevent,{passive:false});return()=>surface.removeEventListener('wheel',prevent)},[])
  useEffect(()=>{if(selected&&!nodes.some(node=>node.id===selected)){setSelected(null);setEditing(null);setLinking(false)}},[nodes,selected])
  const beginEdit=node=>{editingId.current=node.id;setSelected(node.id);setDraft(node.text);setEditing(node.id);setLinking(false)}
  const finishEdit=()=>{const id=editingId.current;if(!id)return;editingId.current=null;if(store.has(id)){undo.current?.stopCapturing();updateMapNode(doc,store,id,{text:draft.trim()||'Idée'});undo.current?.stopCapturing()}setEditing(null)}
  const add=(kind='root')=>{
    if(editing)finishEdit()
    const parent=kind==='child'?active:kind==='sibling'?nodes.find(node=>node.id===active?.parentId):null
    const rect=canvas.current.getBoundingClientRect()
    const siblings=parent?nodes.filter(node=>node.parentId===parent.id):[]
    const offset=siblings.length?Math.ceil(siblings.length/2)*125*(siblings.length%2?1:-1):0
    const node={id:crypto.randomUUID(),text:parent?'Nouvelle idée':nodes.length?'Nouveau sujet':'Sujet central',parentId:parent?.id||null,x:parent?parent.x+320:(rect.width/2-view.x)/view.k-NODE_WIDTH/2,y:parent?parent.y+offset:(rect.height/2-view.y)/view.k-40,color:parent?MAP_COLORS[siblings.length%MAP_COLORS.length][0]:MAP_COLORS[0][0],shape:'card'}
    undo.current?.stopCapturing();insertMapNode(doc,store,node);undo.current?.stopCapturing();beginEdit(node)
    const screenX=node.x*view.k+view.x,screenY=node.y*view.k+view.y
    if(screenX<30||screenX+NODE_WIDTH*view.k>rect.width-30||screenY<30||screenY+nodeHeight(node.text)*view.k>rect.height-30)setView(current=>({...current,x:rect.width/2-(node.x+NODE_WIDTH/2)*current.k,y:rect.height/2-(node.y+nodeHeight(node.text)/2)*current.k}))
  }
  const remove=()=>{if(!active)return;undo.current?.stopCapturing();removeMapBranch(doc,store,links,active.id);undo.current?.stopCapturing();setSelected(null);setLinking(false)}
  const fit=()=>{const rect=canvas.current.getBoundingClientRect();setView(fitMap(nodes,rect.width,rect.height))}
  const zoom=(factor,point)=>setView(current=>{const rect=canvas.current.getBoundingClientRect(),x=point?.x??rect.width/2,y=point?.y??rect.height/2,k=Math.max(.15,Math.min(2.5,current.k*factor));return{k,x:x-(x-current.x)*k/current.k,y:y-(y-current.y)*k/current.k}})
  const organize=()=>{undo.current?.stopCapturing();doc.transact(()=>layoutMap(nodes).forEach(position=>updateMapNode(doc,store,position.id,{x:position.x,y:position.y})),LOCAL_MAP_CHANGE);undo.current?.stopCapturing();requestAnimationFrame(()=>{const rect=canvas.current.getBoundingClientRect();const layout=layoutMap(nodes);setView(fitMap(nodes.map(node=>({...node,...layout.find(p=>p.id===node.id)})),rect.width,rect.height))})}
  const selectNode=node=>{
    if(linking&&active&&node.id!==active.id){const exists=connections.some(link=>(link.from===active.id&&link.to===node.id)||(link.to===active.id&&link.from===node.id));if(!exists){undo.current?.stopCapturing();doc.transact(()=>links.set(crypto.randomUUID(),{from:active.id,to:node.id}),LOCAL_MAP_CHANGE);undo.current?.stopCapturing()}setLinking(false);return true}
    setSelected(node.id);return false
  }
  const nodeDown=(event,node)=>{
    if(event.button!==0||event.target.closest('textarea'))return
    event.stopPropagation()
    if(editing)finishEdit()
    if(selectNode(node))return
    if(linking)return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current={type:'node',id:node.id,startX:event.clientX,startY:event.clientY,x:node.x,y:node.y,pointer:event.pointerId}
  }
  const move=event=>{
    const current=gesture.current
    if(!current||current.pointer!==event.pointerId)return
    const dx=event.clientX-current.startX,dy=event.clientY-current.startY
    if(current.type==='pan')setView({...view,x:current.x+dx,y:current.y+dy})
    else setPreview({id:current.id,x:current.x+dx/view.k,y:current.y+dy/view.k})
  }
  const end=event=>{
    const current=gesture.current
    if(!current||current.pointer!==event.pointerId)return
    if(current.type==='node'&&Math.hypot(event.clientX-current.startX,event.clientY-current.startY)>2){undo.current?.stopCapturing();updateMapNode(doc,store,current.id,{x:current.x+(event.clientX-current.startX)/view.k,y:current.y+(event.clientY-current.startY)/view.k});undo.current?.stopCapturing()}
    gesture.current=null;setPreview(null)
  }
  const keyboard=event=>{
    if(event.target.closest('textarea,input,button'))return
    if(event.key==='Escape'){setLinking(false);setSelected(null);return}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?undo.current?.redo():undo.current?.undo();return}
    if(event.key==='Tab'&&active){event.preventDefault();add('child')}
    if(event.key==='Enter'&&active){event.preventDefault();add('sibling')}
    if(event.key==='F2'&&active){event.preventDefault();beginEdit(active)}
    if(['Delete','Backspace'].includes(event.key)&&active){event.preventDefault();remove()}
  }
  const rendered=nodes.map(node=>preview?.id===node.id?{...node,...preview}:node)
  return <section className="mindmap" aria-label={'Tableau blanc : '+title} onKeyDown={keyboard}>
    <header className="mindmap-heading"><div><h1>{title}</h1><span role="status">{status==='saved'?'Enregistré':status==='error'?'Enregistrement à réessayer':'Enregistrement…'}</span></div>{status==='error'&&<button type="button" onClick={retry}>Réessayer</button>}<button type="button" onClick={()=>setHelp(value=>!value)} aria-expanded={help}>Aide</button></header>
    <div className="mindmap-toolbar" role="toolbar" aria-label="Outils de carte mentale">
      <button type="button" onClick={()=>add()}>＋ Sujet</button><button type="button" disabled={!active} onClick={()=>add('child')}>＋ Branche <kbd>Tab</kbd></button><button type="button" disabled={!active} onClick={()=>add('sibling')}>＋ Idée sœur</button>
      <span className="mindmap-separator"/><button type="button" disabled={!active} aria-pressed={linking} onClick={()=>setLinking(value=>!value)}>Relier</button><button type="button" disabled={!active} onClick={()=>beginEdit(active)}>Modifier</button>
      <label className="mindmap-shape">Forme<select aria-label="Forme du bloc" disabled={!active} value={active?.shape||'card'} onChange={e=>updateMapNode(doc,store,active.id,{shape:e.target.value})}><option value="card">Rectangle</option><option value="pill">Arrondie</option></select></label>
      <div className="mindmap-colors" role="group" aria-label="Couleur du bloc">{MAP_COLORS.map(([color,name])=><button type="button" key={color} disabled={!active} aria-label={name} aria-pressed={active?.color===color} style={{background:color}} onClick={()=>updateMapNode(doc,store,active.id,{color})}/>)}</div>
      <span className="mindmap-separator"/><button type="button" disabled={!nodes.length} onClick={organize}>Organiser</button><button type="button" disabled={!history.undo} onClick={()=>undo.current?.undo()} title="Annuler (Ctrl+Z)">↶ Annuler</button><button type="button" disabled={!history.redo} onClick={()=>undo.current?.redo()} title="Rétablir (Ctrl+Maj+Z)">↷ Rétablir</button><button type="button" className="mindmap-delete" disabled={!active} onClick={remove}>Supprimer la branche</button>
    </div>
    {help&&<p className="mindmap-help">Double-clique un bloc pour écrire. Glisse un bloc pour le déplacer, ou le fond pour déplacer la carte. Molette pour zoomer. Tab ajoute une branche, Entrée une idée sœur. « Relier » connecte le bloc sélectionné à celui que tu cliques ensuite. Clique une liaison pointillée pour la retirer.</p>}
    {linking&&<p className="mindmap-link-help" role="status">Clique le bloc à relier à « {active?.text} ». Échap pour annuler.</p>}
    <div ref={canvas} className={'mindmap-canvas'+(linking?' linking':'')} tabIndex={0} aria-label="Surface du tableau blanc" onPointerDown={event=>{if(event.button!==0||event.target.closest('.mindmap-node,.mindmap-connection,button,textarea,input,select'))return;if(editing)finishEdit();setSelected(null);setLinking(false);event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);gesture.current={type:'pan',pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:view.x,y:view.y}}} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>{gesture.current=null;setPreview(null)}} onWheel={event=>{const rect=canvas.current.getBoundingClientRect();zoom(Math.exp(-event.deltaY*.0015),{x:event.clientX-rect.left,y:event.clientY-rect.top})}}>
      <svg className="mindmap-edges" width="100%" height="100%" aria-label="Branches de la carte"><g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{connections.map(link=>{const from=rendered.find(node=>node.id===link.from),to=rendered.find(node=>node.id===link.to);if(!from||!to)return null;const forward=to.x>=from.x,x1=from.x+(forward?NODE_WIDTH:0),x2=to.x+(forward?0:NODE_WIDTH),y1=from.y+nodeHeight(from.text)/2,y2=to.y+nodeHeight(to.text)/2,bend=Math.max(70,Math.abs(x2-x1)*.5)*(forward?1:-1);const d=`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;return <g key={link.id}><path d={d} stroke={link.color} strokeWidth="2.5" strokeDasharray={link.extra?'7 5':undefined} fill="none"/>{link.extra&&<path className="mindmap-connection" d={d} fill="none" stroke="transparent" strokeWidth="16" tabIndex={0} role="button" aria-label="Supprimer cette liaison" onClick={()=>doc.transact(()=>links.delete(link.id),LOCAL_MAP_CHANGE)} onKeyDown={event=>{if(['Enter','Delete','Backspace'].includes(event.key)){event.preventDefault();event.stopPropagation();doc.transact(()=>links.delete(link.id),LOCAL_MAP_CHANGE)}}}/>}</g>})}</g></svg>
      <div className="mindmap-world" style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.k})`}}>{rendered.map(node=><div key={node.id} role="button" tabIndex={0} aria-label={'Sujet : '+node.text} aria-pressed={selected===node.id} className={'mindmap-node'+(selected===node.id?' selected':'')+(node.shape==='pill'?' pill':'')} style={{left:node.x,top:node.y,width:NODE_WIDTH,height:nodeHeight(editing===node.id?draft:node.text),'--node-color':node.color}} onPointerDown={event=>nodeDown(event,node)} onDoubleClick={()=>beginEdit(node)} onFocus={()=>{if(!editing)setSelected(node.id)}}>{editing===node.id?<textarea ref={editField} aria-label="Texte du sujet" maxLength={1000} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={finishEdit} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){editingId.current=null;setEditing(null)}else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();finishEdit();canvas.current?.focus()}}}/>:<span>{node.text}</span>}</div>)}</div>
      {!nodes.length&&<div className="mindmap-empty"><span aria-hidden="true">✣</span><h2>Une idée, puis des branches</h2><p>Commence par un sujet central et développe ta carte mentale.</p><button type="button" onClick={event=>{event.stopPropagation();add()}}>Créer le sujet central</button></div>}
    </div>
    <footer className="mindmap-footer"><span>{nodes.length} bloc{nodes.length>1?'s':''} · {connections.length} liaison{connections.length>1?'s':''}</span><div><button type="button" aria-label="Zoom arrière" onClick={()=>zoom(1/1.2)}>−</button><span>{Math.round(view.k*100)} %</span><button type="button" aria-label="Zoom avant" onClick={()=>zoom(1.2)}>＋</button><button type="button" onClick={fit}>Tout voir</button></div></footer>
  </section>
}
