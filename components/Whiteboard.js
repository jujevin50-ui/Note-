'use client'
import { useEffect, useRef, useState, useId } from 'react'
import * as Y from 'yjs'
import { ySyncPluginKey } from 'y-prosemirror'
import MindmapRichNode from './MindmapRichNode'
import MindmapInspector from './MindmapInspector'
import RichTextToolbar from './RichTextToolbar'
import TableTools from './TableTools'
import { supabase } from '../lib/supabase'
import { openWhiteboardSession } from '../lib/whiteboard-session'
import { LOCAL_MAP_CHANGE, MAP_COLORS, NODE_WIDTH, nodeHeight, nodeSize, resizeMapNode, ensureRichText, duplicateMapNode, mapNodes, insertMapNode, updateMapNode, removeMapBranch, mapConnections, layoutMap, fitMap } from '../lib/mindmap'
import { connectionStyle, connectionGeometry, nearestConnectionAnchor, updateConnection, clearConnectionStyle } from '../lib/mindmap-connections'
import './whiteboard.css'

export default function Whiteboard({id,projectId,user,title}) {
  const [doc,setDoc]=useState(null),[status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0)
  const session=useRef(null)
  useEffect(()=>{setDoc(null);setStatus('loading');const current=openWhiteboardSession(supabase,{id,projectId,user},setDoc,setStatus);session.current=current;return()=>{session.current=null;current.dispose()}},[id,projectId,attempt])
  if(!doc)return <div className="whiteboard-loading" role="status"><p>{status==='load-error'?'Impossible de charger ce tableau blanc.':'Chargement du tableau blanc…'}</p>{status==='load-error'&&<button type="button" onClick={()=>setAttempt(value=>value+1)}>Réessayer</button>}</div>
  return <MindMapCanvas key={id+':'+attempt} doc={doc} projectId={projectId} title={title} status={status} retry={()=>session.current?.retry()}/>
}

