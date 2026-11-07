'use client'
import { useEffect, useRef } from 'react'
import './mindmap-inspector.css'
import MindmapConnectionInspector from './MindmapConnectionInspector'
import MindmapDimension from './MindmapDimension'
import { MAP_COLORS, nodeSize, branchIds } from '../lib/mindmap'

function ToolIcon({name}) {
 const paths={style:<><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3"/></>,text:<path d="M4 5h16M12 5v15M8 20h8M4 5v3M20 5v3"/>,links:<><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h5v12h5"/></>,top:<><path d="M4 4h16M7 9h10M7 13h10M7 17h7"/></>,center:<><path d="M7 7h10M7 11h10M7 15h7M4 3v18M20 3v18"/></>,bottom:<><path d="M4 20h16M7 7h7M7 11h10M7 15h10"/></>,left:<path d="M4 5h16M4 10h10M4 15h16M4 20h10"/>,right:<path d="M4 5h16M10 10h10M4 15h16M10 20h10"/>,middle:<path d="M4 5h16M7 10h10M4 15h16M7 20h10"/>,justify:<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>}
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.style}</svg>
}
const SHAPES=[['card','Rectangle'],['pill','Arrondie'],['ellipse','Ellipse'],['note','Note']]
export default function MindmapInspector({connection,connections=[],onSelectConnection,onConnectionPatch,onConnectionRemove,onConnectionReset,node,nodes,tab,onTab,onClose,onPatch,onSize,onFitText,mapStyle,onMapPatch,onTextAlign,textAlign,onEditText,editing,onAddBranch,onLink}) {
 const body=useRef(null)
 useEffect(()=>{if(body.current)body.current.scrollTop=0},[tab,node?.id,connection?.id])
 const descendants=node?branchIds(nodes,node.id):new Set()
 const section=(title,content)=><section className="mm-inspector-section"><h3>{title}</h3>{content}</section>
 const colorField=(label,key,value)=><label className="mm-color-field"><span>{label}</span><span className="mm-color-value"><input type="color" aria-label={label==='Contour'?'Couleur personnalisée du bloc':'Fond du bloc'} value={value} disabled={!node} onChange={e=>onPatch({[key]:e.target.value})}/><span>{value.toUpperCase()}</span></span></label>
 return <aside className="mm-inspector" aria-label="Personnaliser le bloc">
   <header className="mm-inspector-header"><div><strong>Personnaliser</strong><span>{connection?'Liaison sélectionnée':node?.text?.split('\n')[0]||'Aucun bloc sélectionné'}</span></div><button type="button" aria-label="Fermer le panneau de style" onClick={onClose}>×</button></header>
   <div className="mm-inspector-tabs" role="group" aria-label="Catégorie de personnalisation">{[['style','style','Style'],['text','text','Texte'],['links','links','Liaisons']].map(([key,icon,label])=><button type="button" key={key} aria-pressed={tab===key} onClick={()=>onTab(key)}><ToolIcon name={icon}/>{label}</button>)}</div>
   <div ref={body} className="mm-inspector-body">
   {!node&&tab!=='links'?<div className="mm-inspector-empty"><ToolIcon name={tab==='text'?'text':'style'}/><p>Aucun bloc sélectionné</p></div>:<>
    {tab==='style'&&<>
      {section('Forme',<div className="mm-shape-grid">{SHAPES.map(([shape,label])=><button type="button" key={shape} aria-pressed={(node?.shape||'card')===shape} onClick={()=>onPatch({shape})}><span className={'mm-shape-preview '+shape}/><span>{label}</span></button>)}</div>)}
      {section('Dimensions',<><div className="mm-dimension-grid"><MindmapDimension key={node.id+'-width'} label="Largeur" value={nodeSize(node).width} min={140} onCommit={value=>onSize('width',value)}/><MindmapDimension key={node.id+'-height'} label="Hauteur" value={nodeSize(node).height} min={70} onCommit={value=>onSize('height',value)}/></div><button type="button" className="mm-wide-button" onClick={onFitText}>Ajuster au texte</button></>)}
      {section('Couleurs',<><div className="mm-swatches" role="group" aria-label="Couleur du bloc">{MAP_COLORS.map(([color,label])=><button type="button" key={color} aria-label={label} aria-pressed={node.color===color} style={{'--swatch':color}} onClick={()=>onPatch({color})}/>)}</div>{colorField('Contour','color',node.color)}{colorField('Fond','background',node.background||'#ffffff')}<button type="button" className="mm-text-button" onClick={()=>onPatch({background:null})}>Fond assorti au contour</button></>)}
      {section('Bordure',<><div className="mm-segmented">{[['solid','Continue'],['dashed','Pointillée'],['none','Aucune']].map(([value,label])=><button type="button" key={value} aria-pressed={(node.borderStyle||'solid')===value} onClick={()=>onPatch({borderStyle:value})}>{label}</button>)}</div><label className="mm-slider-label">Épaisseur <span>{node.borderWidth||2} px</span><input type="range" aria-label="Épaisseur de bordure" min="1" max="6" value={node.borderWidth||2} onChange={e=>onPatch({borderWidth:Number(e.target.value)})}/></label></>)}
    </>}
    {tab==='text'&&<>
      {section('Position verticale',<div className="mm-segmented mm-position">{[['top','top','En haut','Texte en haut'],['center','center','Au milieu','Texte au milieu'],['bottom','bottom','En bas','Texte en bas']].map(([value,icon,label,aria])=><button type="button" key={value} aria-label={aria} aria-pressed={(node.verticalAlign||'center')===value} onClick={()=>onPatch({verticalAlign:value})}><ToolIcon name={icon}/><span>{label}</span></button>)}</div>)}
      {section('Alignement horizontal',<div className="mm-segmented mm-align">{[['left','left','Aligner à gauche'],['center','middle','Centrer le texte'],['right','right','Aligner à droite'],['justify','justify','Justifier le texte']].map(([value,icon,label])=><button type="button" key={value} aria-label={label} title={label} aria-pressed={textAlign===value} onClick={()=>onTextAlign(value)}><ToolIcon name={icon}/></button>)}</div>)}
      {section('Marge intérieure',<label className="mm-slider-label"><span>Espace autour du texte</span><span>{node.padding??16} px</span><input type="range" aria-label="Marge intérieure du bloc" min="0" max="64" step="2" value={node.padding??16} onChange={e=>onPatch({padding:Number(e.target.value)})}/></label>)}
      <div className="mm-edit-card"><ToolIcon name="text"/><strong>Mise en forme du texte</strong><button type="button" className="mm-primary-button" onClick={onEditText}>{editing?'Revenir au texte':'Modifier le texte'}</button></div>
    </>}
   </>}
   {tab==='links'&&<>
     {section('Liaison',<label className="mm-parent-label"><select aria-label="Liaison à modifier" value={connection?.id||''} onChange={e=>{if(e.target.value)onSelectConnection(e.target.value)}}><option value="" disabled>Choisir une liaison</option>{connections.filter(link=>!node||link.from===node.id||link.to===node.id).map(link=><option key={link.id} value={link.id}>{nodes.find(item=>item.id===link.from)?.text.slice(0,24)||'Idée'} → {nodes.find(item=>item.id===link.to)?.text.slice(0,24)||'Idée'}</option>)}</select></label>)}
     {connection&&<MindmapConnectionInspector connection={connection} nodes={nodes} mapStyle={mapStyle} onPatch={onConnectionPatch} onRemove={onConnectionRemove} onReset={onConnectionReset}/>}
     <details className="mm-map-defaults" open={connection?undefined:true}><summary>Réglages du tableau</summary>
     {section('Tracé des liaisons',<div className="mm-segmented">{[['curve','Courbes'],['straight','Droites'],['step','Angles']].map(([lineStyle,label])=><button type="button" key={lineStyle} aria-pressed={(mapStyle.lineStyle||'curve')===lineStyle} onClick={()=>onMapPatch({lineStyle})}>{label}</button>)}</div>)}
     {section('Direction',<button type="button" className="mm-toggle-row" aria-pressed={Boolean(mapStyle.arrows)} onClick={()=>onMapPatch({arrows:!mapStyle.arrows})}><span>Afficher les flèches</span><i aria-hidden="true"/></button>)}
     </details>
     {node&&<>{section('Branche parente',<label className="mm-parent-label"><span>Rattacher ce bloc à</span><select aria-label="Parent de la branche" value={node.parentId||''} onChange={e=>onPatch({parentId:e.target.value||null})}><option value="">Sujet indépendant</option>{nodes.filter(item=>!descendants.has(item.id)).map(item=><option key={item.id} value={item.id}>{item.text.slice(0,60)||'Idée'}</option>)}</select></label>)}<button type="button" className="mm-wide-button" onClick={onAddBranch}>＋ Ajouter une branche</button><button type="button" className="mm-primary-button" onClick={onLink}>Relier à un autre bloc</button></>}
   </>}
   </div>
 </aside>
}
