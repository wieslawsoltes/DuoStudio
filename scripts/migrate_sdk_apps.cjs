const fs=require('fs'),path=require('path'),ts=require(process.env.DUOKIT_TYPESCRIPT || 'typescript'),acorn=require('../vendor/acorn.js');
const root=path.resolve(__dirname,'..');
function walk(n,fn){if(!n||typeof n!=='object')return;if(n.type)fn(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(n=>walk(n,fn));else if(v&&typeof v==='object')walk(v,fn);}
for(const name of fs.readdirSync(root+'/src/apps'))if(name.endsWith('.js')){
 const p=root+'/src/apps/'+name;let source=fs.readFileSync(p,'utf8').replaceAll('D.register(', 'D.SDK.register(').replaceAll('S.document(ctx,','ctx.document(').replaceAll('S.surface(', 'D.SDK.createSurface('),edits=[];
 walk(acorn.parse(source,{ecmaVersion:'latest'}),n=>{if(n.type==='CallExpression'&&n.callee?.property?.name==='register'&&n.callee?.object?.property?.name==='SDK'){
  const arg=n.arguments[1];if(arg.type==='ArrowFunctionExpression'||arg.type==='FunctionExpression'){edits.push([arg.start,'D.SDK.UIViewRepresentable('],[arg.end,')']);}
 }});for(const[index,text]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,index)+text+source.slice(index);fs.writeFileSync(p,source);
}
function stable(source){return JSON.stringify(acorn.parse(source,{ecmaVersion:'latest'}),(k,v)=>['start','end','loc','raw'].includes(k)?undefined:v);}
const paths=[];for(const dir of ['src/apps'])for(const file of fs.readdirSync(root+'/'+dir))if(file.endsWith('.js'))paths.push(dir+'/'+file);
for(const file of paths){const p=root+'/'+file,source=fs.readFileSync(p,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const next=ts.createPrinter({newLine:ts.NewLineKind.LineFeed}).printFile(tree);if(stable(source)!==stable(next))throw Error('Formatter changed AST: '+file);fs.writeFileSync(p,next);}
console.log('Readable formatting with verified Acorn AST equivalence:',paths.length,'files; TypeScript',ts.version);