export function MindMapCanvas({doc,projectId,title='Tableau blanc',status='saved',retry}) {
  const store=doc.getMap('mindmap-nodes'),links=doc.getMap('mindmap-links'),settings=doc.getMap('mindmap-options'),linkStyles=doc.getMap('mindmap-link-styles')
  const readConnections=items=>mapConnections(items,links).map(link=>({...link,...connectionStyle(linkStyles,link.id)}))
  const [nodes,setNodes]=useState(()=>mapNodes(store)),[connections,setConnections]=useState(()=>readConnections(mapNodes(store)))
  const [selected,setSelected]=useState(null),[editing,setEditing]=useState(null),[activeEditor,setActiveEditor]=useState(null)
  const [view,setView]=useState({x:120,y:150,k:1}),[preview,setPreview]=useState(null),[linking,setLinking]=useState(false)
  const [selectedLink,setSelectedLink]=useState(null),[linkPreview,setLinkPreview]=useState(null),[navigation,setNavigation]=useState(false)
  const [inspectorTab,setInspectorTab]=useState('style')
  const [properties,setProperties]=useState(false),[mapStyle,setMapStyle]=useState(()=>settings.toJSON())
  const [history,setHistory]=useState({undo:false,redo:false}),[help,setHelp]=useState(false)
  const canvas=useRef(null),gesture=useRef(null),undo=useRef(null),initialFit=useRef(false),editors=useRef(new Map())
  const markerPrefix=useId().replace(/:/g,'')
  const active=nodes.find(node=>node.id===selected),activeLink=connections.find(link=>link.id===selectedLink)
  useEffect(()=>{
    const manager=new Y.UndoManager([store,links,settings,linkStyles],{trackedOrigins:new Set([LOCAL_MAP_CHANGE,ySyncPluginKey]),captureTimeout:400})
    undo.current=manager
    const refresh=()=>{const next=mapNodes(store);setNodes(next);setConnections(readConnections(next));setMapStyle(settings.toJSON());setHistory({undo:manager.undoStack.length>0,redo:manager.redoStack.length>0})}
    store.observeDeep(refresh);links.observeDeep(refresh);settings.observe(refresh);linkStyles.observeDeep(refresh)
    manager.on('stack-item-added',refresh);manager.on('stack-item-popped',refresh);manager.on('stack-cleared',refresh)
    refresh()
    return()=>{store.unobserveDeep(refresh);links.unobserveDeep(refresh);settings.unobserve(refresh);linkStyles.unobserveDeep(refresh);manager.destroy();undo.current=null}
  },[doc,store,links,settings,linkStyles])
  useEffect(()=>{if(!initialFit.current&&nodes.length&&canvas.current){const rect=canvas.current.getBoundingClientRect();setView(fitMap(nodes,rect.width,rect.height));initialFit.current=true}},[nodes])
  useEffect(()=>{const surface=canvas.current;if(!surface)return;const prevent=event=>{if(!event.target.closest('.mindmap-rich-content'))event.preventDefault()};surface.addEventListener('wheel',prevent,{passive:false});return()=>surface.removeEventListener('wheel',prevent)},[])
  useEffect(()=>{
    const surface=canvas.current;if(!surface)return
    let previous=surface.getBoundingClientRect()
    const observer=new ResizeObserver(()=>{const next=surface.getBoundingClientRect();if(previous.width&&previous.height&&(next.width!==previous.width||next.height!==previous.height))setView(current=>({...current,x:current.x+(next.width-previous.width)/2,y:current.y+(next.height-previous.height)/2}));previous=next})
    observer.observe(surface);return()=>observer.disconnect()
  },[])
  useEffect(()=>{if(selected&&!nodes.some(node=>node.id===selected)){setSelected(null);setEditing(null);setActiveEditor(null);setLinking(false)}},[nodes,selected])
  useEffect(()=>{if(selectedLink&&!connections.some(link=>link.id===selectedLink)){setSelectedLink(null);setLinkPreview(null)}},[connections,selectedLink])
  const finishEdit=()=>{setEditing(null);setActiveEditor(null);canvas.current?.focus({preventScroll:true})}
  const beginEdit=node=>{
    undo.current?.stopCapturing();ensureRichText(doc,store,node.id)
    if(!node.rich&&!node.height)updateMapNode(doc,store,node.id,{width:node.width||300,height:Math.max(150,nodeHeight(node.text,300))})
    undo.current?.stopCapturing();setSelectedLink(null);setSelected(node.id);setEditing(node.id);setLinking(false);setActiveEditor(null);setInspectorTab('text');setProperties(true)
  }
  const duplicate=()=>{if(!active)return;undo.current?.stopCapturing();const id=duplicateMapNode(doc,store,active.id);undo.current?.stopCapturing();if(id){setSelected(id);setEditing(null);setActiveEditor(null)}}
  const resize=(event,node,handle)=>{
    event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current={type:'resize',id:node.id,node,handle,pointer:event.pointerId,startX:event.clientX,startY:event.clientY}
  }
  const patchSize=(key,value)=>{if(!active)return;const parsed=Number(value);if(!Number.isFinite(parsed))return;updateMapNode(doc,store,active.id,{[key]:Math.max(key==='width'?140:70,Math.min(2000,parsed))})}
  const fitText=()=>{
    if(!active)return
    const editor=editors.current.get(active.id),contentHeight=editor?.view.dom.scrollHeight
    const border=active.borderStyle==='none'?0:Math.max(1,Math.min(6,active.borderWidth||2))
    const padding=Number.isFinite(active.padding)?Math.max(0,Math.min(64,active.padding)):16
    const height=contentHeight?(active.shape==='ellipse'&&!Number.isFinite(active.padding)?(contentHeight+border*2)/.64:contentHeight+2*(padding+border)):nodeHeight(active.text,nodeSize(active).width)
    updateMapNode(doc,store,active.id,{height:Math.min(2000,Math.max(80,Math.ceil(height)))})
  }
  const patchNode=patch=>{if(!active)return;const discrete=['verticalAlign','shape','borderStyle','parentId'].some(key=>key in patch);if(discrete)undo.current?.stopCapturing();updateMapNode(doc,store,active.id,patch);if(discrete)undo.current?.stopCapturing()}
  const alignText=align=>{
    if(!active)return
    undo.current?.stopCapturing()
    doc.transact(()=>{
      updateMapNode(doc,store,active.id,{textAlign:align})
      const editor=editors.current.get(active.id)
      if(editor&&!editor.isDestroyed){const tr=editor.state.tr;editor.state.doc.descendants((node,pos)=>{if(['paragraph','heading'].includes(node.type.name))tr.setNodeMarkup(pos,undefined,{...node.attrs,textAlign:align})});editor.view.dispatch(tr)}
    },LOCAL_MAP_CHANGE)
    undo.current?.stopCapturing()
  }
  const selectLink=link=>{
    if(navigation||!link)return
    finishEdit();setSelected(null);setSelectedLink(link.id);setLinking(false);setProperties(true);setInspectorTab('links')
  }
  const patchLink=patch=>{if(!activeLink||navigation)return;undo.current?.stopCapturing();updateConnection(doc,linkStyles,activeLink.id,patch);undo.current?.stopCapturing()}
  const removeLink=(target=activeLink)=>{
    if(!target||navigation)return
    undo.current?.stopCapturing()
    doc.transact(()=>{if(target.extra)links.delete(target.id);else updateMapNode(doc,store,target.to,{parentId:null});clearConnectionStyle(doc,linkStyles,target.id)},LOCAL_MAP_CHANGE)
    undo.current?.stopCapturing();setSelectedLink(null)
  }
  const resetLink=()=>{if(!activeLink)return;undo.current?.stopCapturing();clearConnectionStyle(doc,linkStyles,activeLink.id);undo.current?.stopCapturing()}
  const startAnchor=(event,link,endpoint)=>{
    if(navigation)return
    event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId)
    undo.current?.stopCapturing();gesture.current={type:'anchor',pointer:event.pointerId,id:link.id,endpoint,nodeId:endpoint==='from'?link.from:link.to}
  }
  const anchorPatch=(event,current)=>{
    const node=nodes.find(item=>item.id===current.nodeId);if(!node)return null
    const rect=canvas.current.getBoundingClientRect(),point={x:(event.clientX-rect.left-view.x)/view.k,y:(event.clientY-rect.top-view.y)/view.k}
    const anchor=nearestConnectionAnchor(node,point)
    return {[current.endpoint+'Side']:anchor.side,[current.endpoint+'Offset']:anchor.offset}
  }
  const toggleNavigation=()=>{finishEdit();setNavigation(value=>!value);setSelected(null);setSelectedLink(null);setLinking(false);setProperties(false);setPreview(null);setLinkPreview(null);gesture.current=null}
  const configure=patch=>doc.transact(()=>Object.entries(patch).forEach(([key,value])=>settings.set(key,value)),LOCAL_MAP_CHANGE)
  const add=(kind='root',point)=>{
    if(editing)finishEdit()
    const parent=kind==='child'?active:kind==='sibling'?nodes.find(node=>node.id===active?.parentId):null
    const rect=canvas.current.getBoundingClientRect()
    const siblings=parent?nodes.filter(node=>node.parentId===parent.id):[]
    const offset=siblings.length?Math.ceil(siblings.length/2)*125*(siblings.length%2?1:-1):0
    const node={id:crypto.randomUUID(),text:parent?'Nouvelle idée':nodes.length?'Nouveau sujet':'Sujet central',parentId:parent?.id||null,x:parent?parent.x+nodeSize(parent).width+100:((point?.x??rect.width/2)-view.x)/view.k-NODE_WIDTH/2,y:parent?parent.y+offset:((point?.y??rect.height/2)-view.y)/view.k-40,color:parent?MAP_COLORS[siblings.length%MAP_COLORS.length][0]:MAP_COLORS[0][0],shape:'card'}
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
    setSelectedLink(null);setSelected(node.id);return false
  }
  const nodeDown=(event,node)=>{
    if(navigation)return
    if(event.button!==0||event.target.closest('textarea,[contenteditable=true],.mindmap-resize'))return
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
    if(current.type==='anchor'){const patch=anchorPatch(event,current);if(patch)setLinkPreview({id:current.id,...patch});return}
    if(current.type==='pan')setView({...view,x:current.x+dx,y:current.y+dy})
    else if(current.type==='resize')setPreview({id:current.id,...resizeMapNode(current.node,current.handle,dx/view.k,dy/view.k)})
    else setPreview({id:current.id,x:current.x+dx/view.k,y:current.y+dy/view.k})
  }
  const end=event=>{
    const current=gesture.current
    if(!current||current.pointer!==event.pointerId)return
    if(current.type==='anchor'){const patch=anchorPatch(event,current);if(patch&&connections.some(link=>link.id===current.id))updateConnection(doc,linkStyles,current.id,patch);undo.current?.stopCapturing();setLinkPreview(null)}
    if(current.type==='node'&&Math.hypot(event.clientX-current.startX,event.clientY-current.startY)>2){undo.current?.stopCapturing();updateMapNode(doc,store,current.id,{x:current.x+(event.clientX-current.startX)/view.k,y:current.y+(event.clientY-current.startY)/view.k});undo.current?.stopCapturing()}
    if(current.type==='resize'){undo.current?.stopCapturing();updateMapNode(doc,store,current.id,resizeMapNode(current.node,current.handle,(event.clientX-current.startX)/view.k,(event.clientY-current.startY)/view.k));undo.current?.stopCapturing()}
    gesture.current=null;setPreview(null)
  }
  const keyboard=event=>{
    if(event.target.closest('textarea,input,button,select,[contenteditable=true]'))return
    if(event.key==='Escape'){setLinking(false);setSelected(null);setSelectedLink(null);return}
    if(navigation)return
    if(['Delete','Backspace'].includes(event.key)&&activeLink){event.preventDefault();removeLink();return}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?undo.current?.redo():undo.current?.undo();return}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'&&active){event.preventDefault();duplicate();return}
    if(event.key==='Tab'&&active){event.preventDefault();add('child')}
    if(event.key==='Enter'&&active){event.preventDefault();add('sibling')}
    if(event.key==='F2'&&active){event.preventDefault();beginEdit(active)}
    if(['Delete','Backspace'].includes(event.key)&&active){event.preventDefault();remove()}
  }
  const rendered=nodes.map(node=>preview?.id===node.id?{...node,...preview}:node)
  const drawnLinks=connections.map(link=>{const from=rendered.find(node=>node.id===link.from),to=rendered.find(node=>node.id===link.to);return from&&to?{...link,geometry:connectionGeometry(from,to,linkPreview?.id===link.id?{...link,...linkPreview}:link,mapStyle)}:null}).filter(Boolean)
  return <section className={'mindmap'+(navigation?' navigation-mode':'')} aria-label={'Tableau blanc : '+title} onKeyDown={keyboard}>
    <header className="mindmap-heading"><div><h1 title={title}>{title}</h1><span className={'mindmap-save-status '+status} role="status">{status==='saved'?'Enregistré':status==='error'?'Enregistrement à réessayer':'Enregistrement…'}</span></div>{status==='error'&&<button type="button" onClick={retry}>Réessayer</button>}<button type="button" className="mm-navigation-toggle" title={navigation?'Passer en mode édition':'Passer en mode navigation'} aria-pressed={navigation} onClick={toggleNavigation}>{navigation?'Mode navigation':'Mode édition'}</button><button type="button" onClick={()=>setHelp(value=>!value)} aria-expanded={help}>Aide</button></header>
    {!navigation&&<div className="mindmap-toolbar" role="toolbar" aria-label="Outils de carte mentale">
      <button type="button" className="mm-add-primary" onClick={()=>add()}>＋ Sujet</button><button type="button" disabled={!active} onClick={()=>add('child')}>＋ Branche <kbd>Tab</kbd></button><button type="button" disabled={!active} onClick={()=>add('sibling')}>＋ Idée sœur</button>
      <span className="mindmap-separator"/><button type="button" disabled={!active} aria-pressed={linking} onClick={()=>setLinking(value=>!value)}>Relier</button><button type="button" disabled={!active} onClick={()=>beginEdit(active)}>Modifier</button>
      <button type="button" disabled={!active} onClick={duplicate}>Dupliquer</button><button type="button" aria-expanded={properties} onClick={()=>setProperties(value=>!value)}>Style et dimensions</button>
      <span className="mindmap-separator"/><button type="button" disabled={!nodes.length} onClick={organize}>Organiser</button><button type="button" disabled={!history.undo} onClick={()=>undo.current?.undo()} title="Annuler (Ctrl+Z)">↶ Annuler</button><button type="button" disabled={!history.redo} onClick={()=>undo.current?.redo()} title="Rétablir (Ctrl+Maj+Z)">↷ Rétablir</button><button type="button" className="mindmap-delete" disabled={!active} onClick={remove}>Supprimer la branche</button>
    </div>}
    {editing&&activeEditor&&!activeEditor.isDestroyed&&<div className="mindmap-text-tools paper ed-wrap tb-center" aria-label="Mise en forme du texte de la bulle"><div className="mindmap-text-tools-heading"><strong>Texte du bloc</strong><span>Ctrl+Entrée pour terminer</span><button type="button" onClick={finishEdit}>Terminer</button></div><RichTextToolbar editor={activeEditor} projectId={projectId}/><TableTools editor={activeEditor}/></div>}
    {help&&<p className="mindmap-help">Double-clique un bloc pour écrire et accéder aux outils des pages. Les poignées redimensionnent le bloc ; glisse son bord pour le déplacer. Glisse un bloc pour le déplacer, ou le fond pour déplacer la carte. Molette pour zoomer. Tab ajoute une branche, Entrée une idée sœur. « Relier » connecte le bloc sélectionné à celui que tu cliques ensuite. Sélectionne une liaison pour régler ses extrémités et son style.</p>}
    {linking&&<p className="mindmap-link-help" role="status">Clique le bloc à relier à « {active?.text} ». Échap pour annuler.</p>}
    <div className={'mindmap-workspace'+(properties?' inspector-open':'')}>
    <div ref={canvas} className={'mindmap-canvas'+(linking?' linking':'')} tabIndex={0} aria-label="Surface du tableau blanc" onPointerDown={event=>{if(event.button!==0||event.target.closest(navigation?'button,input,select':'.mindmap-node,.mindmap-connection,.mindmap-anchor,button,textarea,input,select'))return;if(editing)finishEdit();setSelected(null);setSelectedLink(null);setLinking(false);event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);gesture.current={type:'pan',pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:view.x,y:view.y}}} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>{gesture.current=null;setPreview(null);setLinkPreview(null)}} onDoubleClick={event=>{if(navigation||event.target.closest('.mindmap-node,.mindmap-connection,.mindmap-anchor,button'))return;const rect=canvas.current.getBoundingClientRect();add('root',{x:event.clientX-rect.left,y:event.clientY-rect.top})}} onWheel={event=>{if(event.target.closest('.mindmap-rich-content'))return;const rect=canvas.current.getBoundingClientRect();zoom(Math.exp(-event.deltaY*.0015),{x:event.clientX-rect.left,y:event.clientY-rect.top})}}>
      <svg className="mindmap-edges" width="100%" height="100%" aria-label="Branches de la carte"><defs>{drawnLinks.map((link,index)=><marker key={link.id} id={markerPrefix+'-arrow-'+index} viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth={10+link.geometry.width} markerHeight={10+link.geometry.width} orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={link.geometry.color}/></marker>)}</defs><g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{drawnLinks.map((link,index)=>{
        const g=link.geometry,label='Liaison : '+(nodes.find(node=>node.id===link.from)?.text||'Idée')+' → '+(nodes.find(node=>node.id===link.to)?.text||'Idée')
        return <g key={link.id} data-link-id={link.id}>
          {selectedLink===link.id&&!navigation&&<path d={g.d} stroke="#ba9cea55" strokeWidth={g.width+9} fill="none"/>}
          <path className="mindmap-link-stroke" d={g.d} stroke={g.color} strokeWidth={g.width} strokeLinecap="round" strokeLinejoin="round" markerStart={g.arrowStart?`url(#${markerPrefix}-arrow-${index})`:undefined} markerEnd={g.arrowEnd?`url(#${markerPrefix}-arrow-${index})`:undefined} strokeDasharray={g.dash==='dashed'?'7 5':g.dash==='dotted'?'1 5':undefined} fill="none"/>
          {!navigation&&<path className="mindmap-connection" d={g.d} fill="none" stroke="transparent" strokeWidth={Math.max(18,20/view.k)} tabIndex={0} role="button" aria-label={label} aria-pressed={selectedLink===link.id} onPointerDown={event=>event.stopPropagation()} onClick={()=>selectLink(link)} onDoubleClick={event=>event.stopPropagation()} onKeyDown={event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();selectLink(link)}if(['Delete','Backspace'].includes(event.key)){event.preventDefault();event.stopPropagation();removeLink(link)}}}/>}
        </g>
      })}</g></svg>
      <div className="mindmap-world" style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.k})`}}>{rendered.map(node=><div key={node.id} role="group" tabIndex={0} aria-label={'Sujet : '+(node.text||'Idée')} data-valign={node.verticalAlign||'center'} className={'mindmap-node'+(selected===node.id?' selected':'')+' '+(node.shape||'card')+(editing===node.id?' editing':'' )} style={{left:node.x,top:node.y,...nodeSize(node),...(Number.isFinite(node.padding)?{padding:Math.max(0,Math.min(64,node.padding))}:node.shape==='ellipse'?{padding:`${nodeSize(node).height*.18}px ${nodeSize(node).width*.15}px`}:{}),'--node-color':node.color,'--node-text-align':node.textAlign||'center',borderWidth:Math.max(1,Math.min(6,node.borderWidth||2)),borderStyle:node.borderStyle||'solid',...(node.background?{background:node.background}:{})}} onPointerDown={event=>nodeDown(event,node)} onDoubleClick={()=>{if(!navigation&&editing!==node.id)beginEdit(node)}} onFocus={()=>{if(!navigation&&!editing){setSelectedLink(null);setSelected(node.id)}}}>
        {node.rich?<MindmapRichNode navigation={navigation} fragment={store.get(node.id)?.get('richText')} editing={editing===node.id} undoManager={undo} onActivate={setActiveEditor} onReady={editor=>{if(editor)editors.current.set(node.id,editor);else editors.current.delete(node.id)}} onFinish={finishEdit}/>:<span>{node.text||'Idée'}</span>}
        {!navigation&&selected===node.id&&['nw','n','ne','e','se','s','sw','w'].map(handle=><button type="button" key={handle} tabIndex={-1} className={'mindmap-resize handle-'+handle} aria-label={'Redimensionner '+handle} onPointerDown={event=>resize(event,node,handle)}/>)}
      </div>)}</div>
      {!navigation&&activeLink&&<svg className="mindmap-anchor-layer" width="100%" height="100%"><g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{drawnLinks.filter(link=>link.id===selectedLink).map(link=>['from','to'].map(endpoint=>{const point=link.geometry[endpoint==='from'?'start':'end'];return <circle key={endpoint} className="mindmap-anchor" cx={point.x} cy={point.y} r={7/view.k} strokeWidth={2/view.k} tabIndex={0} role="slider" aria-label={endpoint==='from'?"Point d’accroche de départ":"Point d’accroche d’arrivée"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((link[endpoint+'Offset']??.5)*100)} onPointerDown={event=>startAnchor(event,link,endpoint)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();patchLink({[endpoint+'Offset']:Math.max(0,Math.min(1,(link[endpoint+'Offset']??.5)+(['ArrowLeft','ArrowUp'].includes(event.key)?-.05:.05)))})}}}/> } ))}</g></svg>}
      {!navigation&&!nodes.length&&<div className="mindmap-empty"><span aria-hidden="true">✣</span><h2>Une idée, puis des branches</h2><p>Commence par un sujet central et développe ta carte mentale.</p><button type="button" onClick={event=>{event.stopPropagation();add()}}>Créer le sujet central</button></div>}
    </div>
    {properties&&!navigation&&<MindmapInspector connection={activeLink} connections={connections} onSelectConnection={id=>selectLink(connections.find(link=>link.id===id))} onConnectionPatch={patchLink} onConnectionRemove={()=>removeLink()} onConnectionReset={resetLink} node={active} nodes={nodes} tab={inspectorTab} onTab={setInspectorTab} onClose={()=>setProperties(false)} onPatch={patchNode} onSize={patchSize} onFitText={fitText} mapStyle={mapStyle} onMapPatch={configure} onTextAlign={alignText} textAlign={active?.textAlign||editors.current.get(active?.id)?.getAttributes('paragraph').textAlign||editors.current.get(active?.id)?.getAttributes('heading').textAlign||'center'} onEditText={()=>{if(active){if(editing===active.id)activeEditor?.commands.focus('end',{scrollIntoView:false});else beginEdit(active)}}} editing={editing===active?.id} onAddBranch={()=>add('child')} onLink={()=>setLinking(value=>!value)}/>}
    </div>
    <footer className="mindmap-footer"><span>{nodes.length} bloc{nodes.length>1?'s':''} · {connections.length} liaison{connections.length>1?'s':''}</span><div><button type="button" aria-label="Zoom arrière" onClick={()=>zoom(1/1.2)}>−</button><span>{Math.round(view.k*100)} %</span><button type="button" aria-label="Zoom avant" onClick={()=>zoom(1.2)}>＋</button><button type="button" onClick={fit}>Tout voir</button></div></footer>
  </section>
}
