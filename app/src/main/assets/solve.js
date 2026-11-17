/* solve.js - offline calculator. Reads a question, finds the right formula in kb.js, calculates and writes the solution lines.
   Rule based (no AI): it only answers what its formula book and maths routines cover, otherwise it returns null. */
(function(G){'use strict';
const QA=G.QA,E=QA.E,fmt=E.fmt,nice=E.nice;
const Z9=[0,0,0,0,0,0,0,0,0];

/* ================= text helpers ================= */
const STOP=new Set('of the a an in at on to is are was were be by for with and or its their his her from as that this it if when then find calculate determine what how much many'.split(' '));
const SYN={speed:'velocity',displacement:'distance',retardation:'acceleration',deceleration:'acceleration',resistor:'resistance',capacitor:'capacitance',inductor:'inductance',thickness:'distance',initially:'initial',finally:'final',originally:'original',previously:'previous',lowest:'lower',highest:'higher'};
const stem=w=>{w=SYN[w]||w;if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss')&&!w.endsWith('us'))w=w.slice(0,-1);return w};
const toks=s=>String(s).toLowerCase().replace(/[^a-z0-9%'+\-]+/g,' ').split(' ').filter(w=>w&&!STOP.has(w)&&w.length>1&&!/^[0-9.]+$/.test(w)).map(stem);
const SUPD={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
function normText(t){
  t=String(t||'').replace(/\r/g,'\n').replace(/[−–—]/g,'-').replace(/[×✕✖]/g,'x').replace(/[·⋅]/g,'*').replace(/[μµ]/g,'μ')
   .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)/g,(m,s)=>'^'+s.split('').map(c=>SUPD[c]).join(''))
   .replace(/½/g,'0.5').replace(/¼/g,'0.25').replace(/¾/g,'0.75').replace(/Ω/g,' ohm')
   .replace(/\b\d{1,3}(?:,\d{2,3})*,\d{3}\b/g,m=>m.replace(/,/g,''))
   .replace(/\b(?:Rs|INR)\.?\s*(\d+(?:\.\d+)?)/gi,'$1 Rs').replace(/₹\s*(\d+(?:\.\d+)?)/g,'$1 Rs').replace(/\$\s*(\d+(?:\.\d+)?)/g,'$1 USD')
   .replace(/\b(\d+)(?:st|nd|rd|th)\s+(term|second|member)\b/gi,'nth $2 (n = $1)').replace(/\b(\d+)(?:st|nd|rd|th)\b/g,'$1')
   .replace(/\b([a-zA-Z]+)\/s2\b/g,'$1/s^2').replace(/\bm\s*s-2\b/g,'m/s^2').replace(/\bm\s*s-1\b/g,'m/s')
   .replace(/(\d)\s*x\s*10\s*(-\d+)/g,'$1 x 10^$2')   // a photo/OCR drops the raised minus: 4x10-7 means 4 x 10^-7
   .replace(/\b10\s*(-\d{1,3})\s*(?=[A-Za-z])/g,'10^$1 ')  // 10-34 m
   .replace(/Δ\s*([A-Za-z])/g,'d$1');
  return t}
const GR={'θ':'theta','λ':'lambda','μ':'mu','ρ':'rho','σ':'sigma','ω':'omega','α':'alpha','β':'beta','φ':'phi','η':'eta','τ':'tau','ε':'eps','π':'pi','γ':'gamma','δ':'delta'};

/* ================= reading numbers with units ================= */
function grabUnit(rest){
  let best=null;
  const m2=/^\s?([A-Za-z]+)\s+per\s+([A-Za-z]+)/.exec(rest);
  if(m2){const u=E.parseUnit(m2[1]+'/'+m2[2]);if(u)best={u,text:m2[1]+'/'+m2[2],len:m2[0].length}}
  if(!best){
    const m=/^\s?([A-Za-zμΩ°%℃][A-Za-z0-9μΩ°%℃\/^*.\-]*)/.exec(rest);if(!m)return null;
    const tok=m[1];
    const t=tok.replace(/[.\-*\/^]+$/,''),u=t?E.parseUnit(t):null;if(u)best={u,text:t,len:m[0].length-(tok.length-t.length)}}
  if(!best)return null;
  for(let i=0;i<2;i++){ // units written in pieces: "J/kg K", "N m", "kg m/s"
    const mm=/^\s([A-Za-z]{1,4}(?:\^-?\d)?(?:\/[A-Za-z]{1,4}(?:\^-?\d)?)?)(?![A-Za-z0-9])/.exec(rest.slice(best.len));
    if(!mm||!E.parseUnit(mm[1]))break;
    const cand=best.text+' '+mm[1],u=E.parseUnit(cand);if(!u)break;
    best={u,text:cand,len:best.len+mm[0].length}}
  return best}
const NUMRE=/(?<![A-Za-z0-9_.])([-+]?)(\d+(?:\.\d+)?|\.\d+)(?:\s*(?:x|\*)\s*10\s*\^\s*\(?([-+]?\d+)\)?)?(?:[eE]([-+]?\d+)(?![A-Za-z]))?/g;
function mentions(t){
  const raw=[];NUMRE.lastIndex=0;let m;
  while((m=NUMRE.exec(t))){
    let v=parseFloat(m[2]);if(m[3]!==undefined)v*=Math.pow(10,+m[3]);else if(m[4]!==undefined)v*=Math.pow(10,+m[4]);
    let end=m.index+m[0].length;
    const pw=/^\s*\^\s*\(?([-+]?\d+)\)?/.exec(t.slice(end));
    if(m[2]==='10'&&pw&&m[3]===undefined){v=Math.pow(10,+pw[1]);end+=pw[0].length}
    if(m[1]==='-')v=-v;
    const un=grabUnit(t.slice(end));
    raw.push({v,u:un?un.u:null,utext:un?un.text:'',pos:m.index,end:un?end+un.len:end});
    NUMRE.lastIndex=Math.max(NUMRE.lastIndex,raw[raw.length-1].end)}
  const CONJ=/\b(?:and|but|while|whereas|then)\b|[,;]/gi;
  const lastClause=g=>{g=g.split(/[.?!]\s|\n/).pop();let k=-1,mm;CONJ.lastIndex=0;while((mm=CONJ.exec(g)))k=mm.index+mm[0].length;return k<0?g:g.slice(k)};
  const firstClause=g=>{g=g.split(/[.?!]\s|\n/)[0];const mm=/\b(?:and|but|while|whereas|then)\b|[,;]/i.exec(g);return mm?g.slice(0,mm.index):g};
  const out=raw.map((r,i)=>{
    const lo=i?raw[i-1].end:Math.max(0,r.pos-90),hi=i<raw.length-1?raw[i+1].pos:Math.min(t.length,r.end+70);
    const gapB=t.slice(Math.max(lo,r.pos-90),r.pos),gapA=t.slice(r.end,Math.min(hi,r.end+70));
    const pre=/(?:^|[\s,;(])([A-Za-z][A-Za-z0-9_]{0,4}|[θλμρσωαβφητεπγδ])\s*=\s*$/.exec(t.slice(Math.max(0,r.pos-12),r.pos));
    const before=toks(lastClause(gapB)).reverse().slice(0,9);
    const lead=t.slice(Math.max(0,r.pos-8),r.pos);
    if(/\bfrom\s*$/i.test(lead))before.unshift('initial','original','old','previous','base','opening');else if(/\bto\s*$/i.test(lead)&&/\bfrom\b/i.test(t.slice(Math.max(0,r.pos-45),r.pos)))before.unshift('final','new','current','closing');
    return{v:r.v,u:r.u,utext:r.utext,pos:r.pos,end:r.end,sym:pre?(GR[pre[1]]||pre[1]):null,before,after:toks(firstClause(gapA)).slice(0,6),raw:t.slice(r.pos,r.end).trim()}})
  // "the cathode and anode are 0.34 V and -0.76 V": values in the same order as the labels before them
  for(let i=0;i<raw.length;){let j=i;
    while(j+1<raw.length&&/^\s*(?:,|and|&)?\s*$/i.test(t.slice(raw[j].end,raw[j+1].pos)))j++;
    const n=j-i+1;
    if(n>=2){const lead=t.slice(Math.max(0,raw[i].pos-110),raw[i].pos).split(/[.?!]\s|\n/).pop(),cl=lead.split(/\band\b|,|&/i).map(x=>x.trim()).filter(Boolean);
      if(cl.length>=n&&out.slice(i,j+1).every(m=>!m.sym)){const use=cl.slice(cl.length-n);use.forEach((c,k)=>{out[i+k].before=toks(c).reverse().slice(0,9);out[i+k].after=[]})}}
    i=j+1}
  return out}

/* ================= formula book ================= */
let KB=null;
function loadKB(){
  if(KB)return KB;KB=[];
  QA.KB.split('\n').forEach(line=>{
    line=line.trim();if(!line||line[0]==='#')return;
    const c=line.split('|');if(c.length<4)return;
    const f={id:KB.length,sub:c[0],name:c[1],vars:[],by:{},kw:[],flags:[]};
    c[3].split(';').forEach(v=>{
      const p=v.split('~'),labels=p[1].split('/').map(s=>s.trim()),ut=p[2].trim();
      const u=ut==='1'||ut==='*'?{d:Z9.slice(),f:1}:E.parseUnit(ut);
      if(!u)throw new Error('kb unit '+ut+' in '+f.name);
      const o={sym:p[0].trim(),labels,label:labels[0],ut,u,any:ut==='*',def:p[3]!==undefined&&p[3]!==''?parseFloat(p[3]):undefined,toks:labels.map(toks).filter(a=>a.length),
        diff:/change|rise|increase|difference|elongation|extension|expansion|elevation|depression/.test(p[1])};
      f.vars.push(o);f.by[o.sym]=o});
    const eq=c[2].split('=');f.eq=c[2];f.L=E.parse(eq[0],'f');f.R=E.parse(eq[1],'f');f.nameT=toks(f.name);
    f.req=[];(c[4]||'').split(',').forEach(k=>{k=k.trim().toLowerCase();if(!k)return;if(k[0]==='@')f.flags.push(k.slice(1));else if(k[0]==='!')f.req.push(k.slice(1));else f.kw.push(k)});
    KB.push(f)});
  return KB}

/* ================= targets ("find the ...") ================= */
const GENERIC=new Set(['value','magnitude','amount','measure','result','answer']);
const STOP2=new Set('of if when for in at after from given using by on is are will has have so that which where and while with to than it its they then'.split(' '));
const ART=new Set('the its their an a his her this that each'.split(' '));
function targets(t){
  const out=[],re=/\b(find|calculate|determine|compute|evaluate|obtain|estimate|state|what(?:\s+(?:is|are|was|were|will\s+be|would\s+be|should\s+be|must\s+be))?|how\s+(?:much|many|long|far|fast|high|deep|heavy|large|big|tall|wide|old))\b/gi;
  let m;
  while((m=re.exec(t))){
    const head=m[1].toLowerCase().replace(/\s+/g,' ');let words=[];
    const rest=t.slice(m.index+m[0].length);
    if(head==='how long')words=['time'];else if(head==='how far')words=['distance'];else if(head==='how fast')words=['speed'];
    else if(head==='how high'||head==='how tall')words=['height'];else if(head==='how deep')words=['depth'];
    else if(head==='how heavy')words=['mass'];
    const ws=rest.replace(/^[\s:,-]+/,'').split(/\s+/);
    let i=0,got=[],long=[];
    while(i<ws.length&&ART.has(ws[i].toLowerCase()))i++;
    for(;i<ws.length&&got.length<6;i++){
      const w=ws[i],lw=w.toLowerCase().replace(/[^a-z0-9'+\-]/g,'');
      if(!lw)break;
      if(/[,.?;:()=]$/.test(w)){got.push(lw);i++;break}
      if(STOP2.has(lw)){
        if(GENERIC.has(got[got.length-1])&&lw==='of'){got=[];continue}
        if(lw==='of'){for(let j=i+1;j<ws.length&&long.length<3;j++){const x=ws[j],lx=x.toLowerCase().replace(/[^a-z0-9'+\-]/g,'');if(!lx||ART.has(lx))continue;if(STOP2.has(lx))break;long.push(lx);if(/[,.?;:()=]$/.test(x))break}}
        break}
      got.push(lw)}
    if(got.length&&GENERIC.has(got[got.length-1]))got.pop();
    const all=words.concat(got);
    if(all.length)out.push({phrase:toks(all.join(' ')),phrase2:toks(all.concat(long).join(' ')),raw:all.join(' '),sym:(ws[0]||'').replace(/[^A-Za-z0-9_]/g,'')})}
  return out}

/* ================= matching ================= */
const DISC=new Set(['initial','final','first','second','third','higher','lower','source','sink','primary','secondary','object','image','cathode','anode','original','new','old','current','previous','base','input','output','total','average','maximum','minimum']);
function ctxScore(m,v){
  let sc=0;if(m.sym&&m.sym===v.sym)sc+=8;
  let best=0;
  for(const lt of v.toks){let s=0;
    for(const t of lt){const w=DISC.has(t)?2:1;
      const ib=m.before.indexOf(t),ia=m.after.indexOf(t);
      if(ib>=0)s+=w*(ib<3?1.5:ib<6?1:0.5);
      if(ia>=0)s+=w*(ia<2?0.6:0.3)}
    best=Math.max(best,s/lt.length)}
  for(const lt of v.toks){const n=lt.length,rv=lt.slice().reverse();
    if(n&&m.before.length>=n&&rv.every((t,i)=>m.before[i]===t))sc+=2.4+0.4*Math.min(n,3);
    else if(n&&m.after.length>=n&&lt.every((t,i)=>m.after[i]===t))sc+=1.9+0.4*Math.min(n,3)}
  return sc+best*1.6}
function compat(m,v){
  if(v.any)return true;
  const vu=v.u,vl=!vu.d.some(x=>x);
  if(!m.u){if(m.sym===v.sym)return true;return vl&&!vu.ang&&!vu.pc}
  if(m.sym===v.sym&&!vu.ang)return E.sameDim(m.u,vu)||(vl&&!m.u.d.some(x=>x));
  if(!E.sameDim(m.u,vu))return false;
  if(!!m.u.ang!==!!vu.ang)return false;
  if(!!m.u.pc!==!!vu.pc&&!(m.u.pc&&vl&&!vu.ang)&&!(vu.pc&&!m.u.pc&&false))return false;
  return true}
function valueFor(m,v){
  if(!m.u)return m.v;
  if(v.diff&&(m.u.o!==undefined||v.u.o!==undefined)&&E.sameDim(m.u,v.u))return m.v*m.u.f/v.u.f;
  const r=E.convert(m.v,m.u,v.u);return r===null?m.v:r}
function sim(tp,v){ // how well a target phrase fits a variable's label
  if(!tp.length)return 0;let best=0;
  for(const lt of v.toks){const inter=tp.filter(t=>lt.includes(t)).length;if(!inter)continue;
    let s=inter/Math.min(tp.length,lt.length);if(inter===tp.length&&inter===lt.length)s+=0.3;
    const dtp=tp.filter(t=>DISC.has(t)),dlt=lt.filter(t=>DISC.has(t));
    if(dlt.length&&!dtp.some(t=>dlt.includes(t)))s-=0.35;
    best=Math.max(best,s)}
  return Math.max(0,Math.min(1.3,best))}

/* ---- things a question takes for granted ---- */
function implicit(v,T,g,chem){
  const L=v.labels.join('/');
  if(chem&&/molar mass|molecular mass|molecular weight|atomic mass|atomic weight|formula mass/.test(L))return chem.mass;
  if(/initial (velocity|speed)|velocity of projection/.test(L)&&/\b(from rest|starts? from rest|at rest|dropped|released|let go|falls?|starts? moving|begins to move|starting from rest)\b/.test(T))return 0;
  if(/final (velocity|speed)/.test(L)&&/\b(comes? to rest|come to rest|brought to rest|comes to a stop|stops?|stopped|comes to a halt|highest point|maximum height)\b/.test(T))return 0;
  if(/^acceleration$/.test(v.label)&&/\b(free fall|freely|dropped|gravity|falls?|falling|projectile|thrown)\b/.test(T))return/\bup(ward|wards)?\b|vertically up/.test(T)&&!/\bdown/.test(T)?-g:g;
  if(/initial angular velocity/.test(L)&&/\b(from rest|at rest)\b/.test(T))return 0;
  return undefined}

/* ---- candidate for one formula and one unknown ---- */
function tryFormula(f,tv,ctx){
  const need=f.vars.filter(v=>v!==tv);
  const opts=need.map(v=>{const a=[];ctx.M.forEach((m,i)=>{if(compat(m,v))a.push({i,s:ctxScore(m,v)})});a.sort((x,y)=>y.s-x.s);return a.slice(0,8)});
  const imp=need.map(v=>implicit(v,ctx.low,ctx.g,ctx.chem));
  const order=need.map((v,i)=>i).sort((a,b)=>(need[a].def!==undefined)-(need[b].def!==undefined)||opts[a].length-opts[b].length);
  let best=null,nodes=0;const used=new Set(),pick=new Array(need.length).fill(null);
  (function dfs(k,sc){
    if(++nodes>30000)return;
    if(k===order.length){
      let bonus=0;
      for(let a=0;a<need.length;a++)for(let b=a+1;b<need.length;b++)if(pick[a]!==null&&pick[b]!==null&&E.sameDim(need[a].u,need[b].u)&&pick[a]<pick[b])bonus+=0.15;
      if(!best||sc+bonus>best.sc)best={sc:sc+bonus,pick:pick.slice()};return}
    const vi=order[k],v=need[vi];
    for(const o of opts[vi]){
      if(used.has(o.i))continue;
      if(v.def!==undefined&&o.s<1.6&&ctx.M[o.i].sym!==v.sym&&!(ctx.M[o.i].u&&ctx.M[o.i].u.d.some(x=>x)))continue;
      if(imp[vi]!==undefined&&o.s<0.8&&ctx.M[o.i].sym!==v.sym)continue;
      used.add(o.i);pick[vi]=o.i;dfs(k+1,sc+o.s);used.delete(o.i);pick[vi]=null}
    if(v.def!==undefined)dfs(k+1,sc-0.3);
    else if(imp[vi]!==undefined)dfs(k+1,sc+0.2)
  })(0,0);
  if(!best)return null;
  const env={},given=[],defaults=[];
  let anyU=null,anyText='';
  need.forEach((v,i)=>{if(v.any&&best.pick[i]!==null&&!anyU){const m=ctx.M[best.pick[i]];if(m.u){anyU=m.u;anyText=m.utext}}});
  need.forEach((v,i)=>{
    const mi=best.pick[i];
    if(mi!==null){const m=ctx.M[mi];
      let val=valueFor(m,v);
      if(v.any){val=m.u&&anyU&&E.sameDim(m.u,anyU)?E.convert(m.v,m.u,anyU):m.v}
      env[v.sym]=val;given.push({v,m,val})}
    else if(imp[i]!==undefined){env[v.sym]=imp[i];given.push({v,m:null,val:imp[i],implied:true,note:ctx.chem&&imp[i]===ctx.chem.mass&&/molar|molecular|atomic|formula/.test(v.labels.join('/'))?'calculated from the formula '+ctx.chem.text:null})}
    else{env[v.sym]=v.def;defaults.push(v)}});
  return{f,tv,env,given,defaults,anyText,sc:best.sc,used:best.pick.filter(x=>x!==null)}}

/* ---- sign convention for mirrors and lenses ---- */
function signHook(f,env,T){
  if(f.flags.includes('mirror')||f.flags.includes('lens')){
    if(env.u!==undefined)env.u=-Math.abs(env.u);
    if(env.f!==undefined){
      const cv=/\bconvex\b/.test(T),cc=/\bconcave\b/.test(T),mir=f.flags.includes('mirror');
      if(cv||cc){const plus=mir?cv:cv;env.f=(plus?1:-1)*Math.abs(env.f)}}
    if(env.v!==undefined&&/\breal\b/.test(T)&&f.flags.includes('mirror'))env.v=-Math.abs(env.v)}}

/* ---- solve the equation for the unknown ---- */
function solveEq(f,tv,env){
  const x=tv.sym,iso=E.isolate(f.L,f.R,x);
  if(iso){const v=E.ev(iso,env);return{val:v,iso,vals:[v]}}
  let g=E.SUB(f.L,f.R);for(const k in env)g=E.sub1(g,k,E.N(env[k]));
  const pc=E.polyCoeffs(g,x,4);
  let roots=null;
  if(pc&&pc.length>1&&pc.length<=5){roots=E.polyRoots(pc).filter(r=>Math.abs(r[1])<1e-9).map(r=>r[0])}
  else roots=E.rootNum(t=>E.ev(g,{[x]:t}),true);
  roots=(roots||[]).filter(r=>isFinite(r));
  const pos=roots.filter(r=>r>1e-12);const use=(pos.length?pos:roots).sort((a,b)=>a-b);
  if(!use.length)return null;
  return{val:use[0],iso:null,vals:use,poly:pc}}

/* ---- friendly units (km/h instead of m/s when the question used km and h) ---- */
function friendly(tv,given){
  const ut=tv.ut;if(!/^[a-zA-Z0-9\/^* ]+$/.test(ut)||/[()]/.test(ut))return null;
  const map={};
  for(const g of given){if(!g.m||!g.m.u||g.m.utext==='')continue;
    const d=g.m.u.d,nz=d.map((x,i)=>x?i:-1).filter(i=>i>=0);
    if(nz.length===1&&!g.m.u.o&&Math.abs(d[nz[0]])===1){const t=g.m.utext.replace(/\^-1$/,'').replace(/^1\//,'');if(!/[\/\s]/.test(t))map[nz[0]]=t}}
  let changed=false;
  const nu=ut.replace(/\b(kg|m|s)\b/g,a=>{const i=['kg','m','s'].indexOf(a),dimIndex=[0,1,2][i];if(map[dimIndex]&&map[dimIndex]!==a){changed=true;return map[dimIndex]}return a});
  if(!changed)return null;
  const u2=E.parseUnit(nu);if(!u2)return null;return{text:nu,u:u2}}

const UPRETTY=(u)=>String(u).replace(/\^(-?\d+)/g,(m,a)=>E.sup(a)).replace(/\bohm\b/g,'Ω').replace(/\bdegC\b/g,'°C').replace(/\bdeg\b/g,'°').replace(/\bpercent\b/g,'%').replace(/\brs\b/g,'₹').replace(/\byr\b/g,'years').replace(/\bmu\b/g,'μ').replace(/^1$/,'');
function showVal(x){return fmt(x,6)}
function pretty(v){return E.dn(v.sym)}

/* ---- write the solution ---- */
function writeSolution(c,T,extra){
  const{f,tv,env,given,defaults}=c,lines=[];
  const fm=s=>E.str(s,{f:1}),vu=v=>v.any?(c.anyText||''):v.ut;
  const gl=given.filter(g=>!g.implied).map(g=>{
    const nm=pretty(g.v),orig=g.m.raw.replace(/\s*x\s*10\^/,' × 10^').replace(/\^(-?\d+)/g,(m,a)=>E.sup(a));
    const same=g.m.u&&Math.abs(g.m.u.f-g.v.u.f)<1e-12&&!g.m.u.o===!g.v.u.o;
    const conv=g.m.u&&!same&&!g.v.any?' = '+showVal(g.val)+' '+UPRETTY(vu(g.v)):'';
    return nm+' = '+orig+conv}).concat(given.filter(g=>g.implied).map(g=>pretty(g.v)+' = '+showVal(g.val)+' '+UPRETTY(vu(g.v))+' ('+(g.note||'from the question')+')'));
  if(extra&&extra.given)gl.push(...extra.given);
  if(gl.length)lines.push('Given: '+gl.join(', '));
  if(defaults.length)lines.push('Constants used: '+defaults.map(v=>pretty(v)+' = '+showVal(v.def)+' '+UPRETTY(vu(v))).join(', '));
  lines.push('To find: '+tv.label+' ('+pretty(tv)+')');
  lines.push('Formula: '+fm(f.L)+' = '+fm(f.R)+'   ['+f.name+']');
  const sol=c.sol,x=tv.sym;
  let subs;
  if(sol.iso){
    const lhsIsX=f.L.t==='v'&&f.L.n===x;
    const rear=E.simp(sol.iso);
    if(!lhsIsX)lines.push('Rearranging: '+pretty(tv)+' = '+fm(rear));
    let e=sol.iso;for(const k in env)e=E.sub1(e,k,E.N(env[k]));
    subs=E.str(e,{f:1});
    lines.push('Substituting: '+pretty(tv)+' = '+subs.replace(/\.?0+$/,m=>m));
  }else{
    let L2=f.L,R2=f.R;for(const k in env){L2=E.sub1(L2,k,E.N(env[k]));R2=E.sub1(R2,k,E.N(env[k]))}
    lines.push('Substituting: '+E.str(L2,{f:1})+' = '+E.str(R2,{f:1}));
    lines.push('Solving this equation for '+pretty(tv)+' gives '+sol.vals.map(showVal).join(' or ')+(sol.vals.length>1?' (the physically meaningful value is taken)':''))}
  const val=sol.val;let fr=null;
  if(!tv.any){const wm=/\b(?:in|into|express(?:ed)?\s+in)\s+([A-Za-zμΩ°%\/^0-9*]+(?:\s+per\s+[A-Za-z]+)?)\s*[.?)]?\s*$/i.exec(T.trim()),wu=wm&&E.parseUnit(wm[1]);
    if(wu&&E.sameDim(wu,tv.u)&&Math.abs(wu.f-tv.u.f)>1e-12)fr={text:wm[1].replace(/\s+per\s+/i,'/'),u:wu};
    else fr=friendly(tv,given)}
  let ans=showVal(val)+(vu(tv)==='1'||!vu(tv)?'':' '+UPRETTY(vu(tv)));
  if(fr){const v2=E.convert(val,tv.u,fr.u);if(v2!==null)ans=showVal(v2)+' '+UPRETTY(fr.text)+'  (= '+showVal(val)+' '+UPRETTY(tv.ut)+')'}
  if(tv.u.d[8]===1&&tv.u.d.every((x2,i)=>i===8||!x2)){const by=val/8;ans=showVal(val)+' bits = '+showVal(by)+' bytes = '+showVal(by/1024)+' KB = '+showVal(by/1048576)+' MB'}
  lines.push('Calculation: '+pretty(tv)+' = '+showVal(val)+' '+UPRETTY(vu(tv)));
  if(extra&&extra.after)lines.push(...extra.after);
  const art=/^(the|a|an)\b/.test(tv.label)?'':'the ';
  lines.push('Answer: '+(art==='the '?'The ':'')+tv.label+' is '+ans+'.');
  return{lines,ans:pretty(tv)+' = '+ans,num:val,unit:vu(tv),name:f.name,sub:f.sub}}

/* ---- main formula solver ---- */
function formulaSolve(text){
  const T=normText(text),low=T.toLowerCase();
  const M=mentions(T);if(!M.length)return null;
  const gm=M.find(m=>m.sym==='g'&&m.u&&E.sameDim(m.u,E.parseUnit('m/s^2')));
  const g=gm?gm.v*gm.u.f:9.8;
  const TG=targets(T);
  const kb=loadKB();
  const chem=QA.chem?QA.chem.find(T):null;
  // two temperatures given -> their difference is the temperature change
  const tm=M.filter(m=>m.u&&m.u.d[4]===1&&m.u.d.filter(x=>x).length===1);
  if(tm.length>=2){const a=tm[0],b=tm[1],dk=Math.abs(b.v*b.u.f+(b.u.o||0)-(a.v*a.u.f+(a.u.o||0)));
    M.push({v:dk,u:E.parseUnit('K'),utext:'K',pos:b.pos,end:b.end,sym:null,before:['rise','change','temperature'],after:[],raw:a.raw+' to '+b.raw,virtual:true})}
  const parts=TG.length?TG.slice(0,4):[null];
  const results=[],solved=new Set();
  for(const tg of parts){
    const ctx={M,low,g,chem};let best=null;
    for(const f of kb){
      const cand=[];
      if(tg){
        for(const v of f.vars){const tmm=tg.sym&&tg.sym===v.sym?1.3:Math.max(sim(tg.phrase,v),sim(tg.phrase2,v)+0.05);if(tmm>=0.5)cand.push({v,tmm})}
      }else{for(const v of f.vars)if(v.def===undefined)cand.push({v,tmm:0})}
      for(const{v,tmm}of cand){
        if(solved.has(f.id+':'+v.sym))continue;
        const c=tryFormula(f,v,ctx);if(!c)continue;
        const env=c.env;signHook(f,env,low);
        let sol;try{sol=solveEq(f,v,env)}catch(e){sol=null}
        if(!sol||!isFinite(sol.val))continue;
        const isU=m=>m.u&&(m.u.d.some(x=>x)||m.u.pc);
        const unitMs=M.filter(m=>!m.virtual&&isU(m)).length,plainMs=M.filter(m=>!m.virtual&&!isU(m)).length;
        const usedU=c.used.filter(i=>!M[i].virtual&&isU(M[i])).length,usedP=c.used.filter(i=>!M[i].virtual&&!isU(M[i])).length;
        const unusedU=Math.max(0,unitMs-usedU),unusedP=Math.max(0,plainMs-usedP);
        let kw=0;for(const k of f.kw)if(low.includes(k))kw++;
        const reqMiss=f.req.length&&!f.req.some(k=>low.includes(k));
        let nh=0;const tt=new Set(toks(low));for(const t of f.nameT)if(tt.has(t))nh++;
        let exact=0;for(const g2 of c.given)if(g2.m&&g2.m.u&&Math.abs(g2.m.u.f-g2.v.u.f)<1e-12&&E.sameDim(g2.m.u,g2.v.u))exact++;
        let score=(tg?6*tmm:0)+c.sc+1.5*Math.min(kw,3)+0.6*Math.min(nh,3)+((unitMs+0.5*plainMs)?3*(usedU+0.5*usedP)/(unitMs+0.5*plainMs):0)-0.7*unusedU-0.3*unusedP+0.25*exact-0.4*c.defaults.length+0.1*f.vars.length-(reqMiss?5:0);
        if(tg&&tmm<0.5)continue;
        if(!tg&&!(kw>0||c.used.length>=2))continue;
        if(tg&&v.toks.some(lt=>lt.includes('final')||lt.includes('second')||lt.includes('new')))score+=/\b(will|would|after|becomes?|new|now)\b/.test(low)?0.6:0.2;
        if(QA.Solver.debug)(QA.Solver.cands=QA.Solver.cands||[]).push({score:+score.toFixed(2),name:f.name,tv:v.sym,tmm:+tmm.toFixed(2),val:sol.val,given:c.given.map(g=>g.v.sym+'='+g.val+(g.m?' <'+g.m.raw+'>':'')).join(', '),ctx:+c.sc.toFixed(2),unused:unusedU});
        if(!best||score>best.score)best={score,c:Object.assign(c,{sol}),f,v}}}
    if(best&&best.score>=6.5&&best.c.used.length){
      solved.add(best.f.id+':'+best.v.sym);
      results.push({tg,best});
      // later parts may use this result
      const r=best.c.sol.val,tv=best.v;
      M.push({v:r*tv.u.f,u:tv.u,utext:tv.ut,pos:1e9,end:1e9,sym:tv.sym,before:toks(tv.labels.join(' ')),after:[],raw:showVal(r)+' '+tv.ut,virtual:true})}}
  if(!results.length)return null;
  const lines=[];let main=null;
  results.forEach((r,i)=>{
    const{best}=r,extra=lensExtra(best.c,low);
    const w=writeSolution(best.c,low,extra);if(!main)main=w;
    if(results.length>1)lines.push('Part '+(i+1)+':');
    lines.push(...w.lines.filter((l,j)=>results.length===1||j>=0));
    if(i<results.length-1)lines.push('')});
  return Object.assign({},main,{lines,topic:main.sub,all:results.map(r=>r.best.c.sol.val)})}

function lensExtra(c,T){
  const f=c.f;if(!(f.flags.includes('mirror')||f.flags.includes('lens')))return null;
  const e=c.env,x=c.tv.sym;const after=[];const given=[];
  const full={...e};full[x]=c.sol.val;
  const sg=['u','f'].filter(k=>e[k]!==undefined&&k!==x).map(k=>pretty(f.by[k])+' = '+showVal(e[k])+' cm');
  if(sg.length)given.push('(sign convention applied: '+sg.join(', ')+')');
  if(full.u!==undefined&&full.v!==undefined&&full.u!==0){
    const mir=f.flags.includes('mirror'),m=mir?-full.v/full.u:full.v/full.u;
    after.push('Magnification: m = '+(mir?'−v/u':'v/u')+' = '+showVal(m)+' ('+(m<0?'inverted':'erect')+', '+(Math.abs(m)>1?'enlarged':Math.abs(m)<1?'diminished':'same size')+')');
    const real=mir?full.v<0:full.v>0;
    after.push('Nature of the image: '+(real?'real':'virtual')+', '+(m<0?'inverted':'erect')+', '+(Math.abs(m)>1?'magnified':'diminished')+'.')}
  return{given,after}}

QA.Solver=Object.assign(QA.Solver||{},{normText,mentions,targets,toks,loadKB,formulaSolve,grabUnit,UPRETTY,showVal,_t:{tryFormula,sim,compat}});
if(typeof module!=='undefined')module.exports=QA.Solver;
})(typeof window!=='undefined'?window:globalThis);
