(function(D){
'use strict';
D.VERSION='3.0.0';
D.$=(s,r=document)=>r.querySelector(s);D.$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
D.escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
D.uid=()=>globalThis.crypto?.randomUUID?.()||`duo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
D.clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
D.time=s=>`${Math.floor((s||0)/60)}:${String(Math.floor((s||0)%60)).padStart(2,'0')}`;
D.bus=new EventTarget();D.emit=(type,detail)=>D.bus.dispatchEvent(new CustomEvent(type,{detail}));
D.btn=(action,icon,label='',cls='',extra='')=>`<button type="button" class="btn ${cls}" data-action="${action}" title="${D.escape(label||action)}" aria-label="${D.escape(label||action)}" ${extra}>${icon?D.icon(icon):''}${label?`<span>${D.escape(label)}</span>`:''}</button>`;
D.ib=(action,icon,label,extra='')=>`<button type="button" class="icon-btn" data-action="${action}" aria-label="${D.escape(label)}" title="${D.escape(label)}" ${extra}>${D.icon(icon)}</button>`;
D.avatar=(name,cls='')=>`<span class="avatar ${cls}" style="--av-h:${Array.from(String(name)).reduce((s,c)=>s+c.charCodeAt(0)*7,0)%360}">${D.escape(String(name).split(' ').map(n=>n[0]).slice(0,2).join(''))}</span>`;
D.image=(name,alt='',cls='')=>`<img class="${cls}" src="${D.assets[name+'.jpg']||D.assets['dunes.jpg']}" alt="${D.escape(alt)}" loading="lazy" draggable="false">`;
D.empty=(icon,title,text)=>`<div class="empty-state">${D.icon(icon,36)}<h3>${D.escape(title)}</h3><p>${D.escape(text)}</p></div>`;
D.download=(name,data,type='text/plain')=>{const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);};
D.copy=async text=>{try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;left:-9999px';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error('Clipboard unavailable');}D.toast('Copied to clipboard');}catch{D.dialog('Copy text',`<textarea class="copy-fallback" aria-label="Text to copy">${D.escape(text)}</textarea><p class="muted">Select and copy this text.</p>`,el=>{D.$('textarea',el).select();});}};
D.toast=(text,action)=>{const host=D.$('#toast-host');if(!host)return;const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.innerHTML=`${D.icon('check',17)}<span>${D.escape(text)}</span>`;if(action){const b=document.createElement('button');b.textContent=action.label||'Undo';b.onclick=()=>{action.run();t.remove();};t.append(b);}host.append(t);setTimeout(()=>t.remove(),action?7000:3300);};
let currentDialogCleanup=null;
D.dialog=(title,html,mount)=>{
 const dialog=D.$('#system-dialog');if(dialog.open)dialog.close();const previousCleanup=currentDialogCleanup;currentDialogCleanup=null;previousCleanup?.();
 dialog.innerHTML=`<div class="dialog-top"><h2>${D.escape(title)}</h2><button class="icon-btn" data-dismiss aria-label="Close dialog">${D.icon('close')}</button></div><div class="dialog-body">${html}</div>`;
 dialog.querySelector('[data-dismiss]').onclick=()=>dialog.close();
 dialog.showModal();const cleanup=mount?.(D.$('.dialog-body',dialog));currentDialogCleanup=typeof cleanup==='function'?cleanup:null;
 dialog.onclose=()=>{if(dialog.open)return;const cleanup=currentDialogCleanup;currentDialogCleanup=null;cleanup?.();};
};
D.scope=()=>new globalThis.DuoKit.Scope();
const defaults={version:1,prefs:{posture:'open',angle:180,rotation:false,dark:false,palette:0,brightness:1,volume:.45,wifi:true,focus:false,reducedMotion:false},pairs:[],shelf:[],recent:[],apps:{}};
const clone=x=>structuredClone(x);
function safeObject(x,depth=0,key=''){
 if(typeof x==='number'&&!Number.isFinite(x))throw Error('Non-finite session number.');
 if(depth>30)throw Error('Session is nested too deeply.');
 if(typeof x==='string'){
  if(x.length>8_000_000)throw Error('A session value exceeds the 8 MB limit.');
  if(['id','selected','art','scene'].includes(key)&&x&&!/^[a-zA-Z0-9_.-]{1,128}$/.test(x))throw Error('Invalid session identifier.');
  if(['dataURL','imageData','image'].includes(key)&&x&&!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(x))throw Error('Invalid embedded image.');
 }
 if(Array.isArray(x)&&x.length>(key==='vertices'?20000:key==='faces'?40000:key==='entities'?2000:1000))throw Error('A collection exceeds the 1,000 item limit.');
 if(x&&typeof x==='object')for(const k of Object.keys(x)){if(['__proto__','prototype','constructor'].includes(k))throw Error('Invalid session key.');safeObject(x[k],depth+1,k);}
}
function checkFields(value,fields,label){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+label+' object.');
 for(const [key,type] of Object.entries(fields)){
  const v=value[key];const ok=type==='array'?Array.isArray(v):type==='object'?v&&typeof v==='object'&&!Array.isArray(v):typeof v===type;
  if(!ok)throw Error('Invalid '+label+'.'+key+'.');
 }
}
function validateAppModels(models){
 const shape={
  chatgpt:{messages:'array',prompt:'string',context:'string',artifact:'object',preview:'boolean'},
  gemini:{messages:'array',prompt:'string',context:'string',title:'string',description:'string',cards:'array'},
  threads:{posts:'array',selected:'string',filter:'string',reply:'string',search:'string'},
  instagram:{posts:'array',selected:'string',filter:'string',comment:'string'},
  google:{query:'string',draft:'string',selected:'string',tab:'string',saved:'array'},
  whatsapp:{conversations:'array',selected:'string',drafts:'object',search:'string',filter:'string'},
  gmail:{messages:'array',selected:'string',folder:'string',query:'string',composing:'boolean',draft:'object'},
  maps:{selected:'string',query:'string',filter:'string',favorites:'array',stops:'array',mode:'string',style:'string',view:'object'},
  tiktok:{index:'number',tab:'string',liked:'object',saved:'object',following:'object',comments:'object',draft:'string',muted:'boolean',times:'object'},
  draftline:{title:'string',entities:'array',selected:'string',tool:'string',view:'object',grid:'boolean',snap:'boolean'},
  scenelab:{title:'string',objects:'array',selected:'string',camera:'object',mode:'string',animate:'boolean'},
  polyform:{title:'string',profile:'array',method:'string',depth:'number',segments:'number',twist:'number',camera:'object',wire:'boolean'},
  pulse:{title:'string',bpm:'number',swing:'number',tracks:'array',steps:'number',bars:'number'},
  cutroom:{title:'string',clips:'array',selected:'string',time:'number',width:'number',height:'number'},
  folio:{title:'string',html:'string'},
  gridsheet:{title:'string',cells:'object',selected:'string',rows:'number',cols:'number',formats:'object'},
  keydeck:{title:'string',slides:'array',selected:'string'},
  inkpad:{title:'string',layers:'array',selected:'string',color:'string',size:'number',tool:'string',width:'number',height:'number'},
  arcade:{game:'string',best:'object',sound:'boolean'},
  youtube:{selected:'string',tab:'string',queue:'array',notes:'object',comments:'object',draft:'string',liked:'object',subscribed:'object',captions:'boolean',muted:'boolean',times:'object'}
 };
 const comment=x=>checkFields(x,{name:'string',text:'string'},'comment');
 for(const [id,v] of Object.entries(models)){
  if(!shape[id]){if(/^user-[a-z0-9-]{1,60}$/.test(id)&&v&&typeof v==='object'&&!Array.isArray(v)){globalThis.DuoKit.safeData(v);continue;}throw Error('Unknown app in session: '+id);}checkFields(v,shape[id],id);
  const require=(ok,message)=>{if(!ok)throw Error(id+': '+message);},number=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max,color=c=>/^#[a-f0-9]{6}$/i.test(c),enumOf=(x,options)=>options.includes(x),vector=(v,min=-100000,max=100000)=>Array.isArray(v)&&v.length===3&&v.every(n=>number(n,min,max)),unique=items=>new Set(items.map(x=>x.id)).size===items.length;
  if(id==='draftline'){
   require(v.entities.length<=2000&&unique(v.entities),'Invalid CAD entity count or IDs');checkFields(v.view,{x:'number',y:'number',scale:'number'},'CAD view');require(number(v.view.scale,.1,20),'Invalid zoom');require(enumOf(v.tool,['select','line','rect','circle','text','dimension','pan']),'Unknown drawing tool');
   for(const e of v.entities){checkFields(e,{id:'string',type:'string',x:'number',y:'number',color:'string',layer:'string'},'CAD entity');require(color(e.color)&&enumOf(e.type,['line','rect','circle','text','dimension']),'Invalid entity type/color');for(const k of ['x','y','x2','y2','w','h','r','size'])if(e[k]!==undefined)require(number(e[k],-100000,100000),'Invalid geometry');if(['line','dimension'].includes(e.type))require(number(e.x2,-100000,100000)&&number(e.y2,-100000,100000),'Invalid segment');if(e.type==='rect')require(number(e.w,-100000,100000)&&number(e.h,-100000,100000),'Invalid rectangle');if(e.type==='circle')require(number(e.r,0,100000),'Invalid circle');if(e.type==='text')require(typeof e.text==='string'&&number(e.size,1,500),'Invalid text');}
  }
  if(['scenelab','polyform'].includes(id)){checkFields(v.camera,{yaw:'number',pitch:'number',distance:'number',target:'array'},'Camera');require(number(v.camera.distance,.1,1000)&&vector(v.camera.target),'Invalid camera');}
  if(id==='scenelab'){
   require(v.objects.length<=100&&unique(v.objects)&&enumOf(v.mode,['solid','wire']),'Invalid scene');let count=0;
   for(const o of v.objects){checkFields(o,{id:'string',name:'string',type:'string',color:'string',position:'array',rotation:'array',scale:'array'},'Scene object');require(color(o.color)&&vector(o.position)&&vector(o.rotation)&&vector(o.scale,.001,1000)&&enumOf(o.type,['cube','sphere','torus','cone','cylinder','mesh']),'Invalid transform or primitive');if(o.type==='mesh'){const g=o.mesh;require(g&&Array.isArray(g.vertices)&&Array.isArray(g.faces)&&g.vertices.length<=20000&&g.faces.length<=40000,'Invalid mesh');require(g.vertices.every(x=>vector(x))&&g.faces.every(f=>Array.isArray(f)&&f.length===3&&f.every(i=>Number.isInteger(i)&&i>=0&&i<g.vertices.length)),'Invalid mesh topology');count+=g.faces.length;}}require(count<=200000,'Scene triangle budget exceeded');
  }
  if(id==='polyform'){require(v.profile.length>=3&&v.profile.length<=128&&v.profile.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>number(n,-100,100))),'Invalid construction profile');require(enumOf(v.method,['lathe','extrude'])&&Number.isInteger(v.segments)&&number(v.segments,3,128)&&number(v.depth,.05,20)&&number(v.twist,-720,720),'Invalid construction parameters');}
  if(id==='pulse'){require(number(v.bpm,30,240)&&enumOf(v.steps,[16,32])&&v.tracks.length>=1&&v.tracks.length<=16&&unique(v.tracks)&&Number.isInteger(v.bars)&&number(v.bars,1,16)&&number(v.swing,0,.9),'Invalid sequencer');for(const t of v.tracks){checkFields(t,{id:'string',name:'string',kind:'string',pattern:'array',gain:'number',pan:'number',cutoff:'number',mute:'boolean',solo:'boolean',pitch:'number'},'Track');require(enumOf(t.kind,['kick','snare','hat','bass','chord','lead'])&&t.pattern.length===v.steps&&t.pattern.every(n=>number(n,0,1))&&number(t.gain,0,1)&&number(t.pan,-1,1)&&number(t.cutoff,80,16000)&&number(t.pitch,24,96),'Invalid instrument or pattern');}}
  if(id==='cutroom'){require(v.clips.length<=64&&unique(v.clips)&&number(v.width,64,1920)&&number(v.height,64,1920)&&Number.isInteger(v.width)&&Number.isInteger(v.height)&&number(v.time,0,86400),'Invalid timeline');for(const c of v.clips){checkFields(c,{id:'string',source:'string',name:'string',in:'number',out:'number',speed:'number',title:'string',filter:'string',volume:'number'},'Clip');require((['dunes','coast','alpine'].includes(c.source)||c.source.startsWith('file:'))&&c.out>c.in&&number(c.in,0,86400)&&number(c.out,0,86400)&&number(c.speed,.25,4)&&number(c.volume,0,1),'Invalid clip or source');require(['none','warm','cool','mono','vivid'].includes(c.filter),'Invalid clip filter');}}
  if(id==='folio')require(v.html.length<=2000000,'Document exceeds limit');
  if(id==='gridsheet'){require(Number.isInteger(v.rows)&&number(v.rows,1,200)&&Number.isInteger(v.cols)&&number(v.cols,1,52),'Invalid grid size');const addr=a=>/^[A-Z]{1,2}[1-9][0-9]{0,2}$/.test(a);for(const [a,b]of Object.entries(v.cells))require(addr(a)&&typeof b==='string'&&b.length<=10000,'Invalid cell');for(const [a,f]of Object.entries(v.formats)){require(addr(a)&&f&&typeof f==='object'&&!Array.isArray(f),'Invalid format');if(f.color!==undefined)require(color(f.color),'Invalid cell color');if(f.kind!==undefined)require(enumOf(f.kind,['general','currency','percent','fixed']),'Invalid number format');if(f.bold!==undefined)require(typeof f.bold==='boolean','Invalid text weight');}}
  if(id==='keydeck'){require(v.slides.length>=1&&v.slides.length<=100&&unique(v.slides),'Invalid slide count');for(const x of v.slides){checkFields(x,{id:'string',title:'string',body:'string',notes:'string',background:'string',accent:'string',layout:'string'},'Slide');require(color(x.background)&&color(x.accent)&&enumOf(x.layout,['title','split','quote']),'Invalid slide styling');}}
  if(id==='inkpad'){require(v.layers.length>=1&&v.layers.length<=12&&unique(v.layers)&&Number.isInteger(v.width)&&Number.isInteger(v.height)&&number(v.width,32,1600)&&number(v.height,32,1600)&&color(v.color)&&number(v.size,1,140)&&enumOf(v.tool,['brush','eraser','line','rect','ellipse','fill','eyedropper']),'Invalid paint document');for(const l of v.layers){checkFields(l,{id:'string',name:'string',visible:'boolean',opacity:'number',imageData:'string'},'Layer');require(number(l.opacity,0,1),'Invalid layer opacity');}}
  if(id==='arcade'){require(enumOf(v.game,['breakout','snake','merge']),'Invalid game');for(const k of ['breakout','snake','merge'])require(number(v.best[k],0,1e15),'Invalid score');}
  if(id==='chatgpt'){checkFields(v.artifact,{title:'string',body:'string',type:'string'},'canvas');v.messages.forEach(x=>checkFields(x,{role:'string',text:'string'},'message'));}
  if(id==='gemini'){v.messages.forEach(x=>checkFields(x,{role:'string',text:'string'},'message'));v.cards.forEach(x=>checkFields(x,{id:'string',scene:'string',title:'string',note:'string'},'card'));}
  if(id==='threads')v.posts.forEach(x=>{checkFields(x,{id:'string',name:'string',text:'string',replies:'array',likes:'number'},'thread');x.replies.forEach(comment);});
  if(id==='instagram')v.posts.forEach(x=>{checkFields(x,{id:'string',name:'string',title:'string',caption:'string',comments:'array',likes:'number'},'photo');x.comments.forEach(comment);});
  if(id==='whatsapp'){v.conversations.forEach(x=>{checkFields(x,{id:'string',name:'string',messages:'array'},'conversation');x.messages.forEach(m=>checkFields(m,{text:'string',mine:'boolean',time:'string'},'message'));});if(v.pending!=null)checkFields(v.pending,{title:'string',text:'string'},'pending reference');}
  if(id==='gmail'){v.messages.forEach(x=>checkFields(x,{id:'string',from:'string',email:'string',subject:'string',body:'string',folder:'string'},'email'));checkFields(v.draft,{to:'string',subject:'string',body:'string'},'mail draft');}
  if(id==='maps'){checkFields(v.view,{x:'number',y:'number',w:'number',h:'number'},'map view');if(v.view.w<1||v.view.h<1||!Object.values(v.view).every(Number.isFinite))throw Error('Invalid map viewport.');}
  if(id==='tiktok'||id==='youtube')for(const list of Object.values(v.comments)){if(!Array.isArray(list))throw Error('Invalid comments collection.');list.forEach(comment);}
  if(id==='youtube'&&(!v.queue.length||v.queue.some(x=>!['dunes','coast','alpine'].includes(x))))throw Error('Invalid video queue.');
  if(id==='tiktok'&&(!Number.isInteger(v.index)||v.index<0||v.index>2))throw Error('Invalid film selection.');
 }
}

class SessionStore{
 constructor(){this.key='duo-studio.v1';this.timer=0;this.history=[];this.future=[];this.data=clone(defaults);this.persistent=true;try{const raw=localStorage.getItem(this.key);if(raw)this.data=this.validate(JSON.parse(raw));}catch{this.persistent=false;} }
 validate(v){safeObject(v);if(!v||v.version!==1||!v.apps||typeof v.apps!=='object'||Array.isArray(v.apps))throw Error('This is not a Duo Studio v1 session.');validateAppModels(v.apps);const p={...defaults.prefs,...(v.prefs||{})};p.angle=D.clamp(p.angle,0,180);p.brightness=D.clamp(p.brightness,.35,1);p.volume=D.clamp(p.volume,0,1);p.palette=Math.round(D.clamp(p.palette,0,3));p.posture=['open','book','tabletop','closed'].includes(p.posture)?p.posture:'open';for(const flag of ['rotation','dark','wifi','focus','reducedMotion'])p[flag]=Boolean(p[flag]);if(Array.isArray(v.pairs))for(const pair of v.pairs)checkFields(pair,{a:'string',b:'string',name:'string'},'app pair');if(Array.isArray(v.shelf))for(const item of v.shelf)checkFields(item,{id:'string',title:'string',text:'string'},'clipboard');return {...clone(defaults),...v,prefs:p,recent:Array.isArray(v.recent)?v.recent.slice(0,20):[],pairs:Array.isArray(v.pairs)?v.pairs.slice(0,20):[],shelf:Array.isArray(v.shelf)?v.shelf.slice(0,8):[]};}
 get(id,seed){if(!this.data.apps[id])this.data.apps[id]=clone(seed||{});return this.data.apps[id];}
 save(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),180);}
 flush(){clearTimeout(this.timer);try{localStorage.setItem(this.key,JSON.stringify(this.data));this.persistent=true;}catch{if(this.persistent)D.toast('Storage is full or disabled. Export your session to keep changes.');this.persistent=false;} }
 checkpoint(id){this.history.push({id,value:clone(this.data.apps[id])});this.future=this.future.filter(x=>x.id!==id);if(this.history.length>80)this.history.shift();}
 undo(id){const index=id?this.history.findLastIndex(h=>h.id===id):this.history.length-1;if(index<0)return false;const h=this.history.splice(index,1)[0];this.future.push({id:h.id,value:clone(this.data.apps[h.id])});this.data.apps[h.id]=h.value;this.save();D.emit('restore',h.id);return true;}
 redo(id){const index=id?this.future.findLastIndex(h=>h.id===id):this.future.length-1;if(index<0)return false;const h=this.future.splice(index,1)[0];this.history.push({id:h.id,value:clone(this.data.apps[h.id])});this.data.apps[h.id]=h.value;this.save();D.emit('restore',h.id);return true;}
 import(text){if(text.length>32_000_000)throw Error('Session exceeds the 32 MB limit.');const next=this.validate(JSON.parse(text));this.data=next;this.history=[];this.future=[];this.flush();D.emit('session-imported');}
 export(){return JSON.stringify(this.data,null,2);}
 reset(){this.data=clone(defaults);this.history=[];this.future=[];this.flush();D.emit('session-imported');}
}
D.store=new SessionStore();window.addEventListener('pagehide',()=>D.store.flush());
D.apps=new Map();
D.register=(meta,mount)=>D.apps.set(meta.id,{pattern:'Workspace + inspector',boundary:'Local application; see documented format and service boundaries.',...meta,mount});
D.appHeader=(id,subtitle,actions='')=>`<header class="app-header"><div class="app-title">${D.brand(id,27)}<div><b>${D.escape(D.apps.get(id)?.name||id)}</b><small>${D.escape(subtitle)}</small></div></div><div class="app-head-actions">${actions}${D.ib('share-app','share','Share current context')}${D.ib('app-menu','more','App actions')}</div></header>`;
D.paneTabs=(a,b)=>`<div class="pane-tabs"><button class="active" data-pane="primary">${D.escape(a)}</button><button data-pane="secondary">${D.escape(b)}</button></div>`;
// App mounting and lifetime are owned by sdk/host.js.
D.share=artifact=>{
 D.dialog('Send to the other side',`<div class="share-preview">${D.icon('file',28)}<div><b>${D.escape(artifact.title||'Shared context')}</b><p>${D.escape(String(artifact.text||'').slice(0,150))}</p></div></div><div class="share-apps">${['chatgpt','whatsapp','gmail','gemini'].map(id=>`<button data-target="${id}">${D.brand(id,48)}<span>${D.apps.get(id)?.name}</span></button>`).join('')}<button data-target="shelf">${D.icon('copy',48)}<span>Clipboard shelf</span></button></div>`,body=>{body.addEventListener('click',e=>{const b=e.target.closest('[data-target]');if(!b)return;D.$('#system-dialog').close();if(b.dataset.target==='shelf'){D.addToShelf(artifact);}else D.emit('transfer',{app:b.dataset.target,artifact});});});
};
D.addToShelf=artifact=>{D.store.data.shelf.unshift({...artifact,id:D.uid()});D.store.data.shelf=D.store.data.shelf.slice(0,8);D.store.save();D.toast('Added to your cross-app clipboard');D.emit('shelf-changed');};
D.readImage=async file=>{if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('Choose a PNG, JPEG, WebP, or GIF image.');if(file.size>12_000_000)throw Error('Choose an image smaller than 12 MB.');const url=URL.createObjectURL(file);try{const im=new Image();im.src=url;await im.decode();const s=Math.min(1,1000/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,im.width*s);c.height=Math.max(1,im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.82);}finally{URL.revokeObjectURL(url);}};
D.wrapDrop=(root,receive)=>{const ac=new AbortController();root.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-duo')){e.preventDefault();root.classList.add('drop-target');}},{signal:ac.signal});root.addEventListener('dragleave',()=>root.classList.remove('drop-target'),{signal:ac.signal});root.addEventListener('drop',e=>{root.classList.remove('drop-target');try{const s=e.dataTransfer.getData('application/x-duo');if(s){e.preventDefault();receive(JSON.parse(s));}}catch{D.toast('Could not read this dragged item.');}},{signal:ac.signal});return ()=>ac.abort();};
})(window.Duo);
