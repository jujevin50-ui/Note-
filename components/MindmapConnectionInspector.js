'use client'
import { CONNECTION_SIDES, connectionGeometry } from '../lib/mindmap-connections'

export default function MindmapConnectionInspector({connection,nodes,mapStyle,onPatch,onRemove,onReset}) {
 const from=nodes.find(node=>node.id===connection.from),to=nodes.find(node=>node.id===connection.to)
 if(!from||!to)return null
 const style=connectionGeometry(from,to,connection,mapStyle)
 const section=(title,children)=><section className="mm-inspector-section"><h3>{title}</h3>{children}</section>
 const endpoint=(key,label,node)=><div className="mm-endpoint"><label className="mm-parent-label"><span>{label} · {node.text.slice(0,38)||'Idée'}</span><select aria-label={'Accroche '+label.toLowerCase()} value={connection[key+'Side']||'auto'} onChange={e=>onPatch({[key+'Side']:e.target.value})}>{CONNECTION_SIDES.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label><label className="mm-slider-label">Position <span>{Math.round((connection[key+'Offset']??.5)*100)} %</span><input type="range" aria-label={'Position '+label.toLowerCase()} min="0" max="100" value={Math.round((connection[key+'Offset']??.5)*100)} onChange={e=>onPatch({[key+'Offset']:Number(e.target.value)/100})}/></label></div>
 return <div className="mm-connection-inspector">
  {section('Points d’accroche',<>{endpoint('from','Départ',from)}{endpoint('to','Arrivée',to)}</>)}
  {section('Tracé',<><div className="mm-segmented">{[['curve','Courbe'],['straight','Droite'],['step','Angles droits']].map(([value,label])=><button key={value} type="button" aria-pressed={style.lineStyle===value} onClick={()=>onPatch({lineStyle:value})}>{label}</button>)}</div>{style.lineStyle==='curve'&&<label className="mm-slider-label">Courbure <span>{connection.bend??'Auto'}</span><input type="range" aria-label="Courbure de la liaison" min="20" max="240" value={connection.bend??80} onChange={e=>onPatch({bend:Number(e.target.value)})}/></label>}</>)}
  {section('Flèches',<div className="mm-segmented mm-arrow-options">{[['none','—','Sans flèche',false,false],['end','→','Flèche à l’arrivée',false,true],['start','←','Flèche au départ',true,false],['both','↔','Flèches aux deux extrémités',true,true]].map(([key,icon,label,start,end])=><button type="button" key={key} title={label} aria-label={label} aria-pressed={style.arrowStart===start&&style.arrowEnd===end} onClick={()=>onPatch({arrowStart:start,arrowEnd:end})}>{icon}</button>)}</div>)}
  {section('Apparence',<><label className="mm-color-field"><span>Couleur</span><span className="mm-color-value"><input type="color" aria-label="Couleur de la liaison" value={style.color} onChange={e=>onPatch({stroke:e.target.value})}/><span>{style.color.toUpperCase()}</span></span></label><label className="mm-slider-label">Épaisseur <span>{style.width} px</span><input type="range" aria-label="Épaisseur de la liaison" min="1" max="8" step=".5" value={style.width} onChange={e=>onPatch({width:Number(e.target.value)})}/></label><div className="mm-segmented mm-line-pattern">{[['solid','Continue'],['dashed','Tirets'],['dotted','Pointillés']].map(([value,label])=><button type="button" key={value} aria-pressed={style.dash===value} onClick={()=>onPatch({dash:value})}>{label}</button>)}</div></>)}
  <button type="button" className="mm-wide-button" onClick={onReset}>Réinitialiser la liaison</button>
  <button type="button" className="mm-wide-button mm-danger-button" onClick={onRemove}>Supprimer la liaison</button>
 </div>
}
