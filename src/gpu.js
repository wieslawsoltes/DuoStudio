/* WebGPU compute + presentation. The DOM remains the semantic, accessible UI layer. */
(function(D){
'use strict';
const compute=`
struct Params { size: vec2f, time: f32, palette: f32, pointer: vec2f, energy: f32, pad: f32 };
@group(0) @binding(0) var outputImage: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> p: Params;
fn hash(v: vec2f) -> f32 { return fract(sin(dot(v,vec2f(127.1,311.7)))*43758.5453); }
fn noise(v:vec2f)->f32 {let i=floor(v);let f=fract(v);let u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2f(1,0)),u.x),mix(hash(i+vec2f(0,1)),hash(i+vec2f(1,1)),u.x),u.y);}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) tid:vec3u){
 if(tid.x>=u32(p.size.x)||tid.y>=u32(p.size.y)){return;}
 let uv=vec2f(tid.xy)/p.size;let t=p.time*.12;let q=uv+vec2f(.035*sin(t+uv.y*4.),.023*cos(t+uv.x*3.));
 var low=vec3f(.015,.035,.12);var high=vec3f(.38,.19,.53);var glow=vec3f(.94,.54,.43);
 if(p.palette>.5 && p.palette<1.5){low=vec3f(.012,.08,.10);high=vec3f(.035,.34,.32);glow=vec3f(.70,.88,.55);}
 if(p.palette>1.5 && p.palette<2.5){low=vec3f(.13,.04,.055);high=vec3f(.55,.19,.23);glow=vec3f(1.,.66,.36);}
 if(p.palette>2.5){low=vec3f(.025,.045,.11);high=vec3f(.14,.29,.55);glow=vec3f(.54,.79,.99);}
 var col=mix(low,high,smoothstep(0.,1.,uv.y));
 let ridge=.53+.24*sin(q.x*4.8+t*.55)+.12*sin(q.x*8.-t*.25);
 let d=q.y-ridge;let ribbon=exp(-abs(d)*9.);let thin=exp(-abs(d-.022*sin(q.x*20.))*76.);
 col=mix(col,glow,ribbon*.75);col+=thin*glow*.28;
 let wave=.15+.16*sin(q.x*3.3-t*.6);let d2=q.y-wave;
 col+=vec3f(.21,.20,.34)*exp(-abs(d2)*11.)*.85;
 let cx=uv.x-p.pointer.x;let cy=uv.y-p.pointer.y;
 col+=glow*exp(-(cx*cx+cy*cy)*12.)*.055;
 col+=vec3f((hash(uv*p.size+vec2f(17.3))-0.5)*.012);
 col*=.84+.16*pow(max(0.,1.-distance(uv,vec2f(.48,.45))),.7);
 textureStore(outputImage,vec2i(tid.xy),vec4f(col,1.));
}`;
const present=`
@group(0) @binding(0) var picture:texture_2d<f32>;
@group(0) @binding(1) var pictureSampler:sampler;
struct Varyings{@builtin(position) position:vec4f,@location(0) uv:vec2f};
@vertex fn vs(@builtin(vertex_index) index:u32)->Varyings{
 let points=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Varyings;o.position=vec4f(points[index],0,1);o.uv=points[index]*vec2f(.5,-.5)+vec2f(.5);return o;
}
@fragment fn fs(v:Varyings)->@location(0) vec4f{return textureSample(picture,pictureSampler,v.uv);}`;
class GPUBackdrop{
 constructor(canvas){this.canvas=canvas;this.mode='Starting';this.running=true;this.paused=false;this.frame=0;this.last=0;this.time=0;this.pointer=[.5,.5];this.pointerTarget=canvas.parentElement;this.onPointer=e=>{if(this.paused)return;const r=this.canvas.getBoundingClientRect();if(r.width&&r.height){this.pointer=[D.clamp((e.clientX-r.left)/r.width,0,1),D.clamp((e.clientY-r.top)/r.height,0,1)];this.dirty=true;}};this.pointerTarget.addEventListener('pointermove',this.onPointer,{passive:true});this.texture=null;this.uniform=new Float32Array(8);this.disposed=false;this.dirty=true;this.ro=new ResizeObserver(()=>{this.dirty=true;});this.ro.observe(canvas);this.visibility=()=>{this.last=0;};document.addEventListener('visibilitychange',this.visibility);this.init();}
 async init(){
  try{
   if(!navigator.gpu||!window.isSecureContext)throw Error('WebGPU unavailable in this context');
   this.adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});if(!this.adapter)throw Error('No WebGPU adapter');
   this.device=await this.adapter.requestDevice();if(this.disposed){this.device.destroy();return;}
   this.device.addEventListener('uncapturederror',e=>this.fallback(e.error.message));
   this.device.lost.then(info=>{if(!this.disposed&&info.reason!=='destroyed')this.fallback('WebGPU device lost');});
   this.context=this.canvas.getContext('webgpu');if(!this.context)throw Error('No WebGPU canvas');
   this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format:this.format,alphaMode:'opaque'});
   const c=this.device.createShaderModule({label:'Duo aurora compute',code:compute});const r=this.device.createShaderModule({label:'Duo fullscreen presentation',code:present});
   for(const module of [c,r]){const info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));}
   this.device.pushErrorScope('validation');
   this.cp=this.device.createComputePipeline({label:'Aurora 8x8',layout:'auto',compute:{module:c,entryPoint:'main'}});
   this.rp=this.device.createRenderPipeline({label:'Backdrop presentation',layout:'auto',vertex:{module:r,entryPoint:'vs'},fragment:{module:r,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
   this.ub=this.device.createBuffer({label:'Aurora uniforms',size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   this.sampler=this.device.createSampler({magFilter:'linear',minFilter:'linear'});
   const error=await this.device.popErrorScope();if(error)throw error;
   this.mode='WebGPU';this.dirty=true;D.emit('gpu-ready',{mode:this.mode});this.loop(0);
  }catch(error){this.fallback(error.message);}
 }
 fallback(reason){
  if(this.disposed||this.mode==='Canvas 2D')return;
  cancelAnimationFrame(this.frame);this.context?.unconfigure?.();this.texture?.destroy();this.ub?.destroy();this.device?.destroy();
  // A canvas cannot switch context types; replace only the decorative canvas.
  const old=this.canvas,next=old.cloneNode(false);old.replaceWith(next);this.ro.unobserve(old);this.ro.observe(next);this.canvas=next;this.ctx=next.getContext('2d',{alpha:false});this.device=null;this.mode='Canvas 2D';this.dirty=true;
  D.emit('gpu-ready',{mode:this.mode,reason});this.loop(0);
 }
 resize(){const r=this.canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.5);const w=Math.max(8,Math.min(1536,Math.round(r.width*dpr)));const h=Math.max(8,Math.min(1536,Math.round(r.height*dpr)));if(this.canvas.width===w&&this.canvas.height===h&&(!this.device||this.texture))return;this.canvas.width=w;this.canvas.height=h;if(!this.device)return;
  this.texture?.destroy();this.texture=this.device.createTexture({label:'Computed aurora texture',size:[w,h],format:'rgba8unorm',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});
  this.cb=this.device.createBindGroup({layout:this.cp.getBindGroupLayout(0),entries:[{binding:0,resource:this.texture.createView()},{binding:1,resource:{buffer:this.ub}}]});
  this.rb=this.device.createBindGroup({layout:this.rp.getBindGroupLayout(0),entries:[{binding:0,resource:this.texture.createView()},{binding:1,resource:this.sampler}]});
 }
 drawGPU(){const w=this.canvas.width,h=this.canvas.height;this.uniform.set([w,h,this.time,D.store.data.prefs.palette,...this.pointer,1,0]);this.device.queue.writeBuffer(this.ub,0,this.uniform);const enc=this.device.createCommandEncoder();const c=enc.beginComputePass();c.setPipeline(this.cp);c.setBindGroup(0,this.cb);c.dispatchWorkgroups(Math.ceil(w/8),Math.ceil(h/8));c.end();const r=enc.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});r.setPipeline(this.rp);r.setBindGroup(0,this.rb);r.draw(3);r.end();this.device.queue.submit([enc.finish()]);}
 draw2D(){const c=this.ctx,w=this.canvas.width,h=this.canvas.height,t=this.time*.1;const palettes=[['#070e2a','#483368','#ed9b8d'],['#041f28','#14615f','#bbe099'],['#240c18','#923844','#ffb277'],['#071830','#265180','#9bc8fa']];const colors=palettes[D.store.data.prefs.palette|0]||palettes[0];const g=c.createLinearGradient(0,0,w*.3,h);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);c.fillStyle=g;c.fillRect(0,0,w,h);
  for(let layer=30;layer>=0;layer--){const a=layer/30;const shift=Math.sin(t*.7)*h*.035;c.beginPath();c.moveTo(-30,h*.48+shift);c.bezierCurveTo(w*.30,h*(1.1-a*.025),w*.54,-h*.16,w+30,h*.70+shift);c.lineTo(w+30,h+1);c.lineTo(-30,h+1);c.closePath();c.fillStyle=colors[2];c.globalAlpha=.014+(1-a)*.006;c.fill();}c.globalAlpha=1;
  const shade=c.createRadialGradient(w*.48,h*.4,0,w*.48,h*.4,w*.85);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#000000aa');c.fillStyle=shade;c.fillRect(0,0,w,h);
 }
 loop(ts){if(this.disposed)return;this.frame=requestAnimationFrame(t=>this.loop(t));const reduced=D.store.data.prefs.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;const need=this.dirty||(!this.paused&&!reduced&&ts-this.last>1000/30);if(document.hidden||!need)return;this.time+=this.last?Math.min((ts-this.last)/1000,.1):0;this.last=ts;
  try{if(this.dirty)this.resize();this.device?this.drawGPU():this.draw2D();this.dirty=false;}catch(e){this.fallback(e.message);}
 }
 invalidate(){this.dirty=true;}
 dispose(){this.disposed=true;this.pointerTarget.removeEventListener('pointermove',this.onPointer);cancelAnimationFrame(this.frame);this.ro.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.context?.unconfigure?.();this.texture?.destroy();this.ub?.destroy();this.device?.destroy();}
}
D.GPUBackdrop=GPUBackdrop;D.shaders={compute,present};
})(window.Duo);
