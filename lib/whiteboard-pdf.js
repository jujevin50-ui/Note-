import {nodeSize} from './mindmap.js'
export function whiteboardPrintLayout(nodes,links) {
 const boxes=[...nodes.map(node=>({...node,...nodeSize(node)})),...links.map(link=>link.geometry.bounds)].filter(b=>[b.x,b.y,b.width,b.height].every(Number.isFinite))
 if(!boxes.length)return null
 const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),width=Math.max(...boxes.map(b=>b.x+b.width))-x+40,height=Math.max(...boxes.map(b=>b.y+b.height))-y+40
 const landscape=width>=height,paperWidth=Math.floor(((landscape?420:297)-24)*96/25.4)-2,paperHeight=Math.floor(((landscape?297:420)-24)*96/25.4)-2
 return {x,y,width,height,landscape,paperWidth,paperHeight,scale:Math.min(1,paperWidth/width,(paperHeight-56)/height)}
}
const hidden='.mindmap-resize,.image-handle,.ProseMirror-gapcursor,.mindmap-connection,.collaboration-cursor__caret,.collaboration-cursor__selection,button,textarea'
function visualClone(source) {
 const clone=source instanceof HTMLCanvasElement?document.createElement('img'):source.cloneNode(false),style=getComputedStyle(source)
 if(source instanceof HTMLCanvasElement)clone.src=source.toDataURL()
 if(source instanceof HTMLImageElement)clone.src=source.currentSrc||source.src
 if(source instanceof HTMLAnchorElement)clone.href=source.href
 for(const property of style)clone.style.setProperty(property,style.getPropertyValue(property))
 clone.style.animation='none';clone.style.transition='none'
 clone.removeAttribute('contenteditable');clone.removeAttribute('tabindex');clone.removeAttribute('inert')
 for(const attribute of [...clone.attributes])if(attribute.name.startsWith('on'))clone.removeAttribute(attribute.name)
 if(source instanceof HTMLInputElement)clone.checked=source.checked
 for(const child of source.childNodes){if(child.nodeType===Node.ELEMENT_NODE){if(!child.matches(hidden))clone.appendChild(visualClone(child))}else clone.appendChild(child.cloneNode(true))}
 return clone
}
export async function printWhiteboard(canvas,nodes,links,title) {
 const layout=whiteboardPrintLayout(nodes,links)
 if(!layout)throw new Error('Tableau vide')
 // Open synchronously from the click so the browser can allow the export window.
 const popup=window.open('','_blank')
 if(!popup)throw new Error('Autorise l’ouverture de la fenêtre pour exporter le PDF.')
 try{
  popup.opener=null
  const doc=popup.document
  doc.open();doc.write('<!doctype html><html lang="fr"><head></head><body></body></html>');doc.close()
  doc.title=title||'Tableau blanc'
  const css=doc.createElement('style')
  let fonts=''
  for(const sheet of document.styleSheets)try{for(const rule of sheet.cssRules)if(rule.type===CSSRule.FONT_FACE_RULE)fonts+=rule.cssText.replace(/url\((['"]?)(.*?)\1\)/g,(_match,_quote,url)=>'url("'+new URL(url,sheet.href||document.baseURI).href+'")')}catch{}
  css.textContent=fonts+`@page{size:A3 ${layout.landscape?'landscape':'portrait'};margin:12mm}*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}html,body{margin:0;padding:0;background:white;color:#222;overflow:visible}body{width:${layout.paperWidth}px;font-family:system-ui,sans-serif}h1{height:44px;margin:0 0 12px;font:600 21px/1.4 system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pdf-sheet{width:${layout.paperWidth}px;height:${layout.paperHeight}px;overflow:hidden;break-inside:avoid}.pdf-frame{width:${layout.width*layout.scale}px;height:${layout.height*layout.scale}px;position:relative}.pdf-world{position:relative;width:${layout.width}px;height:${layout.height}px;transform:scale(${layout.scale});transform-origin:0 0}`
  doc.head.appendChild(css)
  const sheet=doc.createElement('section');sheet.className='pdf-sheet'
  const heading=doc.createElement('h1');heading.textContent=title;sheet.appendChild(heading)
  const frame=doc.createElement('div');frame.className='pdf-frame'
  const world=doc.createElement('div');world.className='pdf-world'
  const edges=canvas.querySelector('.mindmap-edges').cloneNode(true)
  edges.setAttribute('width',layout.width);edges.setAttribute('height',layout.height)
  edges.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none'
  edges.querySelector(':scope > g').setAttribute('transform',`translate(${20-layout.x} ${20-layout.y})`)
  edges.querySelectorAll('[data-link-id]>path:not(.mindmap-link-stroke):not(.mindmap-arrowheads)').forEach(path=>path.remove())
  world.appendChild(edges)
  const sources=canvas.querySelectorAll('.mindmap-world>.mindmap-node')
  nodes.forEach((node,index)=>{
   const clone=visualClone(sources[index]);clone.style.left=(node.x-layout.x+20)+'px';clone.style.top=(node.y-layout.y+20)+'px'
   clone.style.boxShadow='none';clone.style.outline='none';clone.style.pointerEvents='none';clone.style.cursor='default'
   world.appendChild(clone)
  })
  frame.appendChild(world);sheet.appendChild(frame);doc.body.appendChild(sheet)
  // Lazy images must load even if their original block was outside the viewport.
  let deadline
  try{await Promise.race([
    Promise.all([doc.fonts.ready,...[...doc.images].map(img=>{img.loading='eager';return img.decode?.().catch(()=>{})})]),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Le chargement des images prend trop de temps. Réessaie l’export.')),10000)})
  ])}finally{clearTimeout(deadline)}
  if(popup.closed)return
  await new Promise(resolve=>popup.requestAnimationFrame(()=>popup.requestAnimationFrame(resolve)))
  popup.focus();popup.print()
 }catch(error){popup.close();throw error}
}
