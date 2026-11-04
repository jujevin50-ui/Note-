import test from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { youtubeId, documentVideo } from './youtube-preview.js'
const id='dQw4w9WgXcQ'
test('watch, short links, embeds, shorts and live URLs',()=>{
 for(const url of [`https://www.youtube.com/watch?v=${id}&t=30`,`https://youtu.be/${id}?si=x`,`https://www.youtube-nocookie.com/embed/${id}`,`https://m.youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`,`youtube.com/watch?v=${id}`])assert.equal(youtubeId(url),id)
 assert.equal(youtubeId(`https://youtube.com/watch?feature=share&amp;v=${id}`),id)
})
test('invalid links, channels and misleading hosts have no video',()=>{
 for(const url of ['https://youtube.com/@channel','https://example.com/watch?v='+id,'https://youtube.com.evil.test/watch?v='+id,'https://youtu.be/abc','texte sans vidéo'])assert.equal(youtubeId(url),null)
})
test('video is extracted from saved Yjs text and embedded video attributes',()=>{
 for(const embedded of [true,false]){
 const doc=new Y.Doc(),fragment=doc.getXmlFragment('default')
 if(embedded){const node=new Y.XmlElement('youtube');node.setAttribute('src','https://youtube.com/embed/'+id);fragment.insert(0,[node])}
 else{const p=new Y.XmlElement('paragraph'),text=new Y.XmlText();text.insert(0,'Vidéo : https://youtu.be/'+id);p.insert(0,[text]);fragment.insert(0,[p])}
 assert.equal(documentVideo(Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')),id);doc.destroy()
 }
 assert.equal(documentVideo('corrompu'),null);assert.equal(documentVideo(null),null)
})
