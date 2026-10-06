// Liste des fichiers récents (poignées de fichiers gardées dans IndexedDB du navigateur)
const db=()=>new Promise((res,rej)=>{const r=indexedDB.open('notes',1);r.onupgradeneeded=()=>r.result.createObjectStore('h',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})
const tx=async(m,f)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('h',m),r=f(t.objectStore('h'));t.oncomplete=()=>res(r.result);t.onerror=()=>rej(t.error)})}
export const recents=async()=>((await tx('readonly',s=>s.getAll()))||[]).sort((a,b)=>b.date-a.date)
export const forget=id=>tx('readwrite',s=>s.delete(id))
export async function remember(handle){
 for(const r of await recents()) if(await r.handle.isSameEntry(handle)) await forget(r.id)
 await tx('readwrite',s=>s.put({id:crypto.randomUUID(),handle,name:handle.name,date:Date.now()}))
}
