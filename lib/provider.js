import {supabase} from './supabase'
import {connectDocument} from './realtime-document.js'
export {b64,un} from './realtime-document.js'
export function connect(id,ydoc,user){return connectDocument(supabase,id,ydoc,user)}
export const colorOf=e=>`hsl(${[...e].reduce((a,x)=>a+x.charCodeAt(0),0)*37%360},70%,45%)`
