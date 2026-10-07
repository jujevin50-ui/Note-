import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
const bad=h=>/^(localhost|0\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[)/.test(h)||h.endsWith('.local')||h.endsWith('.internal')
const dec=s=>(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
export async function GET(req){
 const token=(req.headers.get('authorization')||'').replace('Bearer ','')
 const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
 const {data}=await sb.auth.getUser(token)
 if(!data?.user)return Response.json({error:'auth'},{status:401})
 let u;try{u=new URL(new URL(req.url).searchParams.get('url'))}catch{return Response.json({error:'url'},{status:400})}
 if(!/^https?:$/.test(u.protocol)||bad(u.hostname))return Response.json({error:'url'},{status:400})
 try{
  const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 (compatible; NotesBot/1.0)','accept-language':'fr,en'},signal:AbortSignal.timeout(6000),redirect:'follow'})
  const html=(await r.text()).slice(0,300000)
  const m=n=>{const x=html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`,'i'))||html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`,'i'));return x?dec(x[1]):''}
  const title=m('og:title')||dec((html.match(/<title[^>]*>([^<]*)/i)||[])[1])||u.hostname
  let image=m('og:image');try{image=image?new URL(image,u).href:''}catch{image=''}
  return Response.json({title:title.trim().slice(0,140),desc:(m('og:description')||m('description')).slice(0,200),image,site:m('og:site_name')||u.hostname})
 }catch{return Response.json({title:u.hostname,desc:'',image:'',site:u.hostname})}
}
