/* Shared project, revision and creative-workflow support for the original ten studies. */
(function(D){
'use strict';const S=D.Studio,E=D.escape;
const targets={chatgpt:['folio','Write in Folio'],threads:['folio','Collect in Folio'],google:['folio','Research in Folio'],tiktok:['cutroom','Edit in Cutroom'],whatsapp:['folio','Conversation notes'],instagram:['inkpad','Paint in Inkpad'],youtube:['cutroom','Edit in Cutroom'],maps:['draftline','Route in Draftline'],gmail:['folio','Document in Folio'],gemini:['keydeck','Present in Keydeck']};
function text(id,m){switch(id){case'chatgpt':return m.artifact?.body||m.messages.map(x=>x.role+': '+x.text).join('\n\n');case'threads':{const p=m.posts.find(p=>p.id===m.selected)||m.posts[0];return p?p.text+'\n\n'+p.replies.map(r=>r.name+': '+r.text).join('\n'):'';}case'google':return m.query+'\n\nSaved sources: '+m.saved.join(', ');case'whatsapp':{const c=m.conversations.find(c=>c.id===m.selected);return c?.messages.map(x=>x.time+' '+(x.mine?'You':c.name)+': '+x.text).join('\n')||'';}case'gmail':{const x=m.messages.find(x=>x.id===m.selected);return m.composing?m.draft.subject+'\n\n'+m.draft.body:x?x.subject+'\n\n'+x.body:'';}case'gemini':return m.title+'\n\n'+m.cards.map(c=>c.title+'\n'+c.note).join('\n\n');case'youtube':return m.notes[m.selected]||'Original film: '+m.selected;case'instagram':{const p=m.posts.find(x=>x.id===m.selected);return p?.caption||'';}default:return JSON.stringify(m,null,2);}}
for(const [id,[target,label]] of Object.entries(targets)){
 const def=D.apps.get(id),mount=def.mount;def.category='Everyday';def.mount=ctx=>{
  const api=mount(ctx)||{},oldReceive=api.receive;const model=()=>D.store.data.apps[id];
  const exportProject=()=>({format:'duo-project',version:1,app:id,model:S.clone(model())});
  const title=()=>model().title||model().artifact?.title||def.name+' workspace';
  const document=()=>({type:'text',source:id,title:title(),text:text(id,model())});
  const toolbar=()=>{if(ctx.root.querySelector('.everyday-tools'))return;const el=documentElement();ctx.root.append(el);};
  function documentElement(){const el=window.document.createElement('div');el.className='everyday-tools';el.innerHTML=`<button data-action="studio-undo">↶ Undo</button><button data-action="studio-redo">↷ Redo</button><button data-action="studio-save">Save workspace</button><button data-action="studio-project">Project ↓</button><button data-action="studio-handoff">${E(label)} ↗</button>`;return el;}
  const observer=new MutationObserver(toolbar);observer.observe(ctx.root,{childList:true});ctx.scope.cleanup(()=>observer.disconnect());toolbar();
  ctx.act('studio-undo',()=>D.store.undo(id)||D.toast('No revision for this app'));ctx.act('studio-redo',()=>D.store.redo(id)||D.toast('No revision to redo'));
  ctx.act('studio-project',()=>D.download(def.name+'.duo.json',JSON.stringify(exportProject(),null,2),'application/json'));
  ctx.act('studio-save',async()=>{await S.files.put({id:'workspace-'+id,name:def.name+'.duo.json',app:id,type:'application/json',data:JSON.stringify(exportProject())});D.notify?.({app:id,title:'Workspace saved',text:def.name});});
  ctx.act('studio-handoff',()=>{
   const m=model();if(id==='instagram'){const p=m.posts.find(p=>p.id===m.selected)||m.posts[0];if(p)D.emit('transfer',{app:target,artifact:{type:'image',title:p.title||'Shared moment',imageData:p.dataURL||D.assets[(p.art||'dunes')+'.jpg'],text:p.caption}});}
   else if(id==='youtube'||id==='tiktok'){const source=id==='youtube'?m.selected:['dunes','coast','alpine'][m.index];if(!['dunes','coast','alpine'].includes(source))return D.toast('Import the local media file into Cutroom to edit it.');D.emit('transfer',{app:target,artifact:{type:'video',source,title:'Original '+source+' film',text:source}});}
   else if(id==='maps'){const {graph,places}=D.demoMap;let from='6-2';const path=[from];for(const id of m.stops){const place=places.find(p=>p.id===id);if(!place)continue;const result=D.engine.shortestPath(graph,from,place.node);path.push(...result.path.slice(1));from=place.node;}D.emit('transfer',{app:target,artifact:{type:'map-route',title:'Porto Alba · fictional route',points:path.map(id=>[graph[id].x,graph[id].y]),text:m.stops.join(' → ')}});}
   else D.emit('transfer',{app:target,artifact:document()});
  });
  const checkpoint=()=>D.store.checkpoint(id);ctx.scope.on(ctx.root,'submit',checkpoint,{capture:true});ctx.scope.on(ctx.root,'click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a&&!a.startsWith('studio-')&&!/^(tab|select|open|focus|play|mute|seek|chapter|next)/.test(a))checkpoint();},{capture:true});
  const existingRender=api.render;api.render=(...args)=>{const result=existingRender?.(...args);toolbar();return result;};
  api.receive=artifact=>{
   if(artifact.type==='application/x-duo-project'&&artifact.app===id){const p=S.parseJSON(artifact.text);if(p.format!=='duo-project'||p.version!==1||p.app!==id)throw Error('Wrong project format');const next=S.clone(D.store.data);next.apps[id]=p.model;D.store.validate(next);D.store.checkpoint(id);D.store.data.apps[id]=p.model;ctx.save();D.emit('restore',id);return;}
   if(id==='instagram'&&artifact.imageData){if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(artifact.imageData)||artifact.imageData.length>8e6)throw Error('Invalid embedded image');checkpoint();const p={id:D.uid(),art:'dunes',dataURL:artifact.imageData,name:'You',handle:'you',title:String(artifact.title||'Made in your studio').slice(0,200),caption:String(artifact.text||'').slice(0,2000),filter:'none',likes:0,liked:false,saved:false,following:true,comments:[]};model().posts.unshift(p);model().selected=p.id;model().filter='all';ctx.save();api.render();ctx.pane('secondary');return;}
   return oldReceive?.(artifact);
  };return api;
 };
}
// A share sheet with concrete local destinations, preserving structured artifacts.
D.share=artifact=>{const ids=['chatgpt','whatsapp','gmail','gemini','folio','keydeck','gridsheet',...(artifact.imageData?['inkpad','instagram']:[]),...(artifact.mesh?['scenelab']:[])];D.dialog('Continue on the other side',`<div class="share-preview">${D.icon('file',28)}<div><b>${E(artifact.title||'Shared context')}</b><p>${E(String(artifact.text||'').slice(0,160))}</p></div></div><div class="share-apps">${ids.map(id=>`<button data-target="${id}">${D.brand(id,44)}<span>${E(D.apps.get(id).name)}</span></button>`).join('')}<button data-target="shelf">${D.icon('copy',44)}<span>Clipboard shelf</span></button></div>`,body=>{body.onclick=e=>{const id=e.target.closest('[data-target]')?.dataset.target;if(!id)return;D.$('#system-dialog').close();if(id==='shelf')D.addToShelf({...artifact,title:String(artifact.title||'Context'),text:String(artifact.text||'')});else if(D.apps.has(id))D.emit('transfer',{app:id,artifact});};});};
})(window.Duo);
