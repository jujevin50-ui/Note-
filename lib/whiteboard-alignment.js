import { nodeSize } from './mindmap.js'
export function snapMapNode(node,point,nodes,scale=1,disabled=false) {
 if(disabled)return {...point,guides:[]}
 const size=nodeSize(node),threshold=6/Math.max(.15,scale),matches={x:null,y:null}
 for(const other of nodes){
  if(other.id===node.id)continue
  const target=nodeSize(other)
  for(const axis of ['x','y']){
   const length=axis==='x'?'width':'height'
   for(const fraction of [0,.5,1])for(const otherFraction of [0,.5,1]){
    const value=other[axis]+target[length]*otherFraction,delta=value-(point[axis]+size[length]*fraction)
    if(Math.abs(delta)<=threshold&&(!matches[axis]||Math.abs(delta)<Math.abs(matches[axis].delta)))matches[axis]={value,delta,other}
   }
  }
 }
 const x=point.x+(matches.x?.delta||0),y=point.y+(matches.y?.delta||0),guides=[]
 if(matches.x){const other=matches.x.other;guides.push({x1:matches.x.value,x2:matches.x.value,y1:Math.min(y,other.y)-16,y2:Math.max(y+size.height,other.y+nodeSize(other).height)+16})}
 if(matches.y){const other=matches.y.other;guides.push({y1:matches.y.value,y2:matches.y.value,x1:Math.min(x,other.x)-16,x2:Math.max(x+size.width,other.x+nodeSize(other).width)+16})}
 return {x,y,guides}
}
