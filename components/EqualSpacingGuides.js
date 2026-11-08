'use client'
export default function EqualSpacingGuides({guides,view}) {
 if(!guides.length)return null
 return <svg className="whiteboard-spacing-guides" width="100%" height="100%" aria-hidden="true"><g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{guides.map((guide,index)=><g key={index} className="equal-spacing-group" data-gap={Math.round(guide.gap*10)/10}>{guide.spans.map((span,i)=>{
  const x=(span.x1+span.x2)/2,y=(span.y1+span.y2)/2,k=view.k,text=Math.round(guide.gap)+' px',width=(text.length*6+12)/k
  return <g key={i}><line {...span} strokeWidth={1/k}/>{guide.axis==='x'?<><line x1={span.x1} x2={span.x1} y1={span.y1-4/k} y2={span.y1+4/k} strokeWidth={1/k}/><line x1={span.x2} x2={span.x2} y1={span.y1-4/k} y2={span.y1+4/k} strokeWidth={1/k}/></>:<><line y1={span.y1} y2={span.y1} x1={span.x1-4/k} x2={span.x1+4/k} strokeWidth={1/k}/><line y1={span.y2} y2={span.y2} x1={span.x1-4/k} x2={span.x1+4/k} strokeWidth={1/k}/></>}<rect className="spacing-label-bg" x={x-width/2} y={y-9/k} width={width} height={18/k} rx={5/k}/><text className="spacing-label" x={x} y={y} fontSize={11/k} textAnchor="middle" dominantBaseline="central">{text}</text></g>
 })}</g>)}</g></svg>
}
