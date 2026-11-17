/* eng.js - tiny maths engine for the offline calculator: numbers, units, expressions, algebra, calculus. No internet, no AI. */
(function(G){'use strict';
const QA=G.QA=G.QA||{};

/* ================= numbers ================= */
const SUPM={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺'},SUBM={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
const sup=s=>String(s).replace(/[0-9+-]/g,c=>SUPM[c]),sub=s=>String(s).replace(/[0-9]/g,c=>SUBM[c]);
function fmt(x,sig){sig=sig||4;if(!isFinite(x))return'?';if(x===0)return'0';
  const a=Math.abs(x);
  if(a>=1e6||a<1e-3){const p=x.toExponential(sig-1).split('e');return String(parseFloat(p[0])).replace('-','−')+' × 10'+sup(parseInt(p[1],10))}
  return String(parseFloat(x.toPrecision(sig))).replace('-','−')}
function frac(x,maxQ){maxQ=maxQ||1000;if(!isFinite(x))return null;
  const sg=x<0?-1:1,v=Math.abs(x);let p0=0,q0=1,p1=1,q1=0,b=v;
  for(let i=0;i<25;i++){const a=Math.floor(b),p2=a*p1+p0,q2=a*q1+q0;if(q2>maxQ)break;p0=p1;q0=q1;p1=p2;q1=q2;
    if(Math.abs(v-p1/q1)<1e-9*Math.max(1,v))return[sg*p1,q1];const r=b-a;if(r<1e-12)break;b=1/r}
  return null}
function sqf(n){let s=1,r=n;for(let k=2;k*k<=r;k++){while(r%(k*k)===0){r/=k*k;s*=k}}return[s,r]}
// "nice" exact text for a decimal: 0.5 -> 1/2, 0.866 -> √3/2, 1.5708 -> π/2. null when nothing simple fits.
function nice(x){
  if(!isFinite(x))return null;if(Math.abs(x)<1e-12)return'0';
  let f=frac(x);if(f)return f[1]===1?String(f[0]).replace('-','−'):String(f[0]).replace('-','−')+'/'+f[1];
  f=frac(x/Math.PI,360);if(f&&f[0]!==0)return(Math.abs(f[0])===1?(f[0]<0?'−':''):String(f[0]).replace('-','−'))+'π'+(f[1]===1?'':'/'+f[1]);
  f=frac(x*x,400);
  if(f&&f[0]>0){const A=sqf(f[0]),B=sqf(f[1]),R=sqf(A[1]*B[1]),c=A[0]*R[0],den=B[0]*B[1];
    if(R[1]>1)return(x<0?'−':'')+(c>1?c:'')+'√'+R[1]+(den>1?'/'+den:'')}
  return null}
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);

/* ================= units ================= */
const DIMS=['kg','m','s','A','K','mol','cd','cur','bit'];
function dv(str){const d=[0,0,0,0,0,0,0,0,0];(str||'').split(' ').filter(Boolean).forEach(t=>{const m=t.match(/^([A-Za-z]+)(-?\d*)$/);d[DIMS.indexOf(m[1])]=m[2]===''?1:+m[2]});return d}
const AT={};
function atom(names,d,f,ex){names.split(' ').forEach(n=>{AT[n]=Object.assign({d:dv(d),f},ex||{})})}
atom('m metre metres meter meters','m',1);atom('g gram grams gm gms','kg',1e-3);atom('kg kilogram kilograms kgs','kg',1);
atom('s sec secs second seconds','s',1);atom('A amp amps ampere amperes','A',1);atom('K kelvin','K',1);atom('mol mole moles','mol',1);atom('cd','cd',1);
atom('N newton newtons','kg m s-2',1);atom('kgf','kg m s-2',9.80665);atom('dyne dynes','kg m s-2',1e-5);
atom('J joule joules','kg m2 s-2',1);atom('erg ergs','kg m2 s-2',1e-7);atom('cal calorie calories','kg m2 s-2',4.184);atom('eV','kg m2 s-2',1.602176634e-19);atom('kWh','kg m2 s-2',3.6e6);
atom('W watt watts','kg m2 s-3',1);atom('hp','kg m2 s-3',745.7);
atom('Pa pascal pascals','kg m-1 s-2',1);atom('atm','kg m-1 s-2',101325);atom('bar','kg m-1 s-2',1e5);atom('mmHg torr','kg m-1 s-2',133.322);atom('cmHg','kg m-1 s-2',1333.22);
atom('Hz hertz','s-1',1);atom('rpm','s-1',1/60);
atom('C coulomb coulombs','A s',1);atom('V volt volts','kg m2 s-3 A-1',1);atom('ohm ohms Ω','kg m2 s-3 A-2',1);
atom('F farad farads','kg-1 m-2 s4 A2',1);atom('H henry henries','kg m2 s-2 A-2',1);atom('T tesla teslas','kg s-2 A-1',1);atom('G gauss','kg s-2 A-1',1e-4);atom('Wb weber','kg m2 s-2 A-1',1);atom('S siemens','kg-1 m-2 s3 A2',1);
atom('L l litre litres liter liters dm3','m3',1e-3);atom('cc','m3',1e-6);
atom('min mins minute minutes','s',60);atom('h hr hrs hour hours','s',3600);atom('day days','s',86400);atom('yr yrs year years','s',3.15576e7);atom('month months','s',3.15576e7/12);atom('week weeks','s',604800);
atom('u amu','kg',1.66054e-27);atom('angstrom Å','m',1e-10);atom('inch inches','m',0.0254);atom('ft foot feet','m',0.3048);atom('mile miles','m',1609.344);
atom('tonne tonnes','kg',1000);atom('quintal','kg',100);atom('ha hectare','m2',1e4);
atom('M molar','mol m-3',1000);atom('molal','mol kg-1',1);
atom('% percent','',0.01,{pc:1});atom('deg degree degrees °','',1,{ang:1});atom('rad radian radians','',180/Math.PI,{ang:1});
atom('Rs rs ₹ rupee rupees INR $ dollar dollars USD','cur',1);
atom('bit bits','bit',1);atom('byte bytes B','bit',8);atom('KB KiB','bit',8*1024);atom('MB MiB','bit',8*1048576);atom('GB GiB','bit',8*1073741824);atom('TB TiB','bit',8*1099511627776);atom('Kb Kbit','bit',1024);atom('Mb Mbit','bit',1048576);atom('Gb Gbit','bit',1073741824);atom('bps','bit s-1',1);atom('Kbps','bit s-1',1000);atom('Mbps','bit s-1',1e6);atom('Gbps','bit s-1',1e9);
atom('dB decibel decibels BM beat beats px pixel pixels','',1);atom('D dioptre dioptres','m-1',1);atom('Bq becquerel','s-1',1);
atom('degC °C ℃ celsius','K',1,{o:273.15});atom('degF °F','K',5/9,{o:255.372});
const PRE={P:1e15,T:1e12,G:1e9,M:1e6,k:1e3,d:0.1,c:0.01,m:1e-3,u:1e-6,'µ':1e-6,'μ':1e-6,n:1e-9,p:1e-12,f:1e-15};
function atomOf(t){
  if(AT[t])return AT[t];
  if(t.length>1&&PRE[t[0]]&&AT[t.slice(1)]){const a=AT[t.slice(1)];if(!a.ang&&!a.pc&&a.d[7]===0&&a.d[8]===0&&!a.o)return Object.assign({},a,{f:a.f*PRE[t[0]]})}
  return null}
const ZERO=()=>[0,0,0,0,0,0,0,0,0];
function mulU(a,b,s){return{d:a.d.map((x,i)=>x+s*b.d[i]),f:+(s>0?a.f*b.f:a.f/b.f).toPrecision(15),o:a.o||b.o,ang:a.ang||b.ang,pc:a.pc||b.pc}}
function parseUnit(s){
  s=String(s||'').trim().replace(/([A-Za-z])-(?=[A-Za-z])/g,'$1*').replace(/\s+per\s+/gi,'/').replace(/[·⋅]/g,'*').replace(/⁻¹/g,'^-1').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\s*\^\s*/g,'^').replace(/\s*\/\s*/g,'/').replace(/\.+$/,'');
  if(!s||/^[0-9]/.test(s))return null;
  const t=s.match(/[()\/*]|[^\s()\/*]+/g)||[];let pos=0,bad=false;
  function walk(){let sg=1,r={d:ZERO(),f:1};
    while(pos<t.length&&!bad){const k=t[pos++];
      if(k===')')break;if(k==='/'){sg=-1;continue}if(k==='*')continue;
      let a;
      if(k==='(')a=walk();
      else{const m=k.match(/^([^\d^\-]+)(?:\^?(-?\d+))?$/);if(!m){bad=true;break}
        a=atomOf(m[1]);if(!a){bad=true;break}
        const e=m[2]?+m[2]:1;if(e!==1)a={d:a.d.map(x=>x*e),f:Math.pow(a.f,e),o:a.o,ang:a.ang,pc:a.pc}}
      r=mulU(r,a,sg)}
    return r}
  const r=walk();return bad||pos<t.length?null:r}
const sameDim=(a,b)=>a.d.every((x,i)=>x===b.d[i]);
// value in unit a -> value in unit b (null when the units are not the same kind)
function convert(v,a,b){if(!sameDim(a,b))return null;return((v*a.f+(a.o||0))-(b.o||0))/b.f}

/* ================= names ================= */
const GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',Delta:'Δ',epsilon:'ε',eps:'ε',theta:'θ',lambda:'λ',mu:'μ',nu:'ν',pi:'π',rho:'ρ',sigma:'σ',Sigma:'Σ',tau:'τ',phi:'φ',Phi:'Φ',omega:'ω',Omega:'Ω',eta:'η',chi:'χ',psi:'ψ',kappa:'κ'};
const SUBL={a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ'};
const SPEC={Pi:'π',RH:'R_H',E_emf:'E',hP:'h',cl:'c',kB:'k',kC:'k',qe:'e',Fc:'F',NA:'Nₐ',Rg:'R',Rgas:'R',kB:'k_B',kC:'k',eps0:'ε₀',mu0:'μ₀',Ee:'E',Ecell:'E_cell',Eo:'E°'};
function dn(n){
  if(SPEC[n])return SPEC[n];
  let m=n.match(/^([A-Za-z]+?)(\d+)$/);if(m&&(GREEK[m[1]]||m[1].length===1))return(GREEK[m[1]]||m[1])+sub(m[2]);
  m=n.match(/^([A-Za-z]+)_([A-Za-z0-9]+)$/);
  if(m){const b=GREEK[m[1]]||m[1],s=m[2];if(m[1]==='Delta')return'Δ'+s;
    return b+(/^\d+$/.test(s)?sub(s):s.split('').map(c=>SUBL[c]||c).join(''))}
  return GREEK[n]||n}

/* ================= expression trees ================= */
const N=v=>({t:'n',v}),V=n=>({t:'v',n}),ADD=(l,r)=>({t:'+',l,r}),SUB=(l,r)=>({t:'-',l,r}),MUL=(l,r)=>({t:'*',l,r}),DIV=(l,r)=>({t:'/',l,r}),POW=(l,r)=>({t:'^',l,r}),NEG=a=>({t:'neg',a}),FN=(n,a)=>({t:'f',n,a});
const FNAMES=['ceil','floor','round','sinh','cosh','tanh','asind','acosd','atand','arcsin','arccos','arctan','asin','acos','atan','sind','cosd','tand','cosec','sqrt','cbrt','log2','sin','cos','tan','sec','csc','cot','exp','ln','log','abs'];
const FALIAS={arcsin:'asin',arccos:'acos',arctan:'atan',csc:'cosec'},INVF={sin:'asin',cos:'acos',tan:'atan'};
function tokenize(s,mode){
  s=String(s).replace(/\*\*/g,'^').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[−–]/g,'-').replace(/²/g,'^2').replace(/³/g,'^3').replace(/π/g,'pi').replace(/√/g,'sqrt').replace(/[{[]/g,'(').replace(/[}\]]/g,')');
  const t=[];let i=0,m;
  while(i<s.length){
    const c=s[i];if(/\s/.test(c)){i++;continue}
    const rest=s.slice(i);
    if((m=/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest))){t.push({k:'n',v:parseFloat(m[0])});i+=m[0].length;continue}
    if((m=(mode==='m'?/^[A-Za-z]+/:/^[A-Za-z_][A-Za-z0-9_]*/).exec(rest))){
      let w=m[0];i+=w.length;
      if(mode==='m'){
        while(w){let f=FNAMES.find(n=>w.startsWith(n));
          if(f){t.push({k:'f',n:FALIAS[f]||f});w=w.slice(f.length)}
          else if(w.startsWith('pi')){t.push({k:'v',n:'pi'});w=w.slice(2)}
          else{t.push({k:'v',n:w[0]});w=w.slice(1)}}}
      else if(FNAMES.includes(w)&&s[i]==='(')t.push({k:'f',n:FALIAS[w]||w});
      else t.push({k:'v',n:w});
      continue}
    if(mode==='p'&&rest.startsWith('//')){t.push({k:'o',v:'//'});i+=2;continue}
    if('+-*/^(),='.includes(c)||(mode==='p'&&c==='%')){t.push({k:'o',v:c});i++;continue}
    if(c==='|'){t.push({k:'o',v:'|'});i++;continue}
    throw new Error('bad char '+c)}
  return t}
function parse(src,mode){
  mode=mode||'f';const tk=tokenize(src,mode);let p=0;
  const pk=()=>tk[p],nx=()=>tk[p++],isO=(k,v)=>k&&k.k==='o'&&k.v===v;
  const startsAtom=k=>k&&(k.k==='n'||k.k==='v'||k.k==='f'||isO(k,'('));
  function expr(){let l=term();for(;;){const k=pk();if(isO(k,'+')||isO(k,'-')){nx();const r=term();l=k.v==='+'?ADD(l,r):SUB(l,r)}else return l}}
  function term(){let l=unary();for(;;){const k=pk();
    if(isO(k,'*')||isO(k,'/')||isO(k,'//')||isO(k,'%')){nx();const r=unary();l=k.v==='*'?MUL(l,r):k.v==='/'?DIV(l,r):{t:k.v==='//'?'idiv':'mod',l,r}}
    else if(mode==='m'&&startsAtom(k)){l=MUL(l,unary())}
    else return l}}
  function unary(){const k=pk();if(isO(k,'-')){nx();return NEG(unary())}if(isO(k,'+')){nx();return unary()}return power()}
  function power(){const b=atom();if(isO(pk(),'^')){nx();const e=unary();return mode==='m'&&b.t==='v'&&b.n==='e'?FN('exp',e):POW(b,e)}return b}
  function lite(){let ng=false;if(isO(pk(),'-')){nx();ng=true}
    let l=power();if(l.t==='n')while(pk()&&pk().k==='v')l=MUL(l,power());return ng?NEG(l):l}
  function atom(){
    const k=nx();if(!k)throw new Error('unexpected end');
    if(k.k==='n')return N(k.v);
    if(k.k==='v')return V(k.n);
    if(isO(k,'(')){const e=expr();if(!isO(nx(),')'))throw new Error('missing )');return e}
    if(isO(k,'|')){const e=expr();if(!isO(nx(),'|'))throw new Error('missing |');return FN('abs',e)}
    if(k.k==='f'){let name=k.n,ex=null;
      if(mode==='m'&&isO(pk(),'^')){nx();ex=unary();if(ex.t==='neg'&&ex.a.t==='n'&&ex.a.v===1&&INVF[name]){name=INVF[name];ex=null}}
      let a;
      if(isO(pk(),'(')){nx();a=expr();if(!isO(nx(),')'))throw new Error('missing )')}
      else if(mode==='m')a=lite();else throw new Error('function needs (');
      const r=FN(name,a);return ex?POW(r,ex):r}
    throw new Error('bad token')}
  const e=expr();if(p<tk.length)throw new Error('extra input');return e}

const FUN={sqrt:Math.sqrt,cbrt:Math.cbrt,ln:Math.log,log:Math.log10,log2:Math.log2,exp:Math.exp,sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,abs:Math.abs,
  sind:x=>Math.sin(x*Math.PI/180),cosd:x=>Math.cos(x*Math.PI/180),tand:x=>Math.tan(x*Math.PI/180),asind:x=>Math.asin(x)*180/Math.PI,acosd:x=>Math.acos(x)*180/Math.PI,atand:x=>Math.atan(x)*180/Math.PI,
  sec:x=>1/Math.cos(x),cosec:x=>1/Math.sin(x),cot:x=>1/Math.tan(x),ceil:Math.ceil,floor:Math.floor,round:Math.round};
function ev(n,env){
  switch(n.t){
    case'n':return n.v;
    case'v':{const v=env&&env[n.n];if(v!==undefined)return v;if(n.n==='pi')return Math.PI;if(n.n==='e')return Math.E;throw new Error('unbound '+n.n)}
    case'+':return ev(n.l,env)+ev(n.r,env);case'-':return ev(n.l,env)-ev(n.r,env);
    case'*':return ev(n.l,env)*ev(n.r,env);case'/':return ev(n.l,env)/ev(n.r,env);
    case'^':return Math.pow(ev(n.l,env),ev(n.r,env));case'neg':return-ev(n.a,env);
    case'idiv':return Math.floor(ev(n.l,env)/ev(n.r,env));case'mod':{const a=ev(n.l,env),b=ev(n.r,env);return((a%b)+b)%b}
    case'f':return FUN[n.n](ev(n.a,env))}
  throw new Error('bad node')}
function vars(n,s){s=s||new Set();
  if(n.t==='v'){if(n.n!=='pi'&&n.n!=='e')s.add(n.n)}else for(const k of['l','r','a'])if(n[k])vars(n[k],s);return s}
function count(n,x){return n.t==='v'?(n.n===x?1:0):(n.l?count(n.l,x):0)+(n.r?count(n.r,x):0)+(n.a?count(n.a,x):0)}
const has=(n,x)=>count(n,x)>0;
const isNum=n=>n.t==='n';
function sub1(n,x,r){if(n.t==='v')return n.n===x?r:n;const o=Object.assign({},n);for(const k of['l','r','a'])if(n[k])o[k]=sub1(n[k],x,r);return o}

/* ---- simplifier ---- */
function simp(n){
  switch(n.t){
    case'n':case'v':return n;
    case'neg':{const a=simp(n.a);return a.t==='n'?N(-a.v):a.t==='neg'?a.a:simpSum(NEG(a))}
    case'+':case'-':return simpSum(n);
    case'*':case'/':return simpMul(n);
    case'^':{const l=simp(n.l),r=simp(n.r);
      if(r.t==='n'){if(r.v===1)return l;if(r.v===0)return N(1);if(l.t==='n'&&(Number.isInteger(r.v)||l.v>0))return N(Math.pow(l.v,r.v))}
      if(l.t==='n'&&l.v===1)return N(1);
      if(l.t==='v'&&l.n==='e')return FN('exp',r);
      if(l.t==='^'&&r.t==='n'&&l.r.t==='n')return simp(POW(l.l,N(l.r.v*r.v)));
      return POW(l,r)}
    case'f':{const a=simp(n.a);
      if(a.t==='n'){const v=FUN[n.n](a.v);if(Number.isInteger(v)||(isFinite(v)&&nice(v)&&/^\d+\/\d+$/.test(nice(v))&&n.n!=='sqrt'))return N(v)}
      if(n.n==='ln'&&a.t==='v'&&a.n==='e')return N(1);
      if(n.n==='exp'&&a.t==='n'&&a.v===0)return N(1);
      return FN(n.n,a)}}
  return n}
function coefOf(n){
  if(n.t==='n')return[n.v,null];
  if(n.t==='neg'){const a=coefOf(n.a);return[-a[0],a[1]]}
  if(n.t==='*'){const a=coefOf(n.l),b=coefOf(n.r);return[a[0]*b[0],a[1]&&b[1]?MUL(a[1],b[1]):(a[1]||b[1])]}
  return[1,n]}
function flatSum(n,s,out){
  if(n.t==='+'){flatSum(n.l,s,out);flatSum(n.r,s,out)}
  else if(n.t==='-'){flatSum(n.l,s,out);flatSum(n.r,-s,out)}
  else if(n.t==='neg')flatSum(n.a,-s,out);
  else{const m=simpMulKeep(n);if(m.t==='+'||m.t==='-'||m.t==='neg')flatSum(m,s,out);else{const c=coefOf(m);out.push([c[0]*s,c[1]])}}}
const simpMulKeep=n=>n.t==='*'||n.t==='/'?simpMul(n):(n.t==='^'||n.t==='f'?simp(n):n);
function simpSum(n){
  const out=[];flatSum(n,1,out);const map=new Map(),ord=[];
  for(const[c,r]of out){const k=r?str(r,{f:1,raw:1}):'';if(!map.has(k)){map.set(k,{c:0,r});ord.push(k)}map.get(k).c+=c}
  const ts=ord.map(k=>map.get(k)).filter(t=>Math.abs(t.c)>1e-12);
  const cst=ts.filter(t=>!t.r),oth=ts.filter(t=>t.r);
  const all=oth.concat(cst);if(!all.length)return N(0);
  let res=null;
  for(const t of all){
    let node=t.r?(Math.abs(t.c-1)<1e-12?t.r:(Math.abs(t.c+1)<1e-12?NEG(t.r):MUL(N(t.c),t.r))):N(t.c);
    if(!res)res=node;
    else if(node.t==='n'&&node.v<0)res=SUB(res,N(-node.v));
    else if(node.t==='neg')res=SUB(res,node.a);
    else if(node.t==='*'&&node.l.t==='n'&&node.l.v<0)res=SUB(res,MUL(N(-node.l.v),node.r));
    else res=ADD(res,node)}
  return res}
function facs(n,e,o){
  if(n.t==='*'){facs(n.l,e,o);facs(n.r,e,o)}
  else if(n.t==='/'){facs(n.l,e,o);facs(n.r,-e,o)}
  else if(n.t==='neg'){o.c*=-1;facs(n.a,e,o)}
  else if(n.t==='n')o.c*=Math.pow(n.v,e);
  else if(n.t==='^'&&n.r.t==='n'){const b=simp(n.l);if(b.t==='n')o.c*=Math.pow(b.v,e*n.r.v);else o.l.push({b,e:e*n.r.v})}
  else{const q=simp(n);if(q.t==='n')o.c*=Math.pow(q.v,e);else if(q.t==='*'||q.t==='/'||q.t==='neg')facs(q,e,o);else o.l.push({b:q,e})}}
const rank=b=>b.t==='v'||(b.t==='^'&&b.l.t==='v')?0:b.t==='f'?2:1;
function simpMul(n){
  const o={c:1,l:[]};facs(n,1,o);const g=new Map(),ord=[];
  for(const f of o.l){const k=str(f.b,{f:1,raw:1});if(!g.has(k)){g.set(k,{b:f.b,e:0});ord.push(k)}g.get(k).e+=f.e}
  if(o.c===0)return N(0);
  const num=[],den=[];
  ord.map((k,i)=>[g.get(k),i]).sort((p,q)=>rank(p[0].b)-rank(q[0].b)||p[1]-q[1]).forEach(([{b,e}])=>{if(Math.abs(e)<1e-12)return;
    const a=Math.abs(e),node=Math.abs(a-1)<1e-12?b:POW(b,N(a));(e>0?num:den).push(node)});
  let c=o.c,dn0=null;
  if(!Number.isInteger(c)){const fr=frac(c,100);if(fr&&fr[1]>1){c=fr[0];dn0=N(fr[1])}}
  let top=num.length?num.reduce((x,y)=>MUL(x,y)):null;
  if(!top)top=N(c);else if(Math.abs(c-1)>1e-12)top=Math.abs(c+1)<1e-12?NEG(top):MUL(N(c),top);
  const ds=(dn0?[dn0]:[]).concat(den);
  if(!ds.length)return top;
  return DIV(top,ds.reduce((x,y)=>MUL(x,y)))}

/* ---- printing ---- */
function numS(v,o){
  if(Number.isInteger(v)&&Math.abs(v)<1e15)return String(v);
  if(o&&o.raw)return String(v);
  return fmt(v,6)}
function isHalf(e){return(e.t==='n'&&e.v===0.5)||(e.t==='/'&&e.l.t==='n'&&e.l.v===1&&e.r.t==='n'&&e.r.v===2)}
function isThird(e){return e.t==='/'&&e.l.t==='n'&&e.l.v===1&&e.r.t==='n'&&e.r.v===3}
function atomic(n){return n.t==='v'||(n.t==='n'&&n.v>=0)}
function P(n,pr,o){
  let s,my=9;
  switch(n.t){
    case'n':s=numS(n.v,o);if(n.v<0)my=1.5;break;
    case'v':s=o.raw?n.n:dn(n.n);break;
    case'neg':s='-'+P(n.a,1.9,o);my=1.6;break;
    case'+':{const r=n.r;s=r.t==='neg'?P(n.l,1,o)+' - '+P(r.a,1.1,o):(r.t==='n'&&r.v<0)?P(n.l,1,o)+' - '+numS(-r.v,o):P(n.l,1,o)+' + '+P(r,1.1,o);my=1;break}
    case'-':{const r=n.r;s=r.t==='neg'?P(n.l,1,o)+' + '+P(r.a,1.1,o):P(n.l,1,o)+' - '+P(r,1.1,o);my=1;break}
    case'*':s=mulS(n,o);my=2;break;
    case'/':s=P(n.l,1.4,o)+(o.f?' / ':'/')+P(n.r,2.1,o);my=2;break;
    case'^':s=powS(n,o);my=3;break;
    case'idiv':s=P(n.l,2,o)+' // '+P(n.r,2.1,o);my=2;break;case'mod':s=P(n.l,2,o)+' % '+P(n.r,2.1,o);my=2;break;
    case'f':s=fS(n,o);my=8;break}
  return my<pr?'('+s+')':s}
function flatMul(n,out){if(n.t==='*'){flatMul(n.l,out);flatMul(n.r,out)}else out.push(n);return out}
function mulS(n,o){
  const fs=flatMul(n,[]);
  if(!o.f&&fs[0].t==='n'&&!Number.isInteger(fs[0].v)){const fr=frac(fs[0].v,100);
    if(fr&&fr[1]>1){const rest=fs.slice(1).map(x=>P(x,2.05,o)).join('');return(Math.abs(fr[0])===1?(fr[0]<0?'-':''):fr[0])+rest+'/'+fr[1]}}
  let s='';
  fs.forEach((f,i)=>{const p=P(f,2.05,o);
    if(i){const prev=fs[i-1];
      if(o.f||f.t==='n')s+=' × ';
      else if(prev.t==='n')s+='';
      else if(prev.t==='v'&&f.t==='v')s+='';
      else s+=' '}
    s+=p});
  return s}
function powS(n,o){
  const b=n.l,e=n.r;
  if(!o.raw){
    if(isHalf(e))return'√'+(atomic(b)||b.t==='f'?P(b,9,o):'('+P(b,0,o)+')');
    if(isThird(e))return'∛'+(atomic(b)?P(b,9,o):'('+P(b,0,o)+')');
    if(b.t==='f'&&e.t==='n'&&Number.isInteger(e.v)&&e.v>0&&b.n!=='sqrt'&&b.n!=='exp'&&b.n!=='abs'){const f=P(b,0,o);const m=f.match(/^([^( ]+)([\s\S]*)$/);if(m)return m[1]+sup(e.v)+m[2]}
    if(e.t==='n'&&Number.isInteger(e.v)&&Math.abs(e.v)<=9)return P(b,3.5,o)+sup(e.v);
    if(e.t==='n'&&!Number.isInteger(e.v)){const fr=frac(e.v,20);if(fr)return P(b,3.5,o)+'^('+fr[0]+'/'+fr[1]+')'}
    if(e.t==='neg'&&e.a.t==='n'&&Number.isInteger(e.a.v)&&e.a.v<=9&&atomic(b))return P(b,3.5,o)+sup(-e.a.v)}
  return P(b,3.5,o)+'^'+(atomic(e)?P(e,9,o):'('+P(e,0,o)+')')}
const FDISP={asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹',sind:'sin',cosd:'cos',tand:'tan',asind:'sin⁻¹',acosd:'cos⁻¹',atand:'tan⁻¹'};
function fS(n,o){
  const a=n.a;
  if(n.n==='sqrt')return'√'+(atomic(a)?P(a,9,o):'('+P(a,0,o)+')');
  if(n.n==='cbrt')return'∛'+(atomic(a)?P(a,9,o):'('+P(a,0,o)+')');
  if(n.n==='abs')return'|'+P(a,0,o)+'|';
  if(n.n==='exp')return'e^'+(atomic(a)?P(a,9,o):'('+P(a,0,o)+')');
  const nm=o.raw?n.n:(FDISP[n.n]||n.n);
  if(n.n==='ln'&&a.t==='f'&&a.n==='abs')return'ln'+P(a,8,o);
  if(!o.f&&(atomic(a)||(a.t==='*'&&flatMul(a,[]).length===2&&a.l.t==='n'&&a.r.t==='v')))return nm+' '+P(a,a.t==='*'?2:9,o);
  return nm+'('+P(a,0,o)+')'}
function str(n,o){o=o||{};const s=P(n,0,o);return o.raw?s:s.replace(/-/g,'−')}

/* ---- derivative ---- */
function D(n,x){
  switch(n.t){
    case'n':return N(0);
    case'v':return N(n.n===x?1:0);
    case'neg':return NEG(D(n.a,x));
    case'+':return ADD(D(n.l,x),D(n.r,x));case'-':return SUB(D(n.l,x),D(n.r,x));
    case'*':return ADD(MUL(D(n.l,x),n.r),MUL(n.l,D(n.r,x)));
    case'/':return DIV(SUB(MUL(D(n.l,x),n.r),MUL(n.l,D(n.r,x))),POW(n.r,N(2)));
    case'^':{const u=n.l,v=n.r,hu=has(u,x),hv=has(v,x);
      if(!hv)return MUL(MUL(v,POW(u,SUB(v,N(1)))),D(u,x));
      if(!hu)return u.t==='v'&&u.n==='e'?MUL(n,D(v,x)):MUL(MUL(n,FN('ln',u)),D(v,x));
      return MUL(n,ADD(MUL(D(v,x),FN('ln',u)),DIV(MUL(v,D(u,x)),u)))}
    case'f':{const u=n.a,du=D(u,x);let r;
      switch(n.n){
        case'sin':r=FN('cos',u);break;case'cos':r=NEG(FN('sin',u));break;
        case'tan':r=POW(FN('sec',u),N(2));break;case'cot':r=NEG(POW(FN('cosec',u),N(2)));break;
        case'sec':r=MUL(FN('sec',u),FN('tan',u));break;case'cosec':r=NEG(MUL(FN('cosec',u),FN('cot',u)));break;
        case'ln':r=DIV(N(1),u);break;case'log':r=DIV(N(1),MUL(u,FN('ln',N(10))));break;
        case'exp':r=n;break;case'sqrt':r=DIV(N(1),MUL(N(2),n));break;
        case'asin':r=DIV(N(1),FN('sqrt',SUB(N(1),POW(u,N(2)))));break;
        case'acos':r=NEG(DIV(N(1),FN('sqrt',SUB(N(1),POW(u,N(2))))));break;
        case'atan':r=DIV(N(1),ADD(N(1),POW(u,N(2))));break;
        case'sinh':r=FN('cosh',u);break;case'cosh':r=FN('sinh',u);break;
        case'tanh':r=DIV(N(1),POW(FN('cosh',u),N(2)));break;
        case'abs':r=DIV(u,n);break;
        default:throw new Error('no derivative for '+n.n)}
      return MUL(r,du)}}
  throw new Error('bad node')}
const diff=(n,x)=>simp(D(n,x));

/* ---- polynomials by sampling ---- */
function polyCoeffs(n,x,maxD){
  maxD=maxD||6;const pts=[];for(let i=0;i<=maxD+1;i++)pts.push(i-Math.floor((maxD+1)/2)+0.5*(i%2));
  const ys=[];
  try{for(const p of pts){const y=ev(n,{[x]:p});if(!isFinite(y))return null;ys.push(y)}}catch(e){return null}
  for(let d=0;d<=maxD;d++){
    const m=d+1,A=pts.slice(0,m).map(p=>{const r=[];for(let k=0;k<m;k++)r.push(Math.pow(p,k));return r}),b=ys.slice(0,m),c=solveLin(A,b);
    if(!c)continue;
    let ok=true;for(let j=m;j<pts.length&&ok;j++){const y=c.reduce((s,ck,k)=>s+ck*Math.pow(pts[j],k),0);if(Math.abs(y-ys[j])>1e-7*Math.max(1,Math.abs(ys[j])))ok=false}
    if(ok){for(let k=0;k<c.length;k++){const r=Math.round(c[k]);if(Math.abs(c[k]-r)<1e-9)c[k]=r}
      while(c.length>1&&Math.abs(c[c.length-1])<1e-12)c.pop();return c}}
  return null}
function solveLin(A,b){
  const n=b.length,M=A.map((r,i)=>r.concat([b[i]]));
  for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;
    if(Math.abs(M[p][i])<1e-12)return null;[M[i],M[p]]=[M[p],M[i]];
    for(let r=0;r<n;r++)if(r!==i){const f=M[r][i]/M[i][i];for(let c=i;c<=n;c++)M[r][c]-=f*M[i][c]}}
  return M.map((r,i)=>r[n]/r[i])}
function polyRoots(c){ // complex roots (Durand-Kerner), c = [c0..cd]
  const d=c.length-1;if(d<1)return[];
  if(d===1)return[[-c[0]/c[1],0]];
  if(d===2){const D2=c[1]*c[1]-4*c[2]*c[0];
    if(D2>=0){const s=Math.sqrt(D2);return[[(-c[1]+s)/(2*c[2]),0],[(-c[1]-s)/(2*c[2]),0]]}
    const s=Math.sqrt(-D2);return[[-c[1]/(2*c[2]),s/(2*c[2])],[-c[1]/(2*c[2]),-s/(2*c[2])]]}
  const a=c.map(v=>v/c[d]);let z=[];for(let i=0;i<d;i++){const ang=2*Math.PI*i/d+0.4;z.push([Math.cos(ang)*(1+Math.abs(a[0])**(1/d)),Math.sin(ang)*(1+Math.abs(a[0])**(1/d))])}
  const cm=(p,q)=>[p[0]*q[0]-p[1]*q[1],p[0]*q[1]+p[1]*q[0]],cd=(p,q)=>{const m=q[0]*q[0]+q[1]*q[1];return[(p[0]*q[0]+p[1]*q[1])/m,(p[1]*q[0]-p[0]*q[1])/m]};
  for(let it=0;it<400;it++){let md=0;
    z=z.map((zi,i)=>{let val=[0,0];for(let k=d;k>=0;k--){val=cm(val,zi);val[0]+=a[k]}
      let den=[1,0];for(let j=0;j<d;j++)if(j!==i)den=cm(den,[zi[0]-z[j][0],zi[1]-z[j][1]]);
      const dl=cd(val,den);md=Math.max(md,Math.abs(dl[0])+Math.abs(dl[1]));return[zi[0]-dl[0],zi[1]-dl[1]]});
    if(md<1e-13)break}
  return z.map(r=>[Math.abs(r[0])<1e-9?0:r[0],Math.abs(r[1])<1e-9?0:r[1]])}

/* ---- solving an equation LHS = RHS for one variable ---- */
const INVFN={sqrt:a=>POW(a,N(2)),exp:a=>FN('ln',a),ln:a=>FN('exp',a),log:a=>POW(N(10),a),sin:a=>FN('asin',a),cos:a=>FN('acos',a),tan:a=>FN('atan',a),
  asin:a=>FN('sin',a),acos:a=>FN('cos',a),atan:a=>FN('tan',a),sind:a=>FN('asind',a),cosd:a=>FN('acosd',a),tand:a=>FN('atand',a),asind:a=>FN('sind',a),acosd:a=>FN('cosd',a),atand:a=>FN('tand',a)};
function isolate(L,R,x){
  const cl=count(L,x),cr=count(R,x);if(cl+cr!==1)return null;
  if(cr===1){const t=L;L=R;R=t}
  while(!(L.t==='v'&&L.n===x)){
    switch(L.t){
      case'+':if(has(L.l,x)){R=SUB(R,L.r);L=L.l}else{R=SUB(R,L.l);L=L.r}break;
      case'-':if(has(L.l,x)){R=ADD(R,L.r);L=L.l}else{R=SUB(L.l,R);L=L.r}break;
      case'*':if(has(L.l,x)){R=DIV(R,L.r);L=L.l}else{R=DIV(R,L.l);L=L.r}break;
      case'/':if(has(L.l,x)){R=MUL(R,L.r);L=L.l}else{R=DIV(L.l,R);L=L.r}break;
      case'^':if(has(L.l,x)){R=POW(R,DIV(N(1),L.r));L=L.l}else{R=DIV(FN('ln',R),FN('ln',L.l));L=L.r}break;
      case'neg':R=NEG(R);L=L.a;break;
      case'f':{const f=INVFN[L.n];if(!f)return null;R=f(R);L=L.a;break}
      default:return null}}
  return R}
// numeric root of g(t)=0 (positive roots preferred), scanning a wide range
function rootNum(g,pos){
  const xs=[];for(let e=-12;e<=12;e+=0.25){xs.push(Math.pow(10,e))}
  const all=pos?xs:xs.concat(xs.map(v=>-v)).sort((a,b)=>a-b),rs=[];
  let pv=null,pxv=null;
  for(const xv of all){let y;try{y=g(xv)}catch(e){y=NaN}
    if(isFinite(y)){if(pv!==null&&isFinite(pv)&&pv*y<0){let a=pxv,b=xv,fa=pv;for(let i=0;i<200;i++){const m=(a+b)/2,fm=g(m);if(fa*fm<=0)b=m;else{a=m;fa=fm}}rs.push((a+b)/2)}
      else if(y===0)rs.push(xv)}
    pv=y;pxv=xv}
  return rs}

/* ---- integration ---- */
function lin(u,x){const c=polyCoeffs(u,x,1);return c&&c.length===2&&Math.abs(c[1])>1e-12?{a:c[1],b:c[0]}:null}
function inv(n){ // a/b -> a*b^-1, sqrt(u) -> u^0.5 and merge nested powers (so integration rules can see them)
  if(n.t==='f'&&n.n==='sqrt')return inv(POW(n.a,N(0.5)));
  if(n.t==='/')return MUL(inv(n.l),inv(POW(n.r,N(-1))));
  const o=Object.assign({},n);for(const k of['l','r','a'])if(n[k])o[k]=inv(n[k]);
  if(o.t==='^'&&o.l.t==='^'&&o.r.t==='n'&&o.l.r.t==='n')return POW(o.l.l,N(o.l.r.v*o.r.v));
  return o}
function antiStd(n,x){
  // n depends on x; returns antiderivative or null
  if(n.t==='v')return DIV(POW(n,N(2)),N(2));
  if(n.t==='^'){
    const b=n.l,e=n.r;
    if(e.t==='n'){const c=e.v,l=lin(b,x);
      if(l){if(Math.abs(c+1)<1e-12)return DIV(FN('ln',FN('abs',b)),N(l.a));return DIV(POW(b,N(c+1)),N((c+1)*l.a))}
      if(b.t==='f'&&c===2){const u=b.a,l2=lin(u,x);
        if(l2){switch(b.n){
          case'sec':return DIV(FN('tan',u),N(l2.a));case'cosec':return DIV(NEG(FN('cot',u)),N(l2.a));
          case'sin':return SUB(DIV(u,N(2)),DIV(FN('sin',MUL(N(2),u)),N(4*l2.a)));
          case'cos':return ADD(DIV(u,N(2)),DIV(FN('sin',MUL(N(2),u)),N(4*l2.a)));
          case'tan':return DIV(SUB(FN('tan',u),u),N(l2.a))}}}
      return null}
    if(!has(b,x)&&b.t==='n'){const l=lin(e,x);if(l)return DIV(n,N(l.a*Math.log(b.v)))}
    return null}
  if(n.t==='f'){const u=n.a,l=lin(u,x);if(!l)return null;const a=N(l.a);
    switch(n.n){
      case'exp':return DIV(n,a);case'sin':return DIV(NEG(FN('cos',u)),a);case'cos':return DIV(FN('sin',u),a);
      case'tan':return DIV(NEG(FN('ln',FN('abs',FN('cos',u)))),a);case'cot':return DIV(FN('ln',FN('abs',FN('sin',u))),a);
      case'sec':return DIV(FN('ln',FN('abs',ADD(FN('sec',u),FN('tan',u)))),a);
      case'cosec':return DIV(FN('ln',FN('abs',SUB(FN('cosec',u),FN('cot',u)))),a);
      case'sinh':return DIV(FN('cosh',u),a);case'cosh':return DIV(FN('sinh',u),a);
      case'sqrt':return DIV(MUL(N(2/3),POW(u,N(1.5))),a);
      case'ln':return DIV(SUB(MUL(u,FN('ln',u)),u),a);
      case'atan':return DIV(SUB(MUL(u,FN('atan',u)),DIV(FN('ln',ADD(N(1),POW(u,N(2)))),N(2))),a);
      case'asin':return DIV(ADD(MUL(u,FN('asin',u)),FN('sqrt',SUB(N(1),POW(u,N(2))))),a)}}
  if(n.t==='*'&&n.l.t==='f'&&n.r.t==='f'){ // sec*tan, cosec*cot
    const a=n.l,b=n.r,l=lin(a.a,x);
    if(l&&str(a.a,{raw:1})===str(b.a,{raw:1})){
      if((a.n==='sec'&&b.n==='tan')||(a.n==='tan'&&b.n==='sec'))return DIV(FN('sec',a.a),N(l.a));
      if((a.n==='cosec'&&b.n==='cot')||(a.n==='cot'&&b.n==='cosec'))return DIV(NEG(FN('cosec',a.a)),N(l.a))}}
  return null}
function ratQuad(n,x){ // 1/(quadratic), 1/sqrt(quadratic), sqrt(a^2-x^2)
  if(n.t!=='^'||n.r.t!=='n')return null;const c=n.r.v,q=polyCoeffs(n.l,x,2);if(!q||q.length!==3)return null;
  const[c0,c1,c2]=q,h=c1/(2*c2),m=(c0-c2*h*h)/c2,X=h===0?V(x):ADD(V(x),N(h));
  if(c===-1){
    if(m>0)return MUL(N(1/(c2*Math.sqrt(m))),FN('atan',DIV(X,N(Math.sqrt(m)))));
    if(m<0){const k=Math.sqrt(-m);return MUL(N(1/(2*c2*k)),FN('ln',FN('abs',DIV(SUB(X,N(k)),ADD(X,N(k))))))}return null}
  if(c===-0.5){
    if(c2>0)return MUL(N(1/Math.sqrt(c2)),FN('ln',FN('abs',ADD(X,FN('sqrt',ADD(POW(X,N(2)),N(m)))))));
    if(c2<0&&m<0)return MUL(N(1/Math.sqrt(-c2)),FN('asin',DIV(X,N(Math.sqrt(-m)))))}
  if(c===0.5&&c2<0&&m<0&&h===0){const a=Math.sqrt(-m);return ADD(MUL(DIV(V(x),N(2)),n),MUL(N(a*a*(-c2)/2/Math.sqrt(-c2)),FN('asin',DIV(V(x),N(a)))))}
  return null}
function byParts(n,x){
  if(n.t!=='*')return null;
  const fs=flatMul(n,[]);if(fs.length!==2)return null;
  for(const[p,f]of[[fs[0],fs[1]],[fs[1],fs[0]]]){
    const pc=polyCoeffs(p,x,6);if(!pc||pc.length<2)continue;
    if(f.t==='f'&&['exp','sin','cos'].includes(f.n)&&lin(f.a,x)){ // tabular method
      let sg=1,cur=p,F=f,res=null;
      for(let k=0;k<8&&!(cur.t==='n'&&cur.v===0);k++){
        const nf=integ(F,x);if(!nf)return null;
        const t=MUL(cur,nf);res=res?(sg>0?ADD(res,t):SUB(res,t)):t;
        sg=-sg;cur=simp(D(cur,x));F=nf;
        if(!has(cur,x)&&!(cur.t==='n'&&cur.v===0)){const nf2=integ(F,x);if(!nf2)return null;res=sg>0?ADD(res,MUL(cur,nf2)):SUB(res,MUL(cur,nf2));return res}}
      return res}
    if(f.t==='f'&&(f.n==='ln'||f.n==='atan')&&f.a.t==='v'){ // P(x) ln x, P(x) atan x
      const Pi=integ(p,x);if(!Pi)return null;
      const rest=integ(simp(MUL(Pi,D(f,x))),x);if(!rest)return null;
      return SUB(MUL(Pi,f),rest)}}
  return null}
function usub(n,x){
  const cands=[],seen=new Set();
  (function col(m){if(m!==n&&has(m,x)&&m.t!=='n'&&!(m.t==='v')){const k=str(m,{raw:1});if(!seen.has(k)){seen.add(k);cands.push(m)}}
    for(const k of['l','r','a'])if(m[k])col(m[k])})(n);
  cands.sort((p,q)=>str(p,{raw:1}).length-str(q,{raw:1}).length);
  const xs=[0.31,0.77,1.13,1.62,2.05,0.52];
  const H=[['p',-3],['p',-2],['p',-1],['p',-0.5],['p',0.5],['p',1],['p',2],['p',3],['p',1/3],['exp'],['sin'],['cos'],['atan'],['asin']];
  for(const g of cands){
    const gp=simp(D(g,x));if(!has(gp,x)&&gp.t==='n')continue;
    for(const h of H){
      const cs=[];
      for(const xv of xs){try{const gv=ev(g,{[x]:xv}),nv=ev(n,{[x]:xv}),dv2=ev(gp,{[x]:xv});
        let hv=h[0]==='p'?Math.pow(gv,h[1]):h[0]==='exp'?Math.exp(gv):h[0]==='sin'?Math.sin(gv):h[0]==='cos'?Math.cos(gv):h[0]==='atan'?1/(1+gv*gv):1/Math.sqrt(1-gv*gv);
        const c=nv/(dv2*hv);if(isFinite(c))cs.push(c)}catch(e){}}
      if(cs.length<4)continue;
      const c0=cs[0];if(Math.abs(c0)<1e-12||!cs.every(c=>Math.abs(c-c0)<1e-6*Math.max(1,Math.abs(c0))))continue;
      const t=g;let H2;
      if(h[0]==='p')H2=Math.abs(h[1]+1)<1e-12?FN('ln',FN('abs',t)):DIV(POW(t,N(h[1]+1)),N(h[1]+1));
      else if(h[0]==='exp')H2=FN('exp',t);else if(h[0]==='sin')H2=NEG(FN('cos',t));else if(h[0]==='cos')H2=FN('sin',t);
      else if(h[0]==='atan')H2=FN('atan',t);else H2=FN('asin',t);
      return MUL(N(c0),H2)}}
  return null}
function integ(n,x){
  n=inv(simp(n));
  if(!has(n,x))return simp(MUL(n,V(x)));
  switch(n.t){
    case'neg':{const r=integ(n.a,x);return r&&NEG(r)}
    case'+':case'-':{const a=integ(n.l,x),b=a&&integ(n.r,x);return b?(n.t==='+'?ADD(a,b):SUB(a,b)):null}
    case'*':if(!has(n.l,x)){const r=integ(n.r,x);return r&&MUL(n.l,r)}if(!has(n.r,x)){const r=integ(n.l,x);return r&&MUL(n.r,r)}break;
    case'/':if(!has(n.r,x)){const r=integ(n.l,x);return r&&DIV(r,n.r)}break}
  const q=ratQuad(n,x);if(q)return q;
  return antiStd(n,x)||byParts(n,x)||usub(n,x)}
function antiderivative(n,x){try{const r=integ(n,x);return r?simp(r):null}catch(e){return null}}
function simpson(f,a,b,N2){N2=N2||2000;const h=(b-a)/N2;let s=f(a)+f(b);for(let i=1;i<N2;i++)s+=f(a+i*h)*(i%2?4:2);return s*h/3}

/* ---- complex numbers ---- */
const cx={add:(a,b)=>[a[0]+b[0],a[1]+b[1]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1]],mul:(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],
  div:(a,b)=>{const m=b[0]*b[0]+b[1]*b[1];return[(a[0]*b[0]+a[1]*b[1])/m,(a[1]*b[0]-a[0]*b[1])/m]},
  abs:a=>Math.hypot(a[0],a[1]),arg:a=>Math.atan2(a[1],a[0]),conj:a=>[a[0],-a[1]]};
function evc(n){
  switch(n.t){
    case'n':return[n.v,0];case'v':if(n.n==='i')return[0,1];if(n.n==='pi')return[Math.PI,0];if(n.n==='e')return[Math.E,0];throw new Error('unbound');
    case'+':return cx.add(evc(n.l),evc(n.r));case'-':return cx.sub(evc(n.l),evc(n.r));
    case'*':return cx.mul(evc(n.l),evc(n.r));case'/':return cx.div(evc(n.l),evc(n.r));case'neg':{const a=evc(n.a);return[-a[0],-a[1]]}
    case'^':{const b=evc(n.l),e=evc(n.r);
      if(e[1]===0&&Number.isInteger(e[0])){let k=Math.abs(e[0]),r=[1,0];for(let i=0;i<k;i++)r=cx.mul(r,b);return e[0]<0?cx.div([1,0],r):r}
      if(e[1]===0&&e[0]===0.5){const m=cx.abs(b),s=Math.sqrt((m+b[0])/2),t=Math.sqrt((m-b[0])/2);return[s,b[1]<0?-t:t]}
      throw new Error('power')}
    case'f':{const a=evc(n.a);if(n.n==='sqrt')return evc(POW(n.a,N(0.5)));if(n.n==='abs')return[cx.abs(a),0];throw new Error('fn')}}
  throw new Error('bad')}
function cxStr(z,sig){const re=Math.abs(z[0])<1e-10?0:z[0],im=Math.abs(z[1])<1e-10?0:z[1];
  const f=v=>nice(v)||fmt(v,sig||5);
  const a=f(Math.abs(im)),imS=Math.abs(im)===1?'i':a+'i';
  if(im===0)return f(re);if(re===0)return(im<0?'−':'')+imS;return f(re)+(im<0?' − ':' + ')+imS}

QA.E={fmt,frac,nice,gcd,sup,sub,dn,parseUnit,convert,sameDim,atomOf,N,V,ADD,SUB,MUL,DIV,POW,NEG,FN,parse,ev,vars,count,has,sub1,simp,str,D,diff,polyCoeffs,polyRoots,isolate,rootNum,integ,antiderivative,simpson,cx,evc,cxStr,FUN};
if(typeof module!=='undefined')module.exports=QA.E;
})(typeof window!=='undefined'?window:globalThis);
