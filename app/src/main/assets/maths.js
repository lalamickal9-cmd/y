/* maths.js - routines for questions that are not "plug into one formula": calculus, equations, number systems, chemistry formulas, statistics,
   matrices, vectors, geometry, complex numbers, counting, probability, genetics. Each one reads the question text, calculates, and writes the working. */
(function(G){'use strict';
const QA=G.QA,E=QA.E,S=QA.Solver,nice=E.nice,fmt=E.fmt;
const SOLVERS=[];const add=(name,run)=>SOLVERS.push({name,run});
const nf=x=>{if(!isFinite(x))return x>0?'∞':x<0?'−∞':'?';const n=nice(x);return n&&n.length<=14?n:fmt(x,6)};
const P=s=>E.parse(s,'m'),ms=n=>E.str(n,{}),sup=E.sup,sub=E.sub;
const cut=s=>String(s).replace(/\s+/g,' ').trim();
const gcd=E.gcd;
const fracStr=(a,b)=>{const g=gcd(a,b)||1;a/=g;b/=g;if(b<0){a=-a;b=-b}return b===1?String(a).replace('-','−'):String(a).replace('-','−')+'/'+b};
const numOf=s=>{s=String(s).trim().replace(/[−–]/g,'-').replace(/π/g,'pi');try{return E.ev(P(s),{})}catch(e){return NaN}};

/* ---------- a result ---------- */
const R=(lines,ans,num,topic)=>({lines,ans,num:num===undefined?null:num,topic});

/* =============== unit conversion =============== */
add('convert',(T,low)=>{
  if(!/\b(convert|express|how many|change)\b/.test(low))return null;
  const ms2=S.mentions(T).filter(m=>m.u);if(!ms2.length)return null;
  let from=ms2[0];
  let m=/^\s*(?:\w+\s+){0,3}?(?:to|into|in)\s+(?:the\s+)?([A-Za-zμΩ°℃][A-Za-z0-9μΩ°℃\/^*. \-]{0,24}?)\s*[.?]?\s*$/i.exec(T.slice(from.end));
  let tgt=m&&m[1];
  if(!tgt){const m2=/how many\s+([A-Za-zμΩ°℃][A-Za-z0-9μΩ°℃\/^*]{0,12})\s+(?:are\s+(?:there\s+)?)?(?:in|make)\s+/i.exec(T);if(m2)tgt=m2[1]}
  if(!tgt)return null;
  const tu=E.parseUnit(tgt.trim());if(!tu||!E.sameDim(tu,from.u))return null;
  const r=E.convert(from.v,from.u,tu);if(r===null||!isFinite(r))return null;
  const k=E.convert(1,from.u,tu);
  const L=['Given: '+nf(from.v)+' '+S.UPRETTY(from.utext)];
  if(from.u.o!==undefined||tu.o!==undefined)L.push('Use the temperature relation: K = °C + 273.15 and °F = (K − 255.372) × 9/5 (offset + scale).');
  else L.push('Conversion factor: 1 '+S.UPRETTY(from.utext)+' = '+nf(k)+' '+S.UPRETTY(tgt.trim()));
  L.push(nf(from.v)+' '+S.UPRETTY(from.utext)+(from.u.o!==undefined?'':' = '+nf(from.v)+' × '+nf(k))+' = '+nf(r)+' '+S.UPRETTY(tgt.trim()));
  L.push('Answer: '+nf(from.v)+' '+S.UPRETTY(from.utext)+' = '+nf(r)+' '+S.UPRETTY(tgt.trim())+'.');
  return R(L,nf(r)+' '+S.UPRETTY(tgt.trim()),r,'Unit conversion')});

/* =============== chemical formulas =============== */
const AM={H:1,He:4,Li:7,Be:9,B:11,C:12,N:14,O:16,F:19,Ne:20,Na:23,Mg:24,Al:27,Si:28,P:31,S:32,Cl:35.5,Ar:40,K:39,Ca:40,Sc:45,Ti:48,V:51,Cr:52,Mn:55,Fe:56,Co:59,Ni:59,Cu:63.5,Zn:65,Ga:70,Ge:73,As:75,Se:79,Br:80,Kr:84,Rb:85.5,Sr:88,Zr:91,Mo:96,Ag:108,Cd:112,Sn:119,Sb:122,Te:128,I:127,Xe:131,Cs:133,Ba:137,W:184,Pt:195,Au:197,Hg:201,Pb:207,Bi:209,Ra:226,U:238};
function parseFormula(s){
  const parts=s.split(/[.·*]/),tot={};
  for(let part of parts){
    let mult=1;const mm=/^(\d+)(.*)$/.exec(part);if(mm){mult=+mm[1];part=mm[2]}
    const st=[{}];let i=0;
    while(i<part.length){
      const c=part[i];
      if(c==='('){st.push({});i++}
      else if(c===')'){const top=st.pop();i++;let n='';while(i<part.length&&/\d/.test(part[i]))n+=part[i++];const k=n?+n:1;for(const e in top)st[st.length-1][e]=(st[st.length-1][e]||0)+top[e]*k;if(!st.length)return null}
      else if(/[A-Z]/.test(c)){let el=c;i++;if(i<part.length&&/[a-z]/.test(part[i]))el+=part[i++];if(!AM[el])return null;let n='';while(i<part.length&&/\d/.test(part[i]))n+=part[i++];st[st.length-1][el]=(st[st.length-1][el]||0)+(n?+n:1)}
      else return null}
    if(st.length!==1)return null;
    for(const e in st[0])tot[e]=(tot[e]||0)+st[0][e]*mult}
  return tot}
const FRE=/\b(?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*)+(?:[.·*]\d*(?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*)+)?(?![A-Za-z0-9])/g;
const SUBS=s=>s.replace(/\d+/g,d=>sub(d));
function findFormula(T){
  FRE.lastIndex=0;let m;
  while((m=FRE.exec(T))){const f=m[0],c=parseFormula(f);if(!c)continue;
    const nEl=Object.keys(c).length;if(!(/\d/.test(f)||nEl>=2))continue;
    if(/^[A-Z][a-z]?$/.test(f))continue;
    let mass=0;for(const e in c)mass+=AM[e]*c[e];
    return{f,counts:c,mass,text:SUBS(f)}}
  return null}
function massLines(F){
  const parts=Object.keys(F.counts).map(e=>(F.counts[e]>1?F.counts[e]+' × ':'')+AM[e]+'  ('+e+')');
  return'Molar mass of '+F.text+' = '+Object.keys(F.counts).map(e=>(F.counts[e]>1?F.counts[e]+' × ':'')+AM[e]).join(' + ')+' = '+nf(F.mass)+' g/mol'}
QA.chem={find:findFormula,AM};
add('molarmass',(T,low)=>{
  if(!/\b(molar mass|molecular mass|molecular weight|formula mass|mass of one mole|relative molecular mass|gram molecular mass|molar weight)\b/.test(low))return null;
  if(/\d\s*(g|kg|mg)\b/.test(low))return null;
  const F=findFormula(T);if(!F)return null;
  const L=['Given: formula '+F.text,'Atomic masses used: '+Object.keys(F.counts).map(e=>e+' = '+AM[e]).join(', '),massLines(F),
    'Answer: The molar mass of '+F.text+' is '+nf(F.mass)+' g/mol (i.e. '+nf(F.mass)+' g per mole; molecular mass = '+nf(F.mass)+' u).'];
  return R(L,nf(F.mass)+' g/mol',F.mass,'Chemistry — molar mass')});

/* =============== number systems =============== */
const BN={binary:2,bin:2,octal:8,oct:8,decimal:10,dec:10,hexadecimal:16,hex:16};
const SUBNUM=n=>sub(String(n));
const digs='0123456789ABCDEF';
const toBase=(n,b)=>n.toString(b).toUpperCase();
add('numsys',(T,low)=>{
  if(!/\b(binary|octal|hexadecimal|hex|decimal|base|complement|ascii)\b|\(\s*[0-9a-f]+\s*\)\s*_?\s*(2|8|10|16)\b|\b0x[0-9a-f]+|\b0b[01]+/i.test(T))return null;
  // ASCII
  let m=/ascii\s+(?:value|code)\s+of\s+(?:the\s+)?(?:character\s+)?['"‘“]?(.)['"’”]?(?:\s|$|[.?,])/i.exec(T);
  if(m){const c=m[1].charCodeAt(0);return R(['Given: character "'+m[1]+'"','The ASCII code of "'+m[1]+'" is '+c+'.','In binary: '+c.toString(2).padStart(8,'0')+', in hexadecimal: '+c.toString(16).toUpperCase(),'Answer: ASCII('+m[1]+') = '+c],String(c),c,'Computer Science — ASCII')}
  m=/(?:character|char)\s+(?:for|with|of)\s+ascii\s+(?:value|code)?\s*(\d+)/i.exec(T)||/ascii\s+(?:value|code)\s+(\d+)/i.exec(T);
  if(m&&+m[1]<256)return R(['Given: ASCII code '+m[1],'Answer: The character with ASCII code '+m[1]+' is "'+String.fromCharCode(+m[1])+'".'],String.fromCharCode(+m[1]),null,'Computer Science — ASCII');
  // complements
  m=/(1|2)\s*['’]?\s*s?\s*complement\s+of\s+\(?([01]+)\)?/i.exec(T);
  if(m){const w=m[2],ones=w.split('').map(c=>c==='0'?'1':'0').join('');
    if(m[1]==='1')return R(['Given: binary number '+w,'1\'s complement: change every 0 to 1 and every 1 to 0.',w+' → '+ones,'Answer: 1\'s complement of '+w+' is '+ones+'.'],ones,null,'Computer Science — complements');
    const tw=((parseInt(ones,2)+1)%Math.pow(2,w.length)).toString(2).padStart(w.length,'0');
    return R(['Given: binary number '+w,'Step 1: 1\'s complement of '+w+' = '+ones,'Step 2: add 1 → '+ones+' + 1 = '+tw,'Answer: 2\'s complement of '+w+' is '+tw+'.'],tw,null,'Computer Science — complements')}
  // binary arithmetic
  m=/\b(add|sum of|subtract|multiply|difference of|product of)\b[^0-9]*([01]+)\s*(?:and|from|by|,|\+|-|×|x|\*)\s*([01]+)/i.exec(T);
  if(m&&/binary/i.test(T)){const a=parseInt(m[2],2),b=parseInt(m[3],2),op=m[1].toLowerCase();
    let r,sym;if(/add|sum/.test(op)){r=a+b;sym='+'}else if(/multiply|product/.test(op)){r=a*b;sym='×'}else{r=a-b;sym='−'}
    return R(['Given: '+m[2]+' and '+m[3]+' (binary)','In decimal: '+a+' '+sym+' '+b+' = '+r,'Convert back to binary: '+r+' = '+(r<0?'−':'')+Math.abs(r).toString(2),'Answer: '+m[2]+' '+sym+' '+m[3]+' = '+(r<0?'−':'')+Math.abs(r).toString(2)+' (binary)'],Math.abs(r).toString(2),r,'Computer Science — binary arithmetic')}
  // conversions
  let src=null,sb=null;
  m=/\(\s*([0-9a-f]+)\s*\)\s*_?\s*(2|8|10|16)\b/i.exec(T)||/\b([0-9a-f]+)\s*_\s*(2|8|10|16)\b/i.exec(T);
  if(m){src=m[1].toUpperCase();sb=+m[2]}
  if(!src&&(m=/\b0x([0-9a-f]+)/i.exec(T))){src=m[1].toUpperCase();sb=16}
  if(!src&&(m=/\b0b([01]+)/i.exec(T))){src=m[1];sb=2}
  if(!src&&(m=/\b(binary|octal|hexadecimal|hex|decimal)\s+(?:number\s+)?([0-9a-f]+)\b/i.exec(T))){src=m[2].toUpperCase();sb=BN[m[1].toLowerCase()]}
  if(!src&&(m=/\b([0-9a-f]+)\s+(?:in|from)\s+(binary|octal|hexadecimal|hex|decimal)\b/i.exec(T))){src=m[1].toUpperCase();sb=BN[m[2].toLowerCase()]}
  let tb=null;
  m=/\b(?:to|into)\s+(binary|octal|hexadecimal|hex|decimal)\b/i.exec(T)||/\b(binary|octal|hexadecimal|hex|decimal)\s+(?:equivalent|form|representation|number|value)\s+of\b/i.exec(T)||/\b(?:in|as)\s+(binary|octal|hexadecimal|hex|decimal)\b/i.exec(T);
  if(m)tb=BN[m[1].toLowerCase()];
  if(!src){m=/\b(?:convert|change|express|find)\b[^0-9]*?(\d+)\b/i.exec(T);if(m&&tb){src=m[1];sb=10}}
  if(!src||!tb||src===undefined)return null;
  if(!src.split('').every(c=>digs.indexOf(c)>=0&&digs.indexOf(c)<sb))return null;
  const n=parseInt(src,sb);if(!isFinite(n))return null;
  const out=toBase(n,tb);
  const L=['Given: ('+src+')'+SUBNUM(sb)+' — convert to base '+tb];
  if(sb!==10){
    const terms=src.split('').map((c,i)=>c+' × '+sb+sup(src.length-1-i)),vals=src.split('').map((c,i)=>digs.indexOf(c)*Math.pow(sb,src.length-1-i));
    L.push('Step 1 (to decimal): ('+src+')'+SUBNUM(sb)+' = '+terms.join(' + '));
    L.push('= '+vals.join(' + ')+' = '+n)}
  if(tb!==10){
    if((sb===2&&(tb===8||tb===16))||(tb===2&&(sb===8||sb===16))){
      const g=sb===2?(tb===8?3:4):(sb===8?3:4);
      if(sb===2){let w=src;while(w.length%g)w='0'+w;const grp=w.match(new RegExp('.{'+g+'}','g'));
        L.push('Group the bits in '+g+'s from the right: '+grp.join(' '));L.push(grp.map(x=>x+' → '+toBase(parseInt(x,2),tb)).join(',  '))}
      else L.push(src.split('').map(c=>c+' → '+parseInt(c,sb).toString(2).padStart(g,'0')).join(',  '))}
    else{let q=n;const rows=[];if(q===0)rows.push('0 ÷ '+tb+' = 0 remainder 0');
      while(q>0){const r=q%tb;rows.push(q+' ÷ '+tb+' = '+Math.floor(q/tb)+' remainder '+toBase(r,tb)+(r>9?' ('+r+')':''));q=Math.floor(q/tb)}
      L.push('Repeated division by '+tb+':');rows.forEach(r=>L.push('  '+r));L.push('Read the remainders from bottom to top.')}}
  L.push('Answer: ('+src+')'+SUBNUM(sb)+' = ('+out+')'+SUBNUM(tb));
  return R(L,'('+out+')'+SUBNUM(tb),n,'Computer Science — number systems')});

/* =============== calculus =============== */
const FUNW=new Set(['sin','cos','tan','cot','sec','cosec','log','ln','exp','sqrt','abs','pi','dx','dy','arcsin','arccos','arctan','sinh','cosh','tanh','asin','acos','atan']);
const isMathy=ex=>!(String(ex).match(/[A-Za-z]{3,}/g)||[]).some(w=>!FUNW.has(w.toLowerCase()));
function exprTail(s){return cut(s.replace(/\s*(?:,|;|\.\s|\?|\bfind\b|\bthen\b|\bshow\b|\bprove\b|\bwith respect\b|\bw\.?r\.?t\b|\bat\b|\bwhen\b|\bwhere\b|\bif\b).*$/i,'').replace(/[.?]\s*$/,''))}
function fixExpr(s){return s.replace(/\bln\s*\|([^|]+)\|/g,'ln($1)').replace(/(\d)\s*([a-z(])/gi,'$1$2').replace(/\be\s*\^\s*\{?([^ ]+?)\}?(?=\s|$)/g,'e^($1)')}
const rulesUsed=(n,x)=>{const r=new Set();(function w(m){
  if(m.t==='*'&&E.has(m.l,x)&&E.has(m.r,x))r.add('product rule: d/dx(u·v) = u′v + uv′');
  if(m.t==='/'&&E.has(m.l,x)&&E.has(m.r,x))r.add('quotient rule: d/dx(u/v) = (u′v − uv′)/v²');
  if(m.t==='f'&&!(m.a.t==='v'))r.add('chain rule: d/dx[f(g(x))] = f′(g(x))·g′(x)');
  if(m.t==='^'&&E.has(m.l,x)&&!E.has(m.r,x))r.add('power rule: d/dx(xⁿ) = n·xⁿ⁻¹');
  for(const k of['l','r','a'])if(m[k])w(m[k])})(n);return[...r]};
function topTerms(n,sg,out){if(n.t==='+'){topTerms(n.l,sg,out);topTerms(n.r,sg,out)}else if(n.t==='-'){topTerms(n.l,sg,out);topTerms(n.r,-sg,out)}else out.push([sg,n]);return out}
add('derivative',(T,low)=>{
  if(!/\b(differentiate|differentiation|derivative|dy\s*\/\s*dx|d\s*\/\s*dx|rate of change|slope of the tangent|find f\s*'|f\s*'\s*\()/i.test(T))return null;
  const x=(/\bwith respect to\s+([a-z])\b/i.exec(T)||[])[1]||(/d\s*[a-z]?\s*\/\s*d([a-z])\b/i.exec(T)||[])[1]||'x';
  let ex=null,m,fn='y';
  m=/\b(y|f\s*\(\s*[a-z]\s*\)|f|s|v|p|A|V|C)\s*=\s*([^;?]+)/.exec(T);
  if(m){ex=exprTail(m[2]);fn=/^f/.test(m[1])?'f(x)':m[1]}
  if(!ex){m=/\b(?:differentiate|derivative of|differentiation of|d\s*\/\s*dx\s*(?:of)?)\s*(?:the\s+(?:function|expression)\s*)?\(?\s*(.+)/i.exec(T);if(m)ex=exprTail(m[1])}
  if(!ex||!isMathy(ex)||/\bdifferentiate\s+between\b/i.test(T))return null;
  let ast;try{ast=P(fixExpr(ex))}catch(e){return null}
  if(!E.has(ast,x))return null;
  let d;try{d=E.diff(ast,x)}catch(e){return null}
  const twice=/\b(second derivative|d\s*2\s*y|d\^2|second order derivative)\b/i.test(T);
  const L=['Given: '+fn+' = '+ms(ast),'To find: '+(twice?'d²y/dx²':'dy/dx')+' (differentiate with respect to '+x+')'];
  const rules=rulesUsed(ast,x);if(rules.length)L.push('Rules used: '+rules.join('; '));
  const ts=topTerms(ast,1,[]);
  if(ts.length>1&&ts.length<=7){L.push('Differentiating term by term:');ts.forEach(([sg,t])=>L.push('  d/d'+x+'('+ms(t)+') = '+ms(E.diff(t,x))));
    L.push('dy/dx = '+ms(d))}
  else L.push('dy/d'+x+' = '+ms(d));
  let res=d;
  if(twice){res=E.diff(d,x);L.push('Differentiating again: d²y/dx² = '+ms(res))}
  let num=null;
  const at=/\b(?:at|when|for)\s+(?:the point\s+)?\(?\s*(?:[a-z]\s*=\s*)?(-?\d+(?:\.\d+)?(?:\/\d+)?|pi(?:\/\d+)?)\s*(?:\)|,|\.|\?|$)/i.exec(T)||/f\s*'\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/.exec(T);
  if(at){const a=numOf(at[1]);if(isFinite(a)){num=E.ev(res,{[x]:a});L.push('At '+x+' = '+at[1]+': value = '+nf(num))}}
  L.push('Answer: '+(twice?'d²y/dx²':'dy/dx')+' = '+ms(res)+(num!==null?'; value at '+x+' = '+at[1]+' is '+nf(num):''));
  return R(L,ms(res),num,'Maths — differentiation')});
function parseBound(s){s=cut(s).replace(/infinity|inf\b|∞/i,'1e308');return numOf(s)}
add('integral',(T,low)=>{
  if(!/(∫|\bintegrate\b|\bintegral\b|\bintegration\b)/i.test(T))return null;
  let lo=null,hi=null,body=null,vx='x',m;
  if((m=/∫\s*(?:_|\()?\s*\{?\(?\s*(-?[\w./π]+)\s*\}?\)?\s*\^\s*\{?\(?\s*(-?[\w./π]+)\s*\}?\)?\s*([^]*?)\s*d\s*([a-z])(?![a-z])/i.exec(T))){lo=parseBound(m[1]);hi=parseBound(m[2]);body=m[3];vx=m[4]}
  if(body===null){
    const dm=/(?:^|[^A-Za-z])d\s*([a-z])(?![A-Za-z])/.exec(T.replace(/\bdy\s*\/\s*dx/gi,' '));
    if(dm){const before=T.slice(0,dm.index+(dm[0].length-dm[0].trimStart().length));vx=dm[1];
      body=before.replace(/^[^]*(?:∫|integrate|integral of|integration of)\s*/i,'').replace(/^[^]*\b(?:evaluate|find|calculate|the value of)\s+(?:the\s+)?(?:value of\s+)?/i,'')}
    else{const mm=/(?:∫|integrate|integral of|integration of)\s*([^]*?)(?:\s+with respect to\s+([a-z])\b|\s+from\b|\s+between\b|[.?]\s*$|$)/i.exec(T);if(mm){body=mm[1];if(mm[2])vx=mm[2]}}}
  if(body===null)return null;
  if(lo===null){const b=/\bfrom\s+(-?[\w./π]+)\s+to\s+(-?[\w./π]+)/i.exec(T)||/\bbetween\s+(?:[a-z]\s*=\s*)?(-?[\w./π]+)\s+and\s+(?:[a-z]\s*=\s*)?(-?[\w./π]+)/i.exec(T)||/\blimits?\s+(?:from\s+)?(-?[\w./π]+)\s+to\s+(-?[\w./π]+)/i.exec(T)||/\[\s*(-?[\w./π]+)\s*,\s*(-?[\w./π]+)\s*\]/.exec(T);
    if(b){lo=parseBound(b[1]);hi=parseBound(b[2])}}
  body=cut(body);if(!isMathy(body))return null;
  let ast;try{ast=P(fixExpr(body))}catch(e){return null}
  if(!E.has(ast,vx))return null;
  const F=E.antiderivative(ast,vx);
  const L=['Given: ∫ '+ms(ast)+' d'+vx+(lo!==null?' from '+nf(lo)+' to '+nf(hi):'')];
  if(F){
    L.push('Using standard integrals (and substitution / integration by parts where needed):');
    L.push('∫ '+ms(ast)+' d'+vx+' = '+ms(F)+' + C');
    if(lo===null||!isFinite(lo)||!isFinite(hi)){L.push('Answer: ∫ '+ms(ast)+' d'+vx+' = '+ms(F)+' + C');return R(L,ms(F)+' + C',null,'Maths — integration')}
    const Fb=E.ev(F,{[vx]:hi}),Fa=E.ev(F,{[vx]:lo}),v=Fb-Fa;
    L.push('Apply the limits:  [F('+vx+')] from '+nf(lo)+' to '+nf(hi)+' = F('+nf(hi)+') − F('+nf(lo)+') = '+nf(Fb)+' − '+nf(Fa));
    L.push('Answer: '+nf(v)+(nice(v)&&nice(v)!==fmt(v,6)?' (≈ '+fmt(v,6)+')':''));
    return R(L,nf(v),v,'Maths — definite integral')}
  if(lo!==null&&isFinite(lo)&&isFinite(hi)){
    const v=E.simpson(t=>E.ev(ast,{[vx]:t}),lo,hi,2000);if(!isFinite(v))return null;
    L.push('No simple antiderivative was found, so the definite integral is evaluated numerically (Simpson\'s rule).');
    L.push('Answer: ≈ '+fmt(v,6));return R(L,'≈ '+fmt(v,6),v,'Maths — definite integral')}
  return null});
add('limit',(T,low)=>{
  if(!/\blim\b|\blimit\b/i.test(T))return null;
  const m=/\blim(?:it)?\s*(?:of)?\s*[_{(]?\s*([a-z])\s*(?:→|->|⟶|tends to|approaches|to)\s*(-?[\w./π∞]+(?:\^[+-])?)\s*[})]?\s*[:,]?\s*(?:of\s+)?([^]+)/i.exec(T)||/\blimit\s+of\s+([^]+?)\s+as\s+([a-z])\s*(?:→|->|tends to|approaches|to)\s*(-?[\w./π∞]+)/i.exec(T);
  if(!m)return null;
  let v,at,body;
  if(/^[a-z]$/i.test(m[1])&&m[3]!==undefined&&m.length>=4&&/limit\s+of/i.test(m[0])===false){v=m[1];at=m[2];body=m[3]}else{body=m[1];v=m[2];at=m[3]}
  body=exprTail(body);if(!isMathy(body))return null;
  const a=/infin|∞|inf/i.test(at)?(/^-/.test(at)?-Infinity:Infinity):numOf(at.replace(/\^[+-]/,''));
  if(a===undefined||(isNaN(a)))return null;
  let ast;try{ast=P(fixExpr(body))}catch(e){return null}
  const f=t=>E.ev(ast,{[v]:t});
  const L=['Given: lim ('+v+' → '+at+') of '+ms(ast)];
  let val=NaN,direct=NaN;
  if(isFinite(a)){try{direct=f(a)}catch(e){}}
  if(isFinite(a)&&isFinite(direct)&&Math.abs(direct)<1e300){val=direct;L.push('Substituting '+v+' = '+at+' gives a definite value, so the limit is '+nf(val)+'.')}
  else{
    // 0/0 form: L'Hopital
    let cur=ast,used=0;
    if(isFinite(a)&&ast.t==='/'){let num=ast.l,den=ast.r;
      for(let i=0;i<3;i++){
        const nv=E.ev(num,{[v]:a}),dv=E.ev(den,{[v]:a});
        if(Math.abs(nv)<1e-9&&Math.abs(dv)<1e-9){L.push((i?'Still ':'On substituting '+v+' = '+at+', ')+'the form is 0/0, so apply L\'Hôpital\'s rule (differentiate numerator and denominator):');
          num=E.diff(num,v);den=E.diff(den,v);L.push('  lim '+ms(num)+' / '+ms(den));used++}
        else{const q=nv/dv;if(isFinite(q)){val=q;L.push('Now substituting '+v+' = '+at+': '+nf(nv)+' / '+nf(dv)+' = '+nf(q))}break}}}
    if(isNaN(val)){const pts=isFinite(a)?[1e-4,1e-5,1e-6].map(h=>[f(a+h),f(a-h)]):[1e3,1e5,1e7].map(h=>[f(a>0?h:-h),f(a>0?h:-h)]);
      const last=pts[pts.length-1];
      if(isFinite(last[0])&&Math.abs(last[0]-last[1])<1e-3*Math.max(1,Math.abs(last[0]))){val=last[0];L.push('Evaluating the expression for values of '+v+' closer and closer to '+at+' (from both sides) it settles at '+fmt(val,6)+'.')}}}
  if(isNaN(val))return null;
  const r=Math.abs(val-Math.round(val))<1e-4?Math.round(val):val;
  L.push('Answer: the limit = '+(nice(r)||fmt(r,6)));
  return R(L,nice(r)||fmt(r,6),r,'Maths — limits')});

/* =============== equations =============== */
const FNSET=new Set(['sin','cos','tan','cot','sec','cosec','log','ln','exp','sqrt','abs','pi']),SMALLW=new Set('of to in is if by as at on an or us we so no be it the and for are'.split(' '));
function stripWords(p){const t=p.trim().split(/\s+/);let i=0;while(i<t.length&&((/^[A-Za-z']{3,}[:,.]?$/.test(t[i])&&!FNSET.has(t[i].toLowerCase()))||SMALLW.has(t[i].toLowerCase())))i++;return t.slice(i).join(' ')}
function coefLin(f,vs){ // coefficients of a linear expression f(vs)
  const z={};vs.forEach(v=>z[v]=0);const c0=f(z),co=vs.map(v=>{const e=Object.assign({},z);e[v]=1;return f(e)-c0});
  const chk={};vs.forEach((v,i)=>chk[v]=i+2.5);const exp=c0+co.reduce((s,c,i)=>s+c*(i+2.5),0);
  return Math.abs(f(chk)-exp)<1e-7*Math.max(1,Math.abs(exp))?{c0,co}:null}
add('equations',(T,low)=>{
  if(!/(\bsolve\b|\broots?\b|\bzeros?\b|\bfind the values? of\b|\bfind x\b|\bsolve for\b|\bsimultaneous\b|quadratic equation|nature of)/i.test(T)||!/=/.test(T))return null;
  const pieces=T.split(/\s*(?:;|\band\b|\n|,(?=\s*[a-z0-9(+\-]+\s*[^=]*=))\s*/i).map(cut).filter(p=>/=/.test(p));
  const eqs=[];
  for(let p of pieces){
    p=stripWords(p.replace(/^.*?:\s*/,'')).replace(/\b(?:for|where|then|find)\b.*$/i,'').replace(/[.?]\s*$/,'').replace(/\s*\(?\s*(?:equation|eq\.?)\s*\d*\s*\)?/gi,'');
    const sides=p.split('=');if(sides.length!==2||!sides[0].trim()||!sides[1].trim())continue;
    try{eqs.push({L:P(fixExpr(sides[0])),R:P(fixExpr(sides[1])),txt:cut(p)})}catch(e){}}
  if(!eqs.length)return null;
  const vs=[...new Set(eqs.flatMap(q=>[...E.vars(q.L),...E.vars(q.R)]))].filter(v=>v!=='e'&&v!=='i');
  if(eqs.length>=2&&vs.length===eqs.length&&vs.length<=3){
    const F=eqs.map(q=>e=>E.ev(q.L,e)-E.ev(q.R,e)),rows=[];
    for(const f of F){const c=coefLin(f,vs);if(!c)return null;rows.push(c)}
    const A=rows.map(r=>r.co),b=rows.map(r=>-r.c0),n=vs.length;
    const det=M=>M.length===2?M[0][0]*M[1][1]-M[0][1]*M[1][0]:M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    const D=det(A);
    const L=['Given: '+eqs.map(q=>q.txt).join('  and  '),'Write each equation as '+vs.map(v=>'a'+v).join(' + ')+' = c and use Cramer\'s rule:'];
    A.forEach((r,i)=>L.push('  '+r.map((c,j)=>nf(c)+vs[j]).join(' + ').replace(/\+ −/g,'− ')+' = '+nf(b[i])));
    L.push('D = '+nf(D));
    if(Math.abs(D)<1e-12){L.push('D = 0, so the system has either no solution or infinitely many solutions.');return R(L,'D = 0',null,'Maths — equations')}
    const sol=vs.map((v,j)=>{const M=A.map((r,i)=>r.map((c,k)=>k===j?b[i]:c));const Dj=det(M);L.push('D'+v+' = '+nf(Dj));return Dj/D});
    vs.forEach((v,j)=>L.push(v+' = D'+v+' / D = '+nf(sol[j]*D)+' / '+nf(D)+' = '+nf(sol[j])));
    L.push('Answer: '+vs.map((v,j)=>v+' = '+nf(sol[j])).join(', '));
    return R(L,vs.map((v,j)=>v+' = '+nf(sol[j])).join(', '),sol[0],'Maths — simultaneous equations')}
  if(eqs.length!==1||vs.length!==1)return null;
  const q=eqs[0],x=vs[0],g=E.SUB(q.L,q.R),pc=E.polyCoeffs(g,x,4);
  if(!pc||pc.length<2)return null;
  const poly=pc.map((c,i)=>[c,i]).filter(t=>t[0]!==0).reverse().map((t,i)=>{const c=t[0],k=t[1],ac=Math.abs(c);return(i?(c<0?' − ':' + '):(c<0?'−':''))+((ac===1&&k>0)?'':nf(ac))+(k===0?'':x+(k>1?sup(k):''))}).join('');
  const L=['Given: '+q.txt,'Bring everything to one side: '+poly+' = 0'];
  const deg=pc.length-1;
  if(deg===1){const r=-pc[0]/pc[1];L.push(nf(pc[1])+x+' = '+nf(-pc[0])+'  →  '+x+' = '+nf(-pc[0])+' / '+nf(pc[1]));L.push('Answer: '+x+' = '+nf(r));return R(L,x+' = '+nf(r),r,'Maths — linear equation')}
  if(deg===2){const[c,b,a]=pc,Dd=b*b-4*a*c;
    L.push('Compare with ax² + bx + c = 0:  a = '+nf(a)+', b = '+nf(b)+', c = '+nf(c));
    L.push('Discriminant D = b² − 4ac = ('+nf(b)+')² − 4('+nf(a)+')('+nf(c)+') = '+nf(Dd));
    L.push('Sum of roots = −b/a = '+nf(-b/a)+',  product of roots = c/a = '+nf(c/a));
    if(Dd>1e-12){const s=Math.sqrt(Dd),r1=(-b+s)/(2*a),r2=(-b-s)/(2*a);
      L.push('D > 0, so the roots are real and distinct.');L.push(x+' = (−b ± √D) / 2a = ('+nf(-b)+' ± '+nf(s)+') / '+nf(2*a));
      L.push(x+' = '+nf(r1)+'  or  '+x+' = '+nf(r2));L.push('Answer: '+x+' = '+nf(r1)+' or '+nf(r2));return R(L,x+' = '+nf(r1)+' or '+nf(r2),r1,'Maths — quadratic equation')}
    if(Math.abs(Dd)<=1e-12){const r=-b/(2*a);L.push('D = 0, so the roots are real and equal.');L.push(x+' = −b / 2a = '+nf(r));L.push('Answer: '+x+' = '+nf(r)+' (repeated root)');return R(L,x+' = '+nf(r),r,'Maths — quadratic equation')}
    const re=-b/(2*a),im=Math.sqrt(-Dd)/(2*Math.abs(a));
    L.push('D < 0, so the roots are complex conjugates.');L.push(x+' = (−b ± i√(−D)) / 2a = '+nf(re)+' ± '+nf(im)+'i');
    L.push('Answer: '+x+' = '+nf(re)+' + '+nf(im)+'i  or  '+nf(re)+' − '+nf(im)+'i');return R(L,x+' = '+nf(re)+' ± '+nf(im)+'i',null,'Maths — quadratic equation')}
  const rts=E.polyRoots(pc);
  const real=rts.filter(r=>Math.abs(r[1])<1e-9).map(r=>r[0]),cpx=rts.filter(r=>Math.abs(r[1])>=1e-9&&r[1]>0);
  L.push('Degree '+deg+' polynomial: find its roots (try factors of the constant term first).');
  L.push('Answer: '+(real.length?x+' = '+real.map(nf).join(', '):'')+(cpx.length?(real.length?'; ':'')+'complex roots '+cpx.map(r=>nf(r[0])+' ± '+nf(r[1])+'i').join(', '):''));
  return R(L,real.map(nf).join(', '),real[0],'Maths — polynomial equation')});

QA.Solver._maths={SOLVERS,add,nf,P,ms,cut,numOf,R,gcd,fracStr};

/* =============== sequences and series =============== */
const SUPD={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
const prep=t=>String(t||'').replace(/\r/g,'\n').replace(/[−–—]/g,'-').replace(/[×✕✖·⋅]/g,'*').replace(/÷/g,'/').replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)/g,(m,s)=>'^'+s.split('').map(c=>SUPD[c]).join('')).replace(/√/g,'sqrt').replace(/π/g,'pi').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
const NUMRUN=/-?\d+(?:\.\d+)?(?:\/\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?(?:\/\d+)?)+/g;
function lists(T){const out=[];let m;NUMRUN.lastIndex=0;while((m=NUMRUN.exec(T)))out.push({txt:m[0],nums:m[0].split(',').map(numOf),pos:m.index});return out}
add('stdsum',(T,low)=>{
  const m=/sum of (?:the )?first\s+(\d+)\s+(natural numbers|positive integers|odd(?: natural)? numbers|even(?: natural)? numbers|squares|cubes|counting numbers)/i.exec(T)||/sum of (?:the )?(natural numbers|odd numbers|even numbers|squares|cubes)\s+(?:from|up to)\s+1\s+to\s+(\d+)/i.exec(T);
  if(!m)return null;const n=+(/^\d/.test(m[1])?m[1]:m[2]),kind=(/^\d/.test(m[1])?m[2]:m[1]).toLowerCase();
  let v,L=['To find: sum of the first '+n+' '+kind];
  if(/odd/.test(kind)){v=n*n;L.push('Sum of first n odd numbers = n²  →  '+n+'² = '+v)}
  else if(/even/.test(kind)){v=n*(n+1);L.push('Sum of first n even numbers = n(n + 1)  →  '+n+' × '+(n+1)+' = '+v)}
  else if(/square/.test(kind)){v=n*(n+1)*(2*n+1)/6;L.push('Σn² = n(n + 1)(2n + 1)/6  →  '+n+' × '+(n+1)+' × '+(2*n+1)+' / 6 = '+v)}
  else if(/cube/.test(kind)){v=Math.pow(n*(n+1)/2,2);L.push('Σn³ = [n(n + 1)/2]²  →  ['+n+' × '+(n+1)+' / 2]² = '+v)}
  else{v=n*(n+1)/2;L.push('Σn = n(n + 1)/2  →  '+n+' × '+(n+1)+' / 2 = '+v)}
  L.push('Answer: '+v);return R(L,String(v),v,'Maths — series')});
add('sequence',(T,low)=>{
  if(!/\b(ap|a\.p|gp|g\.p|arithmetic|geometric|series|sequence|progression|term|next)\b/i.test(T))return null;
  const ls=lists(T).filter(l=>l.nums.length>=3&&l.nums.every(isFinite));if(!ls.length)return null;
  const a=ls[0].nums,n0=a.length,d=a[1]-a[0];
  let kind=null;
  if(a.every((v,i)=>i===0||Math.abs(v-a[i-1]-d)<1e-9))kind='AP';
  else if(a[0]!==0&&a.every((v,i)=>i===0||Math.abs(v-a[i-1]*(a[1]/a[0]))<1e-9*Math.max(1,Math.abs(v))))kind='GP';
  if(!kind)return null;
  const r=a[1]/a[0],first=a[0];
  const L=['Given: '+a.join(', ')+', …'];
  const tn=n=>kind==='AP'?first+(n-1)*d:first*Math.pow(r,n-1);
  const sn=n=>kind==='AP'?n/2*(2*first+(n-1)*d):(Math.abs(r-1)<1e-12?n*first:first*(Math.pow(r,n)-1)/(r-1));
  L.push(kind==='AP'?'The difference between consecutive terms is constant: d = '+nf(a[1])+' − '+nf(a[0])+' = '+nf(d)+', so this is an A.P. with a = '+nf(first)+'.':'The ratio of consecutive terms is constant: r = '+nf(a[1])+' / '+nf(a[0])+' = '+nf(r)+', so this is a G.P. with a = '+nf(first)+'.');
  let done=false,ans=null,num=null,m;
  if((m=/(\d+)\s*(?:st|nd|rd|th)\s+term/i.exec(T))||(m=/\bnth term\b[^]*?n\s*=\s*(\d+)/i.exec(T))){const n=+m[1];num=tn(n);
    L.push(kind==='AP'?'a'+sub('n')+' = a + (n − 1)d = '+nf(first)+' + ('+n+' − 1)('+nf(d)+') = '+nf(num):'a'+sub('n')+' = a·rⁿ⁻¹ = '+nf(first)+' × ('+nf(r)+')'+sup(n-1)+' = '+nf(num));
    ans='The '+n+'th term is '+nf(num);done=true}
  else if((m=/sum of (?:the )?first\s+(\d+)\s+terms?/i.exec(T))||(m=/sum of\s+(\d+)\s+terms/i.exec(T))){const n=+m[1];num=sn(n);
    L.push(kind==='AP'?'Sₙ = n/2 [2a + (n − 1)d] = '+n+'/2 [2('+nf(first)+') + ('+n+' − 1)('+nf(d)+')] = '+nf(num):'Sₙ = a(rⁿ − 1)/(r − 1) = '+nf(first)+'(('+nf(r)+')'+sup(n)+' − 1)/('+nf(r)+' − 1) = '+nf(num));
    ans='The sum of the first '+n+' terms is '+nf(num);done=true}
  else if(/sum to infinity|sum of infinite|infinite (?:g\.?p|series)/i.test(T)&&kind==='GP'&&Math.abs(r)<1){num=first/(1-r);L.push('S∞ = a/(1 − r) = '+nf(first)+' / (1 − '+nf(r)+') = '+nf(num));ans='The sum to infinity is '+nf(num);done=true}
  else if((m=/which term(?:\s+of\s+(?:the|this)\s+\w+)?\s+is\s+(-?\d+(?:\.\d+)?)/i.exec(T))||(m=/term\s+number\s+of\s+(-?\d+(?:\.\d+)?)/i.exec(T))){const X=+m[1];
    const n=kind==='AP'?(X-first)/d+1:Math.log(X/first)/Math.log(r)+1;
    if(Number.isInteger(Math.round(n*1e6)/1e6)){num=Math.round(n);L.push(kind==='AP'?'aₙ = a + (n − 1)d  →  '+nf(X)+' = '+nf(first)+' + (n − 1)('+nf(d)+')  →  n = '+nf(num):'aₙ = a·rⁿ⁻¹  →  '+nf(X)+' = '+nf(first)+' × ('+nf(r)+')ⁿ⁻¹  →  n = '+nf(num));ans=nf(X)+' is the '+num+'th term'}
    else{L.push('n = '+fmt(n,5)+' is not a whole number, so '+nf(X)+' is not a term of this series.');ans=nf(X)+' is not a term';num=null}done=true}
  else if(/common difference/i.test(T)&&kind==='AP'){num=d;ans='The common difference is '+nf(d);done=true}
  else if(/common ratio/i.test(T)&&kind==='GP'){num=r;ans='The common ratio is '+nf(r);done=true}
  else if(/\bnext term\b/i.test(T)){num=tn(n0+1);L.push('Next term = '+(kind==='AP'?nf(a[n0-1])+' + '+nf(d):nf(a[n0-1])+' × '+nf(r))+' = '+nf(num));ans='The next term is '+nf(num);done=true}
  else if(/\bgeneral term|nth term|n-th term\b/i.test(T)){L.push(kind==='AP'?'aₙ = a + (n − 1)d = '+nf(first)+' + (n − 1)('+nf(d)+') = '+ms(E.simp(P(nf(first)+'+(n-1)*'+nf(d)))):'aₙ = a·rⁿ⁻¹ = '+nf(first)+' × ('+nf(r)+')ⁿ⁻¹');ans='see the general term above';done=true}
  if(!done)return null;
  L.push('Answer: '+ans+'.');return R(L,ans,num,'Maths — '+(kind==='AP'?'arithmetic progression':'geometric progression'))});

/* =============== statistics =============== */
const sortN=a=>a.slice().sort((x,y)=>x-y);
function describe(a,opts){
  const n=a.length,sum=a.reduce((s,v)=>s+v,0),mean=sum/n,s=sortN(a);
  const med=n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;
  const cnt={};a.forEach(v=>cnt[v]=(cnt[v]||0)+1);const mx=Math.max(...Object.values(cnt)),modes=Object.keys(cnt).filter(k=>cnt[k]===mx).map(Number);
  const ss=a.reduce((t,v)=>t+(v-mean)*(v-mean),0),dd=opts&&opts.sample?n-1:n,vari=ss/dd,sd=Math.sqrt(vari);
  const md=a.reduce((t,v)=>t+Math.abs(v-mean),0)/n;
  return{n,sum,mean,med,modes,mxc:mx,ss,vari,sd,md,range:s[n-1]-s[0],s,dd}}
add('stats',(T,low)=>{
  if(!/\b(mean|average|median|mode|variance|standard deviation|std|mean deviation|coefficient of variation|range|quartile|sd)\b/.test(low))return null;
  // grouped data with class intervals
  const cls=[...T.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]);
  if(cls.length>=3&&cls.every((c,i)=>i===0||Math.abs(c[0]-cls[i-1][1])<1e-9||Math.abs(c[0]-cls[i-1][0])>0)){
    const rest=T.replace(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/g,' ');
    const fl=lists(rest).find(l=>l.nums.length===cls.length);
    if(fl){const f=fl.nums,N=f.reduce((s,v)=>s+v,0),h=cls[0][1]-cls[0][0],mid=cls.map(c=>(c[0]+c[1])/2);
      const sfm=f.reduce((s,v,i)=>s+v*mid[i],0),mean=sfm/N;
      const L=['Given: classes '+cls.map(c=>c[0]+'-'+c[1]).join(', ')+' with frequencies '+f.join(', '),'Class marks (m) = '+mid.map(nf).join(', '),'N = Σf = '+nf(N)+',  Σfm = '+nf(sfm),'Mean = Σfm / Σf = '+nf(sfm)+' / '+nf(N)+' = '+nf(mean)];
      let cf=0,mi=0;for(let i=0;i<f.length;i++){if(cf+f[i]>=N/2){mi=i;break}cf+=f[i]}
      const med=cls[mi][0]+((N/2-cf)/f[mi])*h;
      L.push('Median class: '+cls[mi][0]+'-'+cls[mi][1]+' (cumulative frequency before it = '+nf(cf)+')','Median = l + [(N/2 − cf)/f] × h = '+nf(cls[mi][0])+' + [('+nf(N/2)+' − '+nf(cf)+')/'+nf(f[mi])+'] × '+nf(h)+' = '+nf(med));
      const k=f.indexOf(Math.max(...f)),f1=f[k],f0=k?f[k-1]:0,f2=k<f.length-1?f[k+1]:0,mode=cls[k][0]+((f1-f0)/(2*f1-f0-f2))*h;
      L.push('Modal class: '+cls[k][0]+'-'+cls[k][1],'Mode = l + [(f₁ − f₀)/(2f₁ − f₀ − f₂)] × h = '+nf(cls[k][0])+' + ['+nf(f1-f0)+'/'+nf(2*f1-f0-f2)+'] × '+nf(h)+' = '+nf(mode));
      const want=/median/.test(low)?'median':/mode/.test(low)?'mode':'mean',v=want==='median'?med:want==='mode'?mode:mean;
      L.push('Answer: '+want+' = '+nf(v));return R(L,want+' = '+nf(v),v,'Statistics — grouped data')}}
  // values with frequencies: x = ..., f = ...
  let data=null,freq=null;
  const mx=/\b(?:x|values?|marks|observations?|data)\b\s*[:=]?\s*((?:-?\d+(?:\.\d+)?\s*,?\s*){3,})/i.exec(T),mf=/\b(?:f|frequenc(?:y|ies))\b\s*[:=]?\s*((?:\d+(?:\.\d+)?\s*,?\s*){3,})/i.exec(T);
  if(mx&&mf){const xs=mx[1].match(/-?\d+(?:\.\d+)?/g).map(Number),fs=mf[1].match(/\d+(?:\.\d+)?/g).map(Number);if(xs.length===fs.length){data=[];xs.forEach((x,i)=>{for(let k=0;k<fs[i];k++)data.push(x)});freq={xs,fs}}}
  if(!data){const ls=lists(T).filter(l=>l.nums.length>=3&&l.nums.every(isFinite));
    if(ls.length)data=ls.sort((a,b)=>b.nums.length-a.nums.length)[0].nums;
    else{const sp=/(?:of|data|observations?|values?|numbers?|marks|:)\s*((?:-?\d+(?:\.\d+)?\s+){2,}-?\d+(?:\.\d+)?)/i.exec(T);if(sp)data=sp[1].trim().split(/\s+/).map(Number)}}
  if(!data||data.length<2)return null;
  const sample=/\b(sample|pandas|dataframe|series|\.std\(|\.var\(|ddof)\b/i.test(T),d=describe(data,{sample});
  const L=['Given data: '+(freq?'x = '+freq.xs.join(', ')+';  f = '+freq.fs.join(', '):data.join(', ')),'n = '+d.n+',  Σx = '+nf(d.sum)];
  const want=[];
  if(/\bmean\b|average/.test(low)&&!/mean deviation/.test(low))want.push('mean');
  if(/median/.test(low))want.push('median');
  if(/\bmode\b/.test(low))want.push('mode');
  if(/variance/.test(low))want.push('var');
  if(/standard deviation|\bsd\b|\bstd\b/.test(low))want.push('sd');
  if(/mean deviation/.test(low))want.push('md');
  if(/\brange\b/.test(low)&&!/interquartile/.test(low))want.push('range');
  if(/coefficient of variation/.test(low))want.push('cv');
  if(!want.length)want.push('mean','median','mode');
  const out=[];
  for(const w of want){
    if(w==='mean'){L.push('Mean x̄ = Σx / n = '+nf(d.sum)+' / '+d.n+' = '+nf(d.mean));out.push('mean = '+nf(d.mean))}
    if(w==='median'){L.push('Arrange in order: '+d.s.join(', '));L.push(d.n%2?'n is odd, so median = the '+((d.n+1)/2)+'th value = '+nf(d.med):'n is even, so median = average of the '+d.n/2+'th and '+(d.n/2+1)+'th values = ('+nf(d.s[d.n/2-1])+' + '+nf(d.s[d.n/2])+') / 2 = '+nf(d.med));out.push('median = '+nf(d.med))}
    if(w==='mode'){L.push(d.mxc===1?'Every value occurs once, so there is no mode.':'Mode = most frequent value = '+d.modes.map(nf).join(', ')+' (occurs '+d.mxc+' times)');out.push('mode = '+(d.mxc===1?'none':d.modes.map(nf).join(', ')))}
    if(w==='var'||w==='sd'){L.push('Σ(x − x̄)² = '+nf(d.ss));
      L.push('Variance '+(sample?'s² = Σ(x − x̄)² / (n − 1)':'σ² = Σ(x − x̄)² / n')+' = '+nf(d.ss)+' / '+d.dd+' = '+nf(d.vari));
      if(w==='sd'||want.includes('sd')){if(w==='sd'){L.push('Standard deviation = √variance = √'+nf(d.vari)+' = '+nf(d.sd));out.push('standard deviation = '+nf(d.sd))}}
      if(w==='var')out.push('variance = '+nf(d.vari))}
    if(w==='md'){L.push('Mean deviation = Σ|x − x̄| / n = '+nf(d.md*d.n)+' / '+d.n+' = '+nf(d.md));out.push('mean deviation = '+nf(d.md))}
    if(w==='range'){L.push('Range = largest − smallest = '+nf(d.s[d.n-1])+' − '+nf(d.s[0])+' = '+nf(d.range));out.push('range = '+nf(d.range))}
    if(w==='cv'){L.push('Coefficient of variation = (σ / mean) × 100 = ('+nf(d.sd)+' / '+nf(d.mean)+') × 100 = '+nf(d.sd/d.mean*100)+'%');out.push('C.V. = '+nf(d.sd/d.mean*100)+'%')}}
  if(sample)L.push('(Sample formula with n − 1 is used because the question refers to a sample / pandas.)');
  L.push('Answer: '+out.join(';  '));
  return R(L,out.join('; '),want[0]==='mean'?d.mean:want[0]==='median'?d.med:want[0]==='sd'?d.sd:want[0]==='var'?d.vari:null,'Statistics')});

/* =============== matrices =============== */
function parseMats(T){
  const out=[],re=/(?:([A-Z])\s*=\s*)?(\[\s*\[[^\]]+\](?:\s*,?\s*\[[^\]]+\])+\s*\]|\[[^\[\]]*;[^\[\]]*\]|\[[^\[\]]*\n[^\[\]]*\]|\|[^|]*;[^|]*\||\([^()]*;[^()]*\))/g;let m;
  while((m=re.exec(T))){
    let body=m[2].replace(/^[\[|(]|[\]|)]$/g,'');
    const rows=(/\]/.test(body)?body.split(/\]\s*,?\s*\[?/).map(r=>r.replace(/[\[\]]/g,'')):body.split(/;|\n/)).map(r=>r.trim()).filter(Boolean).map(r=>r.split(/[\s,]+/).filter(Boolean).map(numOf));
    if(rows.length>=2&&rows.every(r=>r.length===rows[0].length&&r.every(isFinite)))out.push({name:m[1]||null,M:rows,det:m[2][0]==='|'})}
  return out}
const mdet=M=>M.length===1?M[0][0]:M.length===2?M[0][0]*M[1][1]-M[0][1]*M[1][0]:M[0].reduce((s,v,j)=>s+(j%2?-1:1)*v*mdet(M.slice(1).map(r=>r.filter((_,k)=>k!==j))),0);
const minor=(M,i,j)=>M.filter((_,r)=>r!==i).map(r=>r.filter((_,c)=>c!==j));
const cof=M=>M.map((r,i)=>r.map((_,j)=>((i+j)%2?-1:1)*mdet(minor(M,i,j))));
const tr=M=>M[0].map((_,j)=>M.map(r=>r[j]));
const mmul=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,v,k)=>s+v*B[k][j],0)));
const mStr=M=>{const w=Math.max(...M.flat().map(v=>nf(v).length));return M.map(r=>'  [ '+r.map(v=>nf(v).padStart(w)).join('  ')+' ]').join('\n')};
add('matrix',(T,low)=>{
  if(!/\b(matrix|matrices|determinant|det|inverse|adjoint|adjugate|transpose|trace|cofactor)\b|\|\s*A\s*\||A\s*\^\s*-1|A⁻¹/i.test(T))return null;
  const ms2=parseMats(T);if(!ms2.length)return null;
  const A=ms2[0],B=ms2[1];
  const L=['Given: '+(A.name||'A')+' =\n'+mStr(A.M)+(B?'\n'+(B.name||'B')+' =\n'+mStr(B.M):'')];
  const n=A.M.length,sq=A.M.every(r=>r.length===n);
  const wantDet=/determinant|\bdet\b|\|\s*A\s*\||value of the determinant/i.test(T)||A.det,wantInv=/inverse|A\s*\^\s*-1|A⁻¹/i.test(T),wantAdj=/adjoint|adjugate/i.test(T),wantTr=/transpose/i.test(T),wantTrace=/\btrace\b/i.test(T);
  if(B&&/\b(product|multiply|multiplication|AB)\b/i.test(T)){
    if(A.M[0].length!==B.M.length)return R(L.concat(['The product AB is not defined because the number of columns of A ≠ the number of rows of B.']),'not defined',null,'Matrices');
    const C=mmul(A.M,B.M);L.push('AB: multiply each row of A with each column of B and add the products.');L.push('AB =\n'+mStr(C));L.push('Answer: AB =\n'+mStr(C));return R(L,'AB',null,'Maths — matrices')}
  if(B&&/\b(sum|add|addition|A\s*\+\s*B)\b/i.test(T)&&A.M.length===B.M.length){const C=A.M.map((r,i)=>r.map((v,j)=>v+B.M[i][j]));L.push('Add corresponding elements.');L.push('A + B =\n'+mStr(C));L.push('Answer: A + B =\n'+mStr(C));return R(L,'A+B',null,'Maths — matrices')}
  if(B&&/\b(difference|subtract|A\s*-\s*B)\b/i.test(T)&&A.M.length===B.M.length){const C=A.M.map((r,i)=>r.map((v,j)=>v-B.M[i][j]));L.push('Subtract corresponding elements.');L.push('A − B =\n'+mStr(C));L.push('Answer: A − B =\n'+mStr(C));return R(L,'A−B',null,'Maths — matrices')}
  if(wantTr&&!wantInv){const C=tr(A.M);L.push('Interchange rows and columns.');L.push('Aᵀ =\n'+mStr(C));L.push('Answer: Aᵀ =\n'+mStr(C));return R(L,'Aᵀ',null,'Maths — matrices')}
  if(wantTrace&&sq){const t=A.M.reduce((s,r,i)=>s+r[i],0);L.push('Trace = sum of the diagonal elements = '+A.M.map((r,i)=>nf(r[i])).join(' + ')+' = '+nf(t));L.push('Answer: '+nf(t));return R(L,nf(t),t,'Maths — matrices')}
  if(!sq||n>3)return null;
  const D=mdet(A.M);
  if(wantDet||wantInv||wantAdj){
    if(n===2)L.push('|A| = ad − bc = ('+nf(A.M[0][0])+')('+nf(A.M[1][1])+') − ('+nf(A.M[0][1])+')('+nf(A.M[1][0])+') = '+nf(D));
    else{L.push('Expand along the first row:');const t=A.M[0].map((v,j)=>(j%2?'−':'+')+' ('+nf(v)+')('+nf(mdet(minor(A.M,0,j)))+')');L.push('|A| = '+t.join(' ').replace(/^\+ /,'')+' = '+nf(D))}
    if(wantDet&&!wantInv&&!wantAdj){L.push('Answer: |A| = '+nf(D));return R(L,nf(D),D,'Maths — determinant')}
    const adj=tr(cof(A.M));
    L.push('Cofactor matrix:\n'+mStr(cof(A.M)));L.push('adj A = transpose of the cofactor matrix =\n'+mStr(adj));
    if(wantAdj&&!wantInv){L.push('Answer: adj A =\n'+mStr(adj));return R(L,'adj A',null,'Maths — adjoint')}
    if(Math.abs(D)<1e-12){L.push('Since |A| = 0, A is singular and A⁻¹ does not exist.');return R(L,'A is singular',null,'Maths — inverse')}
    const inv=adj.map(r=>r.map(v=>v/D));
    L.push('A⁻¹ = adj A / |A| = (1/'+nf(D)+') adj A =\n'+mStr(inv));L.push('Answer: A⁻¹ =\n'+mStr(inv));return R(L,'A⁻¹',null,'Maths — inverse of a matrix')}
  return null});

/* =============== vectors =============== */
function vecFrom(s){
  let m=/^\s*[(<\[]\s*(-?[\d./]+)\s*,\s*(-?[\d./]+)(?:\s*,\s*(-?[\d./]+))?\s*[)>\]]\s*$/.exec(s);
  if(m)return[numOf(m[1]),numOf(m[2]),m[3]!==undefined?numOf(m[3]):0];
  const v=[0,0,0];let ok=false;
  s.replace(/([+-]?)\s*(\d*(?:\.\d+)?)\s*\*?\s*([ijk])\b/g,(mm,sg,n,c)=>{ok=true;v['ijk'.indexOf(c)]+=(sg==='-'?-1:1)*(n===''?1:+n);return''});
  return ok?v:null}
function findVecs(T){
  const out=[],re=/(?:(?:vector\s+)?([a-zA-Z])\s*(?:=|:)\s*|\bvectors?\s+)((?:[+-]?\s*\d*(?:\.\d+)?\s*\*?\s*[ijk]\b\s*)+|[(<\[]\s*-?[\d./]+\s*,\s*-?[\d./]+(?:\s*,\s*-?[\d./]+)?\s*[)>\]])/g;let m;
  while((m=re.exec(T))){const v=vecFrom(m[2].trim());if(v)out.push({name:m[1]||null,v,txt:cut(m[2])})}
  if(out.length<2){const re2=/((?:[+-]?\s*\d*(?:\.\d+)?\s*[ijk]\b\s*){2,})/g;let k;const found=[];while((k=re2.exec(T))){const v=vecFrom(k[1].trim());if(v)found.push({name:null,v,txt:cut(k[1])})}if(found.length>out.length)return found}
  return out}
const vs=v=>'('+v.map(nf).join(', ')+')',vij=v=>{const t=['i','j','k'].map((c,i)=>v[i]===0?'':(v[i]<0?'−':'+')+(Math.abs(v[i])===1?'':nf(Math.abs(v[i])))+c).join('').replace(/^\+/,'');return t||'0'};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],mag=a=>Math.sqrt(dot(a,a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
add('vectors',(T,low)=>{
  if(!/\b(vector|vectors|dot product|scalar product|cross product|magnitude|modulus|unit vector|projection|direction cosines|parallelogram|perpendicular|angle between)\b/i.test(T))return null;
  const V=findVecs(T);if(!V.length)return null;
  const a=V[0].v,b=V[1]&&V[1].v,an=V[0].name||'a',bn=(V[1]&&V[1].name)||'b';
  const L=['Given: '+an+' = '+vij(a)+(b?',  '+bn+' = '+vij(b):'')];
  if(b&&/cross product|vector product|a\s*×\s*b|\*\s*b|area of (?:the )?(?:parallelogram|triangle)/i.test(T)){
    const c=cross(a,b);L.push('a × b = |i j k; '+a.map(nf).join(' ')+'; '+b.map(nf).join(' ')+'|');
    L.push('= i('+nf(a[1]*b[2])+' − '+nf(a[2]*b[1])+') − j('+nf(a[0]*b[2])+' − '+nf(a[2]*b[0])+') + k('+nf(a[0]*b[1])+' − '+nf(a[1]*b[0])+') = '+vij(c));
    if(/area/i.test(T)){const ar=mag(c)*(/triangle/i.test(T)&&!/parallelogram/i.test(T)?0.5:1);L.push('|a × b| = √('+c.map(x=>nf(x*x)).join(' + ')+') = '+nf(mag(c)));L.push('Area = '+(/triangle/i.test(T)&&!/parallelogram/i.test(T)?'½ |a × b|':'|a × b|')+' = '+nf(ar)+' square units');L.push('Answer: '+nf(ar)+' square units');return R(L,nf(ar),ar,'Maths — vectors')}
    L.push('Answer: '+an+' × '+bn+' = '+vij(c));return R(L,vij(c),null,'Maths — vectors')}
  if(b&&/angle between/i.test(T)){const d=dot(a,b),c=d/(mag(a)*mag(b)),th=Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;
    L.push('a · b = '+a.map((x,i)=>'('+nf(x)+')('+nf(b[i])+')').join(' + ')+' = '+nf(d),'|a| = '+nf(mag(a))+',  |b| = '+nf(mag(b)),'cos θ = a·b / (|a||b|) = '+nf(d)+' / ('+nf(mag(a))+' × '+nf(mag(b))+') = '+fmt(c,5),'θ = cos⁻¹('+fmt(c,5)+') = '+nf(th)+'°','Answer: θ = '+nf(th)+'°');return R(L,nf(th)+'°',th,'Maths — vectors')}
  if(b&&/projection|component of/i.test(T)){const d=dot(a,b),p=d/mag(b);L.push('Projection of a on b = (a · b) / |b| = '+nf(d)+' / '+nf(mag(b))+' = '+nf(p),'Answer: '+nf(p));return R(L,nf(p),p,'Maths — vectors')}
  if(b&&/perpendicular|orthogonal/i.test(T)&&!/dot product|scalar product/i.test(T)){const d=dot(a,b);L.push('a · b = '+nf(d),d===0?'Since a · b = 0, the vectors are perpendicular.':'Since a · b ≠ 0, the vectors are not perpendicular.');return R(L,d===0?'perpendicular':'not perpendicular',d,'Maths — vectors')}
  if(b&&/dot product|scalar product|a\s*\.\s*b|a·b/i.test(T)){const d=dot(a,b);L.push('a · b = '+a.map((x,i)=>'('+nf(x)+')('+nf(b[i])+')').join(' + ')+' = '+nf(d),'Answer: a · b = '+nf(d));return R(L,nf(d),d,'Maths — vectors')}
  if(/unit vector/i.test(T)){const m2=mag(a);L.push('|a| = √('+a.map(x=>nf(x*x)).join(' + ')+') = '+nf(m2),'â = a / |a| = ('+vij(a)+') / '+nf(m2),'Answer: â = '+vs(a.map(x=>x/m2)));return R(L,vs(a.map(x=>x/m2)),null,'Maths — vectors')}
  if(/direction cosines/i.test(T)){const m2=mag(a),dc=a.map(x=>x/m2);L.push('|a| = '+nf(m2),'l = '+nf(a[0])+'/'+nf(m2)+',  m = '+nf(a[1])+'/'+nf(m2)+',  n = '+nf(a[2])+'/'+nf(m2),'Answer: direction cosines = '+vs(dc));return R(L,vs(dc),null,'Maths — vectors')}
  if(/magnitude|modulus|length|\|a\|/i.test(T)){const m2=mag(a);L.push('|a| = √(x² + y² + z²) = √('+a.map(x=>nf(x*x)).join(' + ')+') = '+nf(m2),'Answer: |a| = '+nf(m2));return R(L,nf(m2),m2,'Maths — vectors')}
  return null});

/* =============== coordinate geometry =============== */
function findPts(T){const out=[],re=/(?:\b([A-Z])\s*)?\(\s*(-?[\d./]+)\s*,\s*(-?[\d./]+)(?:\s*,\s*(-?[\d./]+))?\s*\)/g;let m;
  while((m=re.exec(T))){const p=[numOf(m[2]),numOf(m[3])];if(m[4]!==undefined)p.push(numOf(m[4]));if(p.every(isFinite))out.push({n:m[1]||null,p})}
  return out}
const pt=p=>'('+p.map(nf).join(', ')+')';
function conicOf(L,Rr){
  const f=(x,y)=>E.ev(L,{x,y})-E.ev(Rr,{x,y});
  try{const f00=f(0,0),f10=f(1,0),fm0=f(-1,0),f01=f(0,1),f0m=f(0,-1),f11=f(1,1),F=f00,A=(f10+fm0)/2-F,D=(f10-fm0)/2,C=(f01+f0m)/2-F,Ee=(f01-f0m)/2,B=f11-A-C-D-Ee-F;
    const chk=A*4+B*6+C*9+D*2+Ee*3+F;if(Math.abs(f(2,3)-chk)>1e-7*Math.max(1,Math.abs(chk)))return null;return{A,B,C,D,E:Ee,F}}catch(e){return null}}
add('geometry',(T,low)=>{
  if(!/\b(distance|midpoint|mid-point|section formula|divides|ratio|slope|gradient|equation of (?:the )?(?:straight )?line|line passing|line joining|area of (?:the )?triangle|centroid|collinear|circle|parabola|ellipse|hyperbola|focus|foci|eccentricity|latus rectum|directrix|y-intercept|angle between)\b/i.test(T))return null;
  const pts=findPts(T);
  // conic / circle / line from an equation
  const eqm=/([^=;?\n]*?[xy][^=;?\n]*)=([^=;?\n]*)/.exec(T.replace(/^[^:]*:\s*/,''));
  if(/\b(circle|parabola|ellipse|hyperbola|focus|foci|eccentricity|latus rectum|directrix|centre|center|radius)\b/i.test(T)&&eqm&&!(/centre|center/i.test(T)&&/radius/i.test(T)&&pts.length&&/equation of/i.test(T))){
    let Ls=eqm[1].replace(/^.*?(?:equation|circle|parabola|ellipse|hyperbola)[^x-y\d(]*?(?=[-+\d(xy])/i,'').replace(/^\W+/,''),Rs=eqm[2].replace(/\b(find|then|and|where)\b.*$/i,'').replace(/[.,]\s*$/,'');
    try{const c=conicOf(P(fixExpr(Ls)),P(fixExpr(Rs)));
      if(c&&Math.abs(c.B)<1e-9){const{A,C,D,E:Ee,F}=c,h=A?-D/(2*A):0,k=C?-Ee/(2*C):0;
        const L=['Given: '+cut(eqm[1])+' = '+cut(Rs)];
        if(A&&C&&Math.abs(A-C)<1e-9&&/circle|centre|center|radius/i.test(T)){const r2=h*h+k*k-F/A;if(r2>0){const r=Math.sqrt(r2);
          L.push('Divide by '+nf(A)+' and compare with x² + y² + 2gx + 2fy + c = 0:  g = '+nf(D/(2*A))+', f = '+nf(Ee/(2*A))+', c = '+nf(F/A));
          L.push('Centre = (−g, −f) = '+pt([h,k]),'Radius = √(g² + f² − c) = √('+nf(r2)+') = '+nf(r),'Answer: centre '+pt([h,k])+', radius '+nf(r));return R(L,'centre '+pt([h,k])+', radius '+nf(r),r,'Maths — circle')}}
        if((!A||!C)&&(A||C)&&/parabola|focus|directrix|latus/i.test(T)||(!A!==!C&&!/ellipse|hyperbola/i.test(T))){
          if(C&&!A&&D){const a=-D/(4*C),y0=k,x0=-(F-Ee*Ee/(4*C))/D;L.push('Standard form (y − k)² = 4a(x − h):  vertex = '+pt([x0,y0])+',  4a = '+nf(4*a)+'  →  a = '+nf(a));
            L.push('Focus = '+pt([x0+a,y0]),'Directrix: x = '+nf(x0-a),'Axis: y = '+nf(y0),'Length of latus rectum = |4a| = '+nf(Math.abs(4*a)),'Answer: focus '+pt([x0+a,y0])+', directrix x = '+nf(x0-a)+', latus rectum = '+nf(Math.abs(4*a)));return R(L,'focus '+pt([x0+a,y0]),null,'Maths — parabola')}
          if(A&&!C&&Ee){const a=-Ee/(4*A),x0=h,y0=-(F-D*D/(4*A))/Ee;L.push('Standard form (x − h)² = 4a(y − k):  vertex = '+pt([x0,y0])+',  4a = '+nf(4*a)+'  →  a = '+nf(a));
            L.push('Focus = '+pt([x0,y0+a]),'Directrix: y = '+nf(y0-a),'Axis: x = '+nf(x0),'Length of latus rectum = |4a| = '+nf(Math.abs(4*a)),'Answer: focus '+pt([x0,y0+a])+', directrix y = '+nf(y0-a)+', latus rectum = '+nf(Math.abs(4*a)));return R(L,'focus '+pt([x0,y0+a]),null,'Maths — parabola')}}
        if(A&&C&&A*C>0&&Math.abs(A-C)>1e-9){const K=-(F-(A?D*D/(4*A):0)-(C?Ee*Ee/(4*C):0)),a2x=K/A,a2y=K/C;
          if(a2x>0&&a2y>0){const major=a2x>=a2y?'x':'y',a2=Math.max(a2x,a2y),b2=Math.min(a2x,a2y),a=Math.sqrt(a2),b=Math.sqrt(b2),cc=Math.sqrt(a2-b2),e=cc/a;
            L.push('Write in standard form: (x − h)²/'+nf(a2x)+' + (y − k)²/'+nf(a2y)+' = 1  with centre '+pt([h,k]));
            L.push('a² = '+nf(a2)+' (a = '+nf(a)+'),  b² = '+nf(b2)+' (b = '+nf(b)+'),  major axis along the '+major+'-axis','c = √(a² − b²) = '+nf(cc),'Eccentricity e = c/a = '+nf(e));
            L.push('Foci = '+(major==='x'?pt([h-cc,k])+' and '+pt([h+cc,k]):pt([h,k-cc])+' and '+pt([h,k+cc])),'Length of major axis = 2a = '+nf(2*a)+',  minor axis = 2b = '+nf(2*b),'Latus rectum = 2b²/a = '+nf(2*b2/a));
            L.push('Answer: e = '+nf(e)+', foci '+(major==='x'?pt([h-cc,k])+', '+pt([h+cc,k]):pt([h,k-cc])+', '+pt([h,k+cc]))+', latus rectum = '+nf(2*b2/a));return R(L,'e = '+nf(e),e,'Maths — ellipse')}}
        if(A&&C&&A*C<0){const K=-(F-D*D/(4*A)-Ee*Ee/(4*C)),tx=K/A>0,a2=tx?K/A:K/C,b2=tx?-K/C:-K/A;
          if(a2>0&&b2>0){const a=Math.sqrt(a2),b=Math.sqrt(b2),cc=Math.sqrt(a2+b2),e=cc/a;
            L.push('Standard form: '+(tx?'(x − h)²/'+nf(a2)+' − (y − k)²/'+nf(b2):'(y − k)²/'+nf(a2)+' − (x − h)²/'+nf(b2))+' = 1  with centre '+pt([h,k]));
            L.push('a² = '+nf(a2)+',  b² = '+nf(b2)+',  c = √(a² + b²) = '+nf(cc),'Eccentricity e = c/a = '+nf(e),'Foci = '+(tx?pt([h-cc,k])+' and '+pt([h+cc,k]):pt([h,k-cc])+' and '+pt([h,k+cc])),'Transverse axis = 2a = '+nf(2*a)+',  conjugate axis = 2b = '+nf(2*b),'Latus rectum = 2b²/a = '+nf(2*b2/a));
            L.push('Answer: e = '+nf(e)+', foci '+(tx?pt([h-cc,k])+', '+pt([h+cc,k]):pt([h,k-cc])+', '+pt([h,k+cc]))+', latus rectum = '+nf(2*b2/a));return R(L,'e = '+nf(e),e,'Maths — hyperbola')}}}}catch(e){}}
  // circle from centre and radius
  if(/circle/i.test(T)&&/equation/i.test(T)&&pts.length&&/radius/i.test(T)){
    const rm=/radius\s*(?:=|is|of)?\s*(-?\d+(?:\.\d+)?)/i.exec(T);if(rm){const c=pts[0].p,r=+rm[1];
      return R(['Given: centre '+pt(c)+', radius '+nf(r),'Equation of a circle: (x − h)² + (y − k)² = r²','(x − ('+nf(c[0])+'))² + (y − ('+nf(c[1])+'))² = '+nf(r*r),'Answer: '+ms(E.simp(P('(x-('+c[0]+'))^2+(y-('+c[1]+'))^2')))+' = '+nf(r*r)],'(x − h)² + (y − k)² = r²',null,'Maths — circle')}}
  // distance from a point to a line
  if(/distance of (?:the )?point|perpendicular distance|distance from (?:the )?point/i.test(T)&&pts.length>=1){
    const lm=/([^,;?\n]*[xy][^,;?\n]*=\s*0)/.exec(T);
    if(lm){let lt=lm[1].replace(/^.*?\bline\b\s*/i,'').replace(/^.*?:\s*/,'');try{const g=P(fixExpr(lt.split('=')[0])),a=E.ev(g,{x:1,y:0})-E.ev(g,{x:0,y:0}),b=E.ev(g,{x:0,y:1})-E.ev(g,{x:0,y:0}),c=E.ev(g,{x:0,y:0}),p=pts[0].p,num=Math.abs(a*p[0]+b*p[1]+c),den=Math.sqrt(a*a+b*b);
      return R(['Given: point '+pt(p)+' and line '+nf(a)+'x + '+nf(b)+'y + '+nf(c)+' = 0','Distance = |ax₁ + by₁ + c| / √(a² + b²)','= |'+nf(a)+'('+nf(p[0])+') + '+nf(b)+'('+nf(p[1])+') + '+nf(c)+'| / √('+nf(a*a)+' + '+nf(b*b)+') = '+nf(num)+' / '+nf(den),'Answer: '+nf(num/den)+' units'],nf(num/den),num/den,'Maths — straight lines')}catch(e){}}}
  // slope-intercept
  let m=/slope\s*(?:=|of|is)?\s*(-?[\d./]+)[^]*?(?:y-?intercept|intercept on the y-axis)\s*(?:=|of|is)?\s*(-?[\d./]+)/i.exec(T);
  if(m&&/equation/i.test(T)){const s=numOf(m[1]),c=numOf(m[2]);return R(['Given: slope m = '+nf(s)+', y-intercept c = '+nf(c),'Use y = mx + c','y = '+nf(s)+'x + '+nf(c),'Answer: y = '+ms(E.simp(P(s+'x+('+c+')')))],'y = mx + c',null,'Maths — straight lines')}
  m=/angle between[^]*?slopes?\s*(?:of\s*)?(-?[\d./]+)\s*(?:and|,)\s*(-?[\d./]+)/i.exec(T);
  if(m){const m1=numOf(m[1]),m2=numOf(m[2]),t=Math.abs((m1-m2)/(1+m1*m2)),th=Math.atan(t)*180/Math.PI;return R(['Given: m₁ = '+nf(m1)+', m₂ = '+nf(m2),'tan θ = |(m₁ − m₂)/(1 + m₁m₂)| = '+nf(t),'θ = '+nf(th)+'°','Answer: '+nf(th)+'°'],nf(th)+'°',th,'Maths — straight lines')}
  if(pts.length<1)return null;
  const d=pts[0].p.length,A=pts[0].p,B=pts[1]&&pts[1].p,C=pts[2]&&pts[2].p,nm=(i,def)=>pts[i]&&pts[i].n||def;
  const dist=(p,q)=>Math.sqrt(p.reduce((s,v,i)=>s+(v-q[i])*(v-q[i]),0));
  if(B&&/\bmid-?point\b/i.test(T)){const mp=A.map((v,i)=>(v+B[i])/2);return R(['Given: '+nm(0,'A')+pt(A)+', '+nm(1,'B')+pt(B),'Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2'+(d===3?', (z₁ + z₂)/2':'')+')','= '+pt(A.map((v,i)=>'('+nf(v)+' + '+nf(B[i])+')/2').map(s=>s)).replace(/,/g,',')+' = '+pt(mp),'Answer: midpoint = '+pt(mp)],pt(mp),null,'Maths — coordinate geometry')}
  const rm=/(?:ratio|in the ratio)\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/i.exec(T);
  if(B&&rm&&/divid|section|ratio/i.test(T)){const m1=+rm[1],n1=+rm[2],ext=/external/i.test(T),dn=ext?m1-n1:m1+n1;
    if(dn===0)return null;const P2=A.map((v,i)=>ext?(m1*B[i]-n1*v)/dn:(m1*B[i]+n1*v)/dn);
    return R(['Given: '+nm(0,'A')+pt(A)+', '+nm(1,'B')+pt(B)+', ratio m : n = '+m1+' : '+n1+(ext?' (externally)':' (internally)'),'Section formula: x = ('+(ext?'mx₂ − nx₁':'mx₂ + nx₁')+')/('+(ext?'m − n':'m + n')+'), similarly for y'+(d===3?' and z':''),'x = ('+nf(m1)+'×'+nf(B[0])+(ext?' − ':' + ')+nf(n1)+'×'+nf(A[0])+')/'+nf(dn)+' = '+nf(P2[0]),'y = ('+nf(m1)+'×'+nf(B[1])+(ext?' − ':' + ')+nf(n1)+'×'+nf(A[1])+')/'+nf(dn)+' = '+nf(P2[1]),'Answer: the point is '+pt(P2)],pt(P2),null,'Maths — section formula')}
  if(B&&/\bslope|gradient\b/i.test(T)&&d===2){const s=(B[1]-A[1])/(B[0]-A[0]);return R(['Given: '+pt(A)+' and '+pt(B),'Slope m = (y₂ − y₁)/(x₂ − x₁) = ('+nf(B[1])+' − '+nf(A[1])+')/('+nf(B[0])+' − '+nf(A[0])+')',isFinite(s)?'Answer: m = '+nf(s):'x₂ = x₁, so the line is vertical and the slope is not defined.'],isFinite(s)?nf(s):'undefined',isFinite(s)?s:null,'Maths — straight lines')}
  if(B&&/equation of (?:the )?(?:straight )?line|line (?:passing|joining)/i.test(T)&&d===2){
    if(A[0]===B[0])return R(['Both points have x = '+nf(A[0]),'Answer: the line is vertical: x = '+nf(A[0])],'x = '+nf(A[0]),null,'Maths — straight lines');
    const s=(B[1]-A[1])/(B[0]-A[0]),c=A[1]-s*A[0];
    return R(['Given: '+pt(A)+' and '+pt(B),'Slope m = (y₂ − y₁)/(x₂ − x₁) = ('+nf(B[1])+' − '+nf(A[1])+')/('+nf(B[0])+' − '+nf(A[0])+') = '+nf(s),'Point-slope form: y − y₁ = m(x − x₁)  →  y − '+nf(A[1])+' = '+nf(s)+'(x − '+nf(A[0])+')','y = '+nf(s)+'x + '+nf(c),'Answer: y = '+ms(E.simp(P(s+'x+('+c+')')))+'   (or '+ms(E.simp(P((-s)+'x+y+('+(-c)+')')))+' = 0)'],'y = '+nf(s)+'x + '+nf(c),null,'Maths — straight lines')}
  if(C&&/area of (?:the )?triangle/i.test(T)&&d===2){const ar=Math.abs(A[0]*(B[1]-C[1])+B[0]*(C[1]-A[1])+C[0]*(A[1]-B[1]))/2;
    return R(['Given vertices: '+pt(A)+', '+pt(B)+', '+pt(C),'Area = ½ |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|','= ½ |'+nf(A[0])+'('+nf(B[1]-C[1])+') + '+nf(B[0])+'('+nf(C[1]-A[1])+') + '+nf(C[0])+'('+nf(A[1]-B[1])+')| = '+nf(ar),'Answer: '+nf(ar)+' square units'],nf(ar),ar,'Maths — coordinate geometry')}
  if(C&&/centroid/i.test(T)){const g=A.map((v,i)=>(v+B[i]+C[i])/3);return R(['Centroid = ((x₁ + x₂ + x₃)/3, (y₁ + y₂ + y₃)/3)','= '+pt(g),'Answer: '+pt(g)],pt(g),null,'Maths — coordinate geometry')}
  if(C&&/collinear/i.test(T)&&d===2){const ar=A[0]*(B[1]-C[1])+B[0]*(C[1]-A[1])+C[0]*(A[1]-B[1]);return R(['The points are collinear if the area of the triangle they form is zero.','½ |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = '+nf(Math.abs(ar)/2),'Answer: the points are '+(Math.abs(ar)<1e-9?'collinear':'not collinear')],Math.abs(ar)<1e-9?'collinear':'not collinear',null,'Maths — coordinate geometry')}
  if((B&&/\bdistance|length\b/i.test(T))||(pts.length===1&&/from the origin/i.test(T))){const Q=B||A.map(()=>0),P1=B?A:A,dd=dist(P1,Q);
    return R(['Given: '+(B?nm(0,'A')+pt(A)+' and '+nm(1,'B')+pt(B):'point '+pt(A)+' and the origin'),'Distance formula: d = √[(x₂ − x₁)² + (y₂ − y₁)²'+(d===3?' + (z₂ − z₁)²':'')+']','d = √['+P1.map((v,i)=>'('+nf(Q[i])+' − '+nf(v)+')²').join(' + ').replace(/ − −/g,' + ')+'] = √'+nf(P1.reduce((s,v,i)=>s+(v-Q[i])*(v-Q[i]),0)),'Answer: d = '+nf(dd)+' units'],nf(dd),dd,'Maths — coordinate geometry')}
  return null});

/* =============== complex numbers =============== */
add('complex',(T,low)=>{
  if(!/\b(complex|modulus|argument|conjugate|polar form|iota|imaginary|real part|amplitude|a\s*\+\s*ib)\b|\d\s*i\b|(?<![A-Za-z])i\s*\^\s*\d+/i.test(T)||/\bvectors?\b|\d\s*[jk]\b|dot product|cross product/i.test(T))return null;
  const cands=[...T.matchAll(/(?:\d+(?:\.\d+)?|(?<![A-Za-z])i(?![A-Za-z])|sqrt\([^)]*\)|[()+\-*\/^]|\s)+/g)].map(m=>cut(m[0])).filter(s=>/(?:\d|^|[+\-*(\s])i(?![A-Za-z])/.test(' '+s)&&/[\d)]/.test(s));
  if(!cands.length)return null;
  cands.sort((a,b)=>b.length-a.length);
  let ast=null,txt=null;for(const c of cands){try{ast=P(c);if(ast&&[...E.vars(ast)].every(v=>v==='i')){txt=c;break}ast=null}catch(e){ast=null}}
  if(!ast)return null;
  let z;try{z=E.evc(ast)}catch(e){return null}
  if(!z.every(isFinite))return null;
  const r=E.cx.abs(z),th=E.cx.arg(z),L=['Given: z = '+txt];
  const simple=/^\s*\(?\s*-?\d*\.?\d*\s*[+-]\s*\d*\.?\d*\s*\*?i\s*\)?\s*$/.test(txt);
  if(!simple)L.push('Simplify using i² = −1:  z = '+E.cxStr(z));
  const wm=/\b(modulus|absolute value|magnitude)\b/i.test(T),wa=/\b(argument|amplitude|principal)\b/i.test(T),wc=/\bconjugate\b/i.test(T),wp=/\bpolar\b/i.test(T),wi=/(multiplicative )?inverse|reciprocal/i.test(T);
  let ans=null,num=null;
  if(/(?<![A-Za-z])i\s*\^\s*\d+/.test(txt)&&/^\s*i\s*\^\s*\d+\s*$/.test(txt)){const n=+/\^\s*(\d+)/.exec(txt)[1];L.push('i² = −1, i³ = −i, i⁴ = 1, so the powers repeat every 4.','n mod 4 = '+(n%4)+'  →  i'+sup(n)+' = '+E.cxStr(z));ans='i'+sup(n)+' = '+E.cxStr(z)}
  if(wc){L.push('Conjugate of a + ib is a − ib.','z̄ = '+E.cxStr(E.cx.conj(z)));ans='conjugate = '+E.cxStr(E.cx.conj(z))}
  if(wi){const m2=r*r,inv=[z[0]/m2,-z[1]/m2];L.push('1/z = z̄ / |z|² = ('+E.cxStr(E.cx.conj(z))+') / '+nf(m2),'= '+E.cxStr(inv));ans='1/z = '+E.cxStr(inv)}
  if(wm||wp||wa){
    L.push('|z| = √(a² + b²) = √('+nf(z[0]*z[0])+' + '+nf(z[1]*z[1])+') = '+nf(r));
    if(wa||wp){const q=z[0]>=0&&z[1]>=0?'first':z[0]<0&&z[1]>=0?'second':z[0]<0&&z[1]<0?'third':'fourth';
      L.push('z lies in the '+q+' quadrant, so the principal argument θ = '+(Math.abs(z[0])>1e-12?'tan⁻¹(b/a) adjusted for the quadrant':'±π/2')+' = '+(nice(th)||fmt(th,5))+' rad ('+nf(th*180/Math.PI)+'°)')}
    if(wp)L.push('Polar form: z = r(cos θ + i sin θ) = '+nf(r)+'(cos '+(nice(th)||fmt(th,4))+' + i sin '+(nice(th)||fmt(th,4))+')');
    ans=wp?'z = '+nf(r)+'(cos '+(nice(th)||fmt(th,4))+' + i sin '+(nice(th)||fmt(th,4))+')':wa&&!wm?'arg z = '+(nice(th)||fmt(th,5))+' rad':'|z| = '+nf(r);num=wa&&!wm?th:r}
  if(!ans){ans='z = '+E.cxStr(z);L.push('Real part = '+nf(z[0])+',  imaginary part = '+nf(z[1]))}
  L.push('Answer: '+ans);return R(L,ans,num,'Maths — complex numbers')});

/* =============== evaluate expressions (trig values, arithmetic) =============== */
const TRIGX={'sin15':'(√6 − √2)/4','cos15':'(√6 + √2)/4','tan15':'2 − √3','sin75':'(√6 + √2)/4','cos75':'(√6 − √2)/4','tan75':'2 + √3'};
add('evaluate',(T,low)=>{
  const m=/\b(?:find the value of|find the exact value of|evaluate|simplify|calculate|compute|what is the value of|value of|what is)\s*:?\s*(.+)$/i.exec(T.replace(/\n/g,' '));
  if(!m)return null;
  let ex=cut(m[1]).replace(/[.?]\s*$/,'');
  if(!/\d|pi/.test(ex)||/=/.test(ex)||!/^[\w\s().+\-*\/^°√!,|{}\[\]]+$/.test(ex)||!isMathy(ex.replace(/degrees?|deg/gi,'')))return null;
  ex=fixExpr(ex).replace(/(\d+(?:\.\d+)?)\s*(?:°|degrees?\b|deg\b)/gi,'($1*pi/180)').replace(/\blog\s*_\s*(\d+)\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/gi,'(ln($2)/ln($1))').replace(/(\d+)\s*!/g,(a,n)=>String(factN(+n)));
  let ast;try{ast=P(ex)}catch(e){return null}
  if([...E.vars(ast)].length)return null;
  let v;try{v=E.ev(ast,{})}catch(e){return null}
  if(!isFinite(v))return null;
  const L=['Given: '+cut(m[1]).replace(/[.?]\s*$/,'')];
  const seen=new Set();
  for(const f of m[1].matchAll(/(sin|cos|tan|cot|sec|cosec)\s*\(?\s*(\d+(?:\.\d+)?)\s*°/gi)){const nm=f[1].toLowerCase(),a=+f[2],k=nm+a;if(seen.has(k))continue;seen.add(k);
    const val=E.FUN[nm==='cosec'?'cosec':nm](a*Math.PI/180),ex2=TRIGX[nm+a],nn=nice(val);L.push(nm+' '+a+'° = '+(ex2?ex2+' ≈ '+fmt(val,5):(nn&&nn!==String(fmt(val,6))?nn:fmt(val,6))))}
  const top=ast.t==='f'&&['asin','acos','atan'].includes(ast.n);
  if(top){const deg=v*180/Math.PI;L.push('Principal value: '+(nice(v)||fmt(v,6))+' radians = '+nf(deg)+'°');L.push('Answer: '+(nice(v)||fmt(v,6))+' rad ('+nf(deg)+'°)');return R(L,(nice(v)||fmt(v,6))+' rad',v,'Maths — inverse trigonometric functions')}
  const nn=nice(v);L.push('Answer: '+(nn&&nn!==nf(v)?nn+' ≈ '+fmt(v,6):nf(v)));return R(L,nn||fmt(v,6),v,'Maths — evaluation')});
function factN(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r}

/* =============== counting: permutations, combinations, binomial theorem =============== */
const bf=n=>{let r=1n;for(let i=2n;i<=BigInt(n);i++)r*=i;return r};
const bnPr=(n,r)=>bf(n)/bf(n-r),bnCr=(n,r)=>bf(n)/(bf(r)*bf(n-r));
add('counting',(T,low)=>{
  let m;
  if((m=/\b(\d+)\s*!/.exec(T))||(m=/factorial of\s+(\d+)/i.exec(T))){const n=+m[1];if(n<=60&&/factorial|!|find|value/i.test(T)&&!/[a-z]\s*!\s*=/.test(T)){const terms=[];for(let i=n;i>=Math.max(1,n-5);i--)terms.push(i);
    return R(['n! = n × (n − 1) × … × 2 × 1','Given n = '+n,n+'! = '+terms.join(' × ')+(n>6?' × … × 1':'')+' = '+bf(n),'Answer: '+n+'! = '+bf(n)],String(bf(n)),Number(bf(n)),'Maths — factorial')}}
  if((m=/\b(\d+)\s*P\s*(\d+)\b/.exec(T))||(m=/\bP\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(T))||(m=/\^(\d+)P_?(\d+)/.exec(T))){const n=+m[1],r=+m[2];if(r<=n&&n<=60){const v=bnPr(n,r);
    return R(['nPr = n! / (n − r)!','Given n = '+n+', r = '+r,n+'P'+r+' = '+n+'! / '+(n-r)+'! = '+v,'Answer: '+v],String(v),Number(v),'Maths — permutations')}}
  if((m=/\b(\d+)\s*C\s*(\d+)\b/.exec(T))||(m=/\bC\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(T))||(m=/\^(\d+)C_?(\d+)/.exec(T))){const n=+m[1],r=+m[2];if(r<=n&&n<=60){const v=bnCr(n,r);
    return R(['nCr = n! / [r!(n − r)!]','Given n = '+n+', r = '+r,n+'C'+r+' = '+n+'! / ('+r+'! × '+(n-r)+'!) = '+v,'Answer: '+v],String(v),Number(v),'Maths — combinations')}}
  if((m=/\bword\s*[:\-]?\s*['"“]?([A-Za-z]{3,20})['"”]?/i.exec(T)||/letters\s+(?:of|in)\s+(?:the\s+)?(?:word\s+)?['"“]?([A-Za-z]{3,20})['"”]?/i.exec(T))&&!/^(the|this|these|word|each|all)$/i.test(m[1])&&/arrang|permut|ways|rearrang/i.test(T)){
    const w=m[1].toUpperCase(),cnt={};w.split('').forEach(c=>cnt[c]=(cnt[c]||0)+1);const n=w.length;
    const rep=Object.keys(cnt).filter(c=>cnt[c]>1);let den=1n;rep.forEach(c=>den*=bf(cnt[c]));
    if(/vowels? (?:are |come |stay |remain )?together|together/i.test(T)&&/vowel/i.test(T)){
      const V=w.split('').filter(c=>'AEIOU'.includes(c)),Cn=w.split('').filter(c=>!'AEIOU'.includes(c)),vc={},cc={};V.forEach(c=>vc[c]=(vc[c]||0)+1);Cn.forEach(c=>cc[c]=(cc[c]||0)+1);
      let d1=1n;Object.values(cc).forEach(k=>d1*=bf(k));let d2=1n;Object.values(vc).forEach(k=>d2*=bf(k));
      const v=bf(Cn.length+1)/d1*(bf(V.length)/d2);
      return R(['Word: '+w+' ('+n+' letters; vowels: '+V.join(',')+')','Treat all vowels as one block. Items to arrange: '+Cn.length+' consonants + 1 block = '+(Cn.length+1)+'.','Ways for the items: '+(Cn.length+1)+'!'+(d1>1n?' / '+d1:'')+' = '+bf(Cn.length+1)/d1,'Ways to arrange the vowels inside the block: '+V.length+'!'+(d2>1n?' / '+d2:'')+' = '+bf(V.length)/d2,'Answer: '+v+' ways'],String(v),Number(v),'Maths — permutations')}
    const v=bf(n)/den;
    return R(['Word: '+w+' ('+n+' letters)',rep.length?'Repeated letters: '+rep.map(c=>c+' ('+cnt[c]+' times)').join(', '):'All letters are different.','Number of arrangements = n! / (p!q!…) = '+n+'!'+(rep.length?' / ('+rep.map(c=>cnt[c]+'!').join(' × ')+')':'')+' = '+v,'Answer: '+v+' ways'],String(v),Number(v),'Maths — permutations')}
  if((m=/(\d+)\s+(?:distinct\s+|different\s+)?(?:books|persons|people|objects|things|students|boys|girls|friends|children|members|flowers|beads|digits)\b[^.?]*?\b(row|line|shelf|circle|round table|circular)\b/i.exec(T))&&/arrang|seat|sit|placed/i.test(T)){
    const n=+m[1],circ=/circle|round table|circular/i.test(m[2]),v=circ?bf(n-1):bf(n);
    return R(['Number of items n = '+n,circ?'Circular arrangement: (n − 1)! = '+(n-1)+'! = '+v:'Linear arrangement: n! = '+n+'! = '+v,'Answer: '+v+' ways'],String(v),Number(v),'Maths — permutations')}
  if((m=/(?:select|choose|selecting|choosing|committee|team|group|pick)\s+(?:of\s+)?(\d+)\s*(?:members?|persons?|people|students|players|boys|girls|men|women|books|balls|cards|items?|objects?|questions?|numbers?)?\s*(?:out of|from|among|of)\s+(\d+)\b/i.exec(T))){
    const r=+m[1],n=+m[2];if(r<=n){const v=bnCr(n,r);return R(['Choose '+r+' from '+n+': nCr = n! / [r!(n − r)!]',n+'C'+r+' = '+v,'Answer: '+v+' ways'],String(v),Number(v),'Maths — combinations')}}
  if((m=/\b(\d+)\s+(?:persons?|people|students|friends|members|boys)\b[^.?]*handshake|handshake[^.?]*?(\d+)\s+(?:persons?|people|students|friends|members)/i.exec(T))){const n=+(m[1]||m[2]),v=bnCr(n,2);return R(['Each handshake involves 2 of the '+n+' persons: nC2 = '+n+'C2','= '+n+'(' +(n-1)+')/2 = '+v,'Answer: '+v+' handshakes'],String(v),Number(v),'Maths — combinations')}
  if((m=/diagonals?[^.?]*?(\d+)\s*(?:-|\s)?(?:sides?|gon|vertices)|(\d+)\s*(?:-|\s)?(?:sided\s+)?(?:polygon|gon)[^.?]*diagonals?/i.exec(T))){const n=+(m[1]||m[2]),v=n*(n-3)/2;return R(['Number of diagonals of an n-sided polygon = nC2 − n = n(n − 3)/2','= '+n+'('+(n-3)+')/2 = '+v,'Answer: '+v+' diagonals'],String(v),v,'Maths — combinations')}
  // binomial theorem
  m=/(\(\s*[^()]+\))\s*\^\s*(\d+)/.exec(T);
  if(m&&/\b(expand|expansion|coefficient|general term|middle term|binomial)\b/i.test(T)){
    const n=+m[2];let base;try{base=P(fixExpr(m[1]))}catch(e){return null}
    const vv=[...E.vars(base)];if(vv.length!==1||n>20)return null;const x=vv[0],pc=E.polyCoeffs(base,x,1);if(!pc||pc.length!==2)return null;
    const[c0,c1]=pc,terms=[];for(let k=0;k<=n;k++)terms.push({k,c:Number(bnCr(n,k))*Math.pow(c1,k)*Math.pow(c0,n-k)});
    const L=['Given: ('+ms(base)+')'+sup(n),'Binomial theorem: (a + b)ⁿ = Σ nCr aⁿ⁻ʳ bʳ with a = '+nf(c0)+', b = '+nf(c1)+x];
    const co=/coefficient of\s+([a-z])\s*\^?\s*(\d+)?/i.exec(T);
    if(co){const k=co[2]?+co[2]:1;if(k<=n){const t=terms[k];L.push('General term T(r+1) = '+n+'Cr ('+nf(c0)+')'+sup(n)+'⁻ʳ ('+nf(c1)+x+')ʳ — we need r = '+k,'Coefficient = '+n+'C'+k+' × ('+nf(c1)+')'+sup(k)+' × ('+nf(c0)+')'+sup(n-k)+' = '+nf(t.c),'Answer: '+nf(t.c));return R(L,nf(t.c),t.c,'Maths — binomial theorem')}}
    if(/middle term/i.test(T)){const idx=n%2===0?[n/2]:[(n-1)/2,(n+1)/2];idx.forEach(k=>L.push('Middle term T'+sub(k+1)+' = '+n+'C'+k+' ('+nf(c0)+')'+sup(n-k)+' ('+nf(c1)+x+')'+sup(k)+' = '+nf(terms[k].c)+x+sup(k)));L.push('Answer: '+idx.map(k=>nf(terms[k].c)+x+sup(k)).join(' and '));return R(L,idx.map(k=>nf(terms[k].c)+x+sup(k)).join(' and '),null,'Maths — binomial theorem')}
    if(/general term/i.test(T)){L.push('General term: T(r+1) = '+n+'Cr · ('+nf(c0)+')'+sup(n)+'⁻ʳ · ('+nf(c1)+x+')ʳ','Answer: T(r+1) = '+n+'Cr ('+nf(c0)+')'+sup(n)+'⁻ʳ ('+nf(c1)+')ʳ '+x+'ʳ');return R(L,'general term',null,'Maths — binomial theorem')}
    const ex=terms.filter(t=>t.c!==0).reverse().map((t,i)=>(i&&t.c>0?' + ':i?' − ':(t.c<0?'−':''))+((Math.abs(t.c)===1&&t.k>0)?'':nf(Math.abs(t.c)))+(t.k?x+(t.k>1?sup(t.k):''):'')).join('');
    L.push('Expansion: '+ex,'Answer: '+ex);return R(L,ex,null,'Maths — binomial theorem')}
  return null});

/* =============== probability =============== */
const dec=x=>fmt(x,4);
const probEnd=(fav,tot,what,lines)=>{const g=gcd(fav,tot)||1,f=fav/g,t=tot/g;
  lines.push('P('+what+') = favourable outcomes / total outcomes = '+fav+' / '+tot+(g>1?' = '+f+'/'+t:'')+' ≈ '+fmt(fav/tot,4));
  lines.push('Answer: '+(t===1?String(f):f+'/'+t)+' (≈ '+fmt(fav/tot,4)+')');
  return R(lines,(t===1?String(f):f+'/'+t),fav/tot,'Probability')};
const isPrime=n=>{if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true};
const WN={one:1,a:1,an:1,two:2,three:3,four:4,five:5,six:6,twice:2,thrice:3};
add('dice',(T,low)=>{
  if(!/\b(die|dice)\b/.test(low)||!/probab|chance|likel/.test(low))return null;
  let k=1,m=/\b(two|three|2|3)\s+(?:\w+\s+){0,2}dice\b/.exec(low)||/\b(pair of)\s+dice/.exec(low)||/\b(?:die|dice)\b[^.?]*?\b(twice|thrice|two times|three times)\b/.exec(low);
  if(m)k=/pair|two|twice|2/.test(m[1])?2:3;
  const sum=o=>o.reduce((s,v)=>s+v,0),prod=o=>o.reduce((s,v)=>s*v,1);
  const rules=[
    [/sum[^.?]*?(?:at least|not less than|greater than or equal to|≥|minimum of)\s*(\d+)/,n=>o=>sum(o)>=n,'sum ≥ n'],
    [/sum[^.?]*?(?:at most|not more than|not greater than|less than or equal to|≤)\s*(\d+)/,n=>o=>sum(o)<=n,'sum ≤ n'],
    [/sum[^.?]*?(?:greater than|more than|exceeds?|>)\s*(\d+)/,n=>o=>sum(o)>n,'sum > n'],
    [/sum[^.?]*?(?:less than|smaller than|<)\s*(\d+)/,n=>o=>sum(o)<n,'sum < n'],
    [/sum[^.?]*?(?:multiple of|divisible by)\s*(\d+)/,n=>o=>sum(o)%n===0,'sum is a multiple of n'],
    [/sum[^.?]*?\bprime\b/,()=>o=>isPrime(sum(o)),'sum is prime'],[/sum[^.?]*?\beven\b/,()=>o=>sum(o)%2===0,'sum is even'],[/sum[^.?]*?\bodd\b/,()=>o=>sum(o)%2===1,'sum is odd'],
    [/sum[^.?]*?(?:is|equals?|=|of|as|be)\s*(?:exactly\s+)?(\d+)/,n=>o=>sum(o)===n,'sum = n'],
    [/product[^.?]*?\beven\b/,()=>o=>prod(o)%2===0,'product is even'],[/product[^.?]*?\bodd\b/,()=>o=>prod(o)%2===1,'product is odd'],
    [/product[^.?]*?(?:is|equals?|=|of)\s*(?:exactly\s+)?(\d+)/,n=>o=>prod(o)===n,'product = n'],
    [/difference[^.?]*?(\d+)/,n=>o=>Math.abs(o[0]-o[1])===n,'difference = n'],
    [/doublet|same number|equal numbers|both (?:dice )?show(?:ing)? the same|identical numbers|a pair of equal/,()=>o=>o.every(v=>v===o[0]),'a doublet'],
    [/both (?:dice )?(?:show|showing|are|have)\s*(?:a\s+)?(?:number\s+)?(\d)/,n=>o=>o.every(v=>v===n),'both show n'],
    [/(?:at least one|atleast one)[^.?]*?(\d)\b/,n=>o=>o.includes(n),'at least one n'],
    [/(?:at least one|atleast one)[^.?]*?\bsix\b/,()=>o=>o.includes(6),'at least one six'],
    [/(?:no|neither)[^.?]*?\bsix\b/,()=>o=>!o.includes(6),'no six']];
  const single=[
    [/\b(?:an?\s+)?even number/,()=>o=>o[0]%2===0,'an even number'],[/\b(?:an?\s+)?odd number/,()=>o=>o[0]%2===1,'an odd number'],[/\b(?:a\s+)?prime number/,()=>o=>isPrime(o[0]),'a prime number'],
    [/multiple of\s*(\d+)/,n=>o=>o[0]%n===0,'a multiple of n'],[/(?:greater than or equal to|at least|\bn?o?t less than)\s*(\d+)/,n=>o=>o[0]>=n,'≥ n'],[/(?:at most|not greater than|less than or equal to)\s*(\d+)/,n=>o=>o[0]<=n,'≤ n'],
    [/(?:greater than|more than|above)\s*(\d+)/,n=>o=>o[0]>n,'> n'],[/(?:less than|smaller than|below)\s*(\d+)/,n=>o=>o[0]<n,'< n'],
    [/(?:number|digit|face)\s*(\d)\b|\b(?:getting|get|show|shows|obtain)\s+(?:an?\s+)?(\d)\b/,n=>o=>o[0]===n,'the number n'],[/\ba six\b/,()=>o=>o[0]===6,'a six']];
  let pred=null,desc='';
  for(const[re,mk,d]of(k===1?single:rules)){const mm=re.exec(low);if(mm){const n=mm[1]!==undefined?+mm[1]:(mm[2]!==undefined?+mm[2]:undefined);pred=mk(n);desc=d.replace('n',n!==undefined?n:'n');break}}
  if(!pred)return null;
  const outs=[];(function gen(pre){if(pre.length===k){outs.push(pre);return}for(let v=1;v<=6;v++)gen(pre.concat(v))})([]);
  const fav=outs.filter(pred);
  const L=['Experiment: '+(k===1?'a die is thrown':k+' dice are thrown together'),'Total number of outcomes = 6'+(k>1?sup(k):'')+' = '+outs.length];
  L.push('Favourable outcomes ('+desc+'): '+(fav.length<=14?fav.map(o=>'('+o.join(',')+')').join(' '):fav.length+' outcomes')+'  → count = '+fav.length);
  return probEnd(fav.length,outs.length,desc,L)});
add('coins',(T,low)=>{
  if(!/\bcoins?\b/.test(low)||!/probab|chance|likel/.test(low))return null;
  let n=1,m=/(\d+|two|three|four|five|six)\s+(?:fair\s+|unbiased\s+)?coins?/.exec(low)||/coin[^.?]*?\b(\d+|twice|thrice|two|three|four|five|six)\s*(?:times)?\b/.exec(low);
  if(m)n=isNaN(+m[1])?WN[m[1]]:+m[1];
  if(!n||n>12)return null;
  const side=/\btails?\b/.test(low)&&!/\bheads?\b/.test(low)?'tails':'heads';
  const C=(a,b)=>Number(bnCr(a,b));let fav=null,what='';
  let e;
  if((e=/exactly\s+(\d+)\s+(?:heads?|tails?)/.exec(low))){fav=C(n,+e[1]);what='exactly '+e[1]+' '+side}
  else if((e=/at least\s+(\d+)\s+(?:heads?|tails?)/.exec(low))){let s=0;for(let k=+e[1];k<=n;k++)s+=C(n,k);fav=s;what='at least '+e[1]+' '+side}
  else if((e=/at most\s+(\d+)\s+(?:heads?|tails?)/.exec(low))){let s=0;for(let k=0;k<=+e[1];k++)s+=C(n,k);fav=s;what='at most '+e[1]+' '+side}
  else if(/at least one/.test(low)){fav=Math.pow(2,n)-1;what='at least one '+side.slice(0,-1)}
  else if(/\ball (?:heads|tails)|both (?:heads|tails)|all (?:are )?(?:heads|tails)/.test(low)){fav=1;what='all '+side}
  else if(/\bno (?:heads?|tails?)\b/.test(low)){fav=1;what='no '+side}
  else if((e=/(?:getting|get)\s+(\d+)\s+(?:heads?|tails?)/.exec(low))){fav=C(n,+e[1]);what=e[1]+' '+side}
  if(fav===null)return null;
  const tot=Math.pow(2,n),L=['Experiment: '+(n===1?'a coin is tossed':n+' coins are tossed (or one coin '+n+' times)'),'Total outcomes = 2'+(n>1?sup(n):'')+' = '+tot,'Favourable outcomes for "'+what+'": '+fav+(n>1?' (using nCr: '+n+'C'+(/exactly|getting|^\d/.test(what)?'r':'…')+')':'')];
  return probEnd(fav,tot,what,L)});
const RK=['ace','2','3','4','5','6','7','8','9','10','jack','queen','king'],SU=['spade','heart','diamond','club'];
add('cards',(T,low)=>{
  if(!/\b(card|cards|pack|deck)\b/.test(low)||!/probab|chance|likel/.test(low)||/\bball|bag\b/.test(low))return null;
  const clause=(/(?:probability|chance|likelihood)\s+(?:of|that)\s+(?:it\s+(?:is|being)\s+|getting\s+|drawing\s+|picking\s+|the card (?:being|is)\s+)?([^?.]*)/.exec(low)||[])[1];if(!clause)return null;
  const deck=[];for(let r=0;r<13;r++)for(let s=0;s<4;s++)deck.push({r,s});
  const tok=w=>{
    const map={ace:c=>c.r===0,king:c=>c.r===12,queen:c=>c.r===11,jack:c=>c.r===10,face:c=>c.r>=10,spade:c=>c.s===0,heart:c=>c.s===1,diamond:c=>c.s===2,club:c=>c.s===3,red:c=>c.s===1||c.s===2,black:c=>c.s===0||c.s===3,number:c=>c.r>=1&&c.r<=9};
    return map[w]};
  const neg=/^\s*(?:not|neither)\b/.test(clause);
  const groups=clause.replace(/^\s*(?:not|neither)\s+/,'').split(/\bor\b|\bnor\b/).map(g=>[...g.matchAll(/\b(ace|king|queen|jack|face|spade|heart|diamond|club|red|black|number)s?\b/g)].map(x=>x[1]));
  if(!groups.some(g=>g.length))return null;
  let pred=c=>groups.some(g=>g.length&&g.every(w=>tok(w)(c)));
  const fav=deck.filter(c=>neg?!pred(c):pred(c)).length;
  const L=['A standard pack has 52 cards: 4 suits (spades, hearts, diamonds, clubs) of 13 cards each; 26 red and 26 black; 12 face cards (J, Q, K); 4 aces.','Total outcomes = 52','Favourable outcomes for "'+cut(clause)+'" = '+fav];
  return probEnd(fav,52,cut(clause),L)});
add('bag',(T,low)=>{
  if(!/\b(bag|box|urn|jar)\b/.test(low)||!/probab|chance|likel/.test(low))return null;
  const items=[...low.matchAll(/(\d+)\s+(?:\w+\s+)?(red|blue|green|white|black|yellow|orange|pink|purple|brown|grey|gray)\s+(?:balls?|marbles?|beads?|chips?|tickets?|pens?|cards?|chocolates?|sweets?)?/g)].map(m=>({c:m[2],n:+m[1]}));
  const cols={};items.forEach(i=>cols[i.c]=(cols[i.c]||0)+i.n);const names=Object.keys(cols);if(names.length<2)return null;
  const N=Object.values(cols).reduce((s,v)=>s+v,0);
  const draws=/\btwo\b|\b2\b|\bboth\b/.test(low)&&/drawn|picked|taken|selected|draw/.test(low)?2:1,repl=/with replacement/.test(low)&&!/without replacement/.test(low);
  const L=['The container has '+names.map(c=>cols[c]+' '+c).join(', ')+'  →  total = '+N];
  if(draws===1){const c=names.find(n=>new RegExp('\\b'+n+'\\b').test(low.split(/probab|chance/)[1]||''));if(!c)return null;
    const ng=/\bnot\s+(?:a\s+)?(red|blue|green|white|black|yellow|orange|pink|purple|brown|grey|gray)/.exec(low.split(/probab|chance/)[1]||''),f=ng?N-cols[ng[1]]:cols[c];
    L.push('One ball is drawn: total outcomes = '+N,'Favourable outcomes = '+f);return probEnd(f,N,ng?'not '+ng[1]:c,L)}
  const ev=low.split(/probab|chance/)[1]||'';let fav,tot,what;
  const C2=n=>n*(n-1)/2;
  if(repl){tot=N*N;const bothM=/both\s+(\w+)/.exec(ev);
    if(bothM&&cols[bothM[1]]){fav=cols[bothM[1]]*cols[bothM[1]];what='both '+bothM[1]}
    else if(/one\s+\w+\s+and\s+one\s+\w+/.test(ev)){const mm=/one\s+(\w+)\s+and\s+one\s+(\w+)/.exec(ev);if(!(cols[mm[1]]&&cols[mm[2]]))return null;fav=2*cols[mm[1]]*cols[mm[2]];what='one '+mm[1]+' and one '+mm[2]}else return null;
    L.push('Two balls are drawn with replacement: total outcomes = '+N+' × '+N+' = '+tot)}
  else{tot=C2(N);const bothM=/both\s+(\w+)/.exec(ev),mm=/one\s+(\w+)\s+and\s+one\s+(\w+)/.exec(ev),same=/same colou?r/.test(ev),diff=/different colou?rs?/.test(ev),al=/at least one\s+(\w+)/.exec(ev);
    if(bothM&&cols[bothM[1]]!==undefined){fav=C2(cols[bothM[1]]);what='both '+bothM[1]}
    else if(mm&&cols[mm[1]]&&cols[mm[2]]){fav=cols[mm[1]]*cols[mm[2]];what='one '+mm[1]+' and one '+mm[2]}
    else if(same){fav=names.reduce((s,c)=>s+C2(cols[c]),0);what='same colour'}
    else if(diff){fav=tot-names.reduce((s,c)=>s+C2(cols[c]),0);what='different colours'}
    else if(al&&cols[al[1]]!==undefined){fav=tot-C2(N-cols[al[1]]);what='at least one '+al[1]}
    else return null;
    L.push('Two balls are drawn together (or one after another without replacement): total outcomes = '+N+'C2 = '+tot)}
  L.push('Favourable outcomes for "'+what+'" = '+fav);return probEnd(fav,tot,what,L)});
add('binomdist',(T,low)=>{
  if(!/binomial|\bP\s*\(\s*X\s*=|exactly\s+\d+\s+(?:successes?|times)/i.test(T))return null;
  const n=/\bn\s*=\s*(\d+)/i.exec(T),p=/\bp\s*=\s*(\d*\.?\d+(?:\/\d+)?)/i.exec(T),r=/P\s*\(\s*X\s*=\s*(\d+)\s*\)/i.exec(T)||/exactly\s+(\d+)/i.exec(T);
  if(!n||!p)return null;const N=+n[1],pp=numOf(p[1]),q=1-pp;
  const L=['Given: n = '+N+', p = '+nf(pp)+', q = 1 − p = '+nf(q),'Mean = np = '+nf(N*pp)+',  variance = npq = '+nf(N*pp*q)+',  S.D. = √(npq) = '+nf(Math.sqrt(N*pp*q))];
  if(!r)return R(L.concat(['Answer: mean = '+nf(N*pp)+', variance = '+nf(N*pp*q)]),'mean '+nf(N*pp),N*pp,'Probability — binomial distribution');
  const k=+r[1],v=Number(bnCr(N,k))*Math.pow(pp,k)*Math.pow(q,N-k);
  L.push('P(X = r) = nCr pʳ qⁿ⁻ʳ = '+N+'C'+k+' ('+nf(pp)+')'+sup(k)+' ('+nf(q)+')'+sup(N-k)+' = '+fmt(v,5),'Answer: P(X = '+k+') = '+fmt(v,5));return R(L,fmt(v,5),v,'Probability — binomial distribution')});

/* =============== economics, accounts, biology specials =============== */
add('elasticity',(T,low)=>{
  if(!/elasticity/.test(low))return null;
  const prs=[...T.matchAll(/(?:from|changes? from|rises? from|falls? from|increases? from|decreases? from|goes? from|raised from|reduced from)\s*(?:Rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:to|→)\s*(?:Rs\.?|₹)?\s*(\d+(?:\.\d+)?)/gi)];
  if(prs.length<2)return null;
  let pr=null,qu=null;
  prs.forEach(m=>{const before=low.slice(Math.max(0,m.index-45),m.index);if(/price/.test(before)&&!pr)pr=m;else if(/(quantity|demand|supply|units|sales|output)/.test(before)&&!qu)qu=m});
  if(!pr||!qu){pr=prs[0];qu=prs[1]}
  const P0=+pr[1],P1=+pr[2],Q0=+qu[1],Q1=+qu[2];
  const dP=P1-P0,dQ=Q1-Q0,pP=dP/P0*100,pQ=dQ/Q0*100,ed=pQ/pP,sup2=/supply/.test(low);
  const L=['Given: price changes from '+nf(P0)+' to '+nf(P1)+'; quantity '+(sup2?'supplied':'demanded')+' changes from '+nf(Q0)+' to '+nf(Q1),'ΔP = '+nf(P1)+' − '+nf(P0)+' = '+nf(dP)+',   ΔQ = '+nf(Q1)+' − '+nf(Q0)+' = '+nf(dQ),
    '% change in price = (ΔP / P) × 100 = ('+nf(dP)+' / '+nf(P0)+') × 100 = '+nf(pP)+'%','% change in quantity = (ΔQ / Q) × 100 = ('+nf(dQ)+' / '+nf(Q0)+') × 100 = '+nf(pQ)+'%',
    'Ed = % change in quantity / % change in price = '+nf(pQ)+' / '+nf(pP)+' = '+nf(ed),'(Same result by the formula Ed = (ΔQ/ΔP) × (P/Q) = ('+nf(dQ)+'/'+nf(dP)+') × ('+nf(P0)+'/'+nf(Q0)+')'];
  const a=Math.abs(ed);L.push('|Ed| = '+nf(a)+(a>1?' > 1, so '+(sup2?'supply':'demand')+' is elastic':a<1?' < 1, so '+(sup2?'supply':'demand')+' is inelastic':' = 1, so '+(sup2?'supply':'demand')+' is unitary elastic'),'Answer: Ed = '+nf(ed)+' (numerical value '+nf(a)+')');
  return R(L,'Ed = '+nf(ed),ed,'Economics — elasticity')});
add('hardyw',(T,low)=>{
  if(!/hardy|weinberg|allele frequenc|frequency of (?:the )?(?:recessive|dominant) allele|heterozygous (?:individuals|carriers)|carriers?\b/i.test(T))return null;
  let q=null,p=null,q2=null,m;
  if((m=/\bq\s*=\s*(\d*\.?\d+)/i.exec(T)))q=+m[1];
  if((m=/\bp\s*=\s*(\d*\.?\d+)/i.exec(T)))p=+m[1];
  if(q===null&&p===null){
    if((m=/\b1\s+in\s+(\d+)\b/i.exec(T))||(m=/(\d+)\s+(?:out of|in every)\s+(\d+)/i.exec(T)))q2=m[2]?+m[1]/+m[2]:1/+m[1];
    else if((m=/(?:recessive|affected|homozygous recessive|aa)[^.?]*?(\d*\.?\d+)\s*%/i.exec(T)))q2=+m[1]/100;
    else if((m=/(?:recessive|homozygous recessive|aa|frequency)[^.?]*?(?:is|=|of)\s*(\d*\.?\d+)\b/i.exec(T)))q2=+m[1];
    if(q2!==null)q=Math.sqrt(q2)}
  if(q===null&&p===null)return null;if(q===null)q=1-p;if(p===null)p=1-q;
  const L=['Hardy-Weinberg: p + q = 1 and p² + 2pq + q² = 1 (p = dominant allele, q = recessive allele)'];
  if(q2!==null)L.push('q² (frequency of homozygous recessive) = '+dec(q2)+'  →  q = √'+dec(q2)+' = '+dec(q));else L.push('q = '+dec(q));
  L.push('p = 1 − q = '+dec(p),'Homozygous dominant (p²) = '+dec(p*p),'Heterozygous / carriers (2pq) = 2 × '+dec(p)+' × '+dec(q)+' = '+dec(2*p*q),'Homozygous recessive (q²) = '+dec(q*q));
  const w=/heterozygous|carrier/i.test(T)?['carriers (2pq)',2*p*q]:/homozygous dominant|\bAA\b|p²/i.test(T)?['AA (p²)',p*p]:/dominant allele|\bp\b/.test(T)&&/frequency of (?:the )?dominant allele/i.test(T)?['p',p]:/homozygous recessive|\baa\b/i.test(T)?['aa (q²)',q*q]:['2pq',2*p*q];
  L.push('Answer: '+w[0]+' = '+dec(w[1]));return R(L,w[0]+' = '+dec(w[1]),w[1],'Biology — Hardy-Weinberg principle')});
add('punnett',(T,low)=>{
  const m=/\b((?:[A-Za-z])(?:[A-Za-z])(?:[A-Za-z][A-Za-z]){0,2})\s*(?:x|×|\*|and|with|crossed with)\s*((?:[A-Za-z])(?:[A-Za-z])(?:[A-Za-z][A-Za-z]){0,2})\b/.exec(T.replace(/×/g,'x'));
  if(!m||!/\b(cross|punnett|monohybrid|dihybrid|test cross|genotype|offspring|f1|f2)\b/i.test(T))return null;
  const genes=s=>{const out=[];for(let i=0;i<s.length;i+=2){const a=s[i],b=s[i+1];if(!b||a.toLowerCase()!==b.toLowerCase())return null;out.push([a,b])}return out};
  const p1=genes(m[1]),p2=genes(m[2]);if(!p1||!p2||p1.length!==p2.length||p1.some((g,i)=>g[0].toLowerCase()!==p2[i][0].toLowerCase()))return null;
  const gam=ps=>ps.reduce((acc,g)=>{const out=[];acc.forEach(a=>[...new Set(g)].forEach(x=>out.push(a+x)));return out},['']);
  const g1=gam(p1),g2=gam(p2),canon=s=>{let o='';for(let i=0;i<s.length;i+=2){const a=s[i],b=s[i+1];o+=a<b?a+b:b+a}return o.replace(/([A-Za-z])([A-Za-z])/g,(x,a,b)=>a===a.toLowerCase()&&b===b.toUpperCase()?b+a:x)};
  const geno={},pheno={};const table=[];
  g1.forEach(a=>{const row=[];g2.forEach(b=>{let s='';for(let i=0;i<a.length;i++)s+=[a[i],b[i]].sort((x,y)=>(x===x.toUpperCase()?0:1)-(y===y.toUpperCase()?0:1)).join('');row.push(s);geno[s]=(geno[s]||0)+1;
    let ph='';for(let i=0;i<s.length;i+=2)ph+=(s[i]===s[i].toUpperCase()?'D':'r');pheno[ph]=(pheno[ph]||0)+1});table.push(row)});
  const tot=g1.length*g2.length,gg=Object.values(geno).reduce((a,b)=>gcd(a,b)),pg=Object.values(pheno).reduce((a,b)=>gcd(a,b));
  const w=Math.max(...table.flat().map(s=>s.length))+2,pad=s=>s.padEnd(w);
  const L=['Parents: '+m[1]+' × '+m[2],'Gametes of '+m[1]+': '+g1.join(', ')+'     Gametes of '+m[2]+': '+g2.join(', '),'Punnett square:','  '+''.padEnd(w)+g2.map(pad).join(''),...table.map((r,i)=>'  '+pad(g1[i])+r.map(pad).join('')),
    'Genotypes: '+Object.keys(geno).map(k=>geno[k]+' '+k).join(',  ')+'   (total '+tot+')','Genotypic ratio = '+Object.keys(geno).join(' : ')+' = '+Object.values(geno).map(v=>v/gg).join(' : '),
    'Phenotypic ratio (D = dominant trait shown, r = recessive) = '+Object.keys(pheno).map(k=>k.replace(/D/g,'D').replace(/r/g,'r')).join(' : ')+' = '+Object.values(pheno).map(v=>v/pg).join(' : ')];
  L.push('Answer: genotypic ratio '+Object.values(geno).map(v=>v/gg).join(':')+' ; phenotypic ratio '+Object.values(pheno).map(v=>v/pg).join(':'));
  return R(L,'phenotypic ratio '+Object.values(pheno).map(v=>v/pg).join(':'),null,'Biology — genetics (Punnett square)')});
add('sacrifice',(T,low)=>{
  if(!/sacrific|gaining ratio|new (?:profit[- ]sharing )?ratio/.test(low))return null;
  const rs=[...T.matchAll(/(\d+(?:\s*:\s*\d+)+)/g)];if(rs.length<2)return null;
  const rt=s=>s.split(':').map(x=>+x.trim());let oldR=null,newR=null;
  rs.forEach(r=>{const b=low.slice(Math.max(0,r.index-40),r.index);if(/\bnew\b/.test(b)&&!newR)newR=rt(r[1]);else if(/\b(old|existing|present|former|original)\b/.test(b)&&!oldR)oldR=rt(r[1])});
  if(!oldR)oldR=rt(rs[0][1]);if(!newR)newR=rt(rs[rs.length-1][1]);
  const n=Math.min(oldR.length,newR.length),so=oldR.reduce((a,b)=>a+b,0),sn=newR.reduce((a,b)=>a+b,0),nm=['A','B','C','D','E'];
  const L=['Old ratio = '+oldR.join(' : ')+',  new ratio = '+newR.join(' : '),'Sacrificing (or gaining) ratio = old share − new share'];
  const lcm=so*sn/gcd(so,sn);const res=[];
  for(let i=0;i<n;i++){const o=oldR[i]*lcm/so,nw=newR[i]*lcm/sn,d=o-nw;res.push(d);L.push(nm[i]+': '+oldR[i]+'/'+so+' − '+newR[i]+'/'+sn+' = '+fracStr(d,lcm)+(d>0?'  (sacrifice)':d<0?'  (gain)':'  (no change)'))}
  L.push('Answer: '+res.map((d,i)=>nm[i]+' '+(d>0?'sacrifices ':d<0?'gains ':'no change ')+fracStr(Math.abs(d),lcm)).join(', '));
  return R(L,res.map((d,i)=>nm[i]+' '+fracStr(d,lcm)).join(', '),null,'Accountancy — sacrificing ratio')});

/* =============== Python / SQL / Boolean (CS and IP) =============== */
function splitArgs(s){const out=[];let d=0,cur='',q=null;for(const c of s){if(q){cur+=c;if(c===q)q=null;continue}if(c==="'"||c==='"'){q=c;cur+=c;continue}if(c==='('||c==='[')d++;if(c===')'||c===']')d--;if(c===','&&d===0){out.push(cur.trim());cur=''}else cur+=c}if(cur.trim())out.push(cur.trim());return out}
add('python',(T,low)=>{
  if(!/print\s*\(/.test(T))return null;
  const calls=[...T.matchAll(/print\s*\(((?:[^()]|\([^()]*\))*)\)/g)];if(!calls.length)return null;
  const outs=[];
  for(const c of calls){const parts=splitArgs(c[1]).filter(a=>!/^(sep|end)\s*=/.test(a));const vals=[];
    for(const a of parts){let m=/^(['"])(.*)\1$/.exec(a);if(m){vals.push(m[2]);continue}
      if(!/^[\d\s().+\-*\/%]+$/.test(a))return null;let v;try{v=E.ev(E.parse(a.replace(/\*\*/g,'^'),'p'),{})}catch(e){return null}
      const trueDiv=/(^|[^\/])\/(?!\/)/.test(a)||/\.\d/.test(a);vals.push(Number.isInteger(v)&&trueDiv&&!/\/\//.test(a)?v.toFixed(1):String(v))}
    outs.push(vals.join(' '))}
  const L=['Python evaluates each expression:  ** (power), then * / // %, then + −. "/" always gives a float, "//" is floor division and "%" is the remainder.'].concat(outs.map((o,i)=>'print #'+(i+1)+' → '+o));
  L.push('Answer (output):\n'+outs.join('\n'));return R(L,outs.join(' / '),null,'Computer Science — Python output')});
const rnd=(x,d)=>{const f=Math.pow(10,d);return Math.sign(x)*Math.round(Math.abs(x)*f)/f};
add('sql',(T,low)=>{
  const m=/\b(power|pow|mod|round|truncate|sqrt|abs|ceil|ceiling|floor|upper|ucase|lower|lcase|length|char_length|concat|left|right|mid|substr|substring|instr|ltrim|rtrim|trim)\s*\(\s*([^()]*)\)/i.exec(T);
  if(!m||!/\b(select|mysql|sql|function|output|returns?)\b/i.test(T))return null;
  const f=m[1].toLowerCase(),a=splitArgs(m[2]).map(s=>{const q=/^(['"])(.*)\1$/.exec(s);return q?q[2]:(isNaN(+s)?s:+s)});
  let v;try{switch(f){
    case'power':case'pow':v=Math.pow(a[0],a[1]);break;case'mod':v=((a[0]%a[1])+a[1])%a[1];if(a[0]<0)v=a[0]%a[1];break;
    case'round':v=rnd(a[0],a[1]||0);break;case'truncate':{const k=Math.pow(10,a[1]||0);v=Math.trunc(a[0]*k)/k;break}
    case'sqrt':v=Math.sqrt(a[0]);break;case'abs':v=Math.abs(a[0]);break;case'ceil':case'ceiling':v=Math.ceil(a[0]);break;case'floor':v=Math.floor(a[0]);break;
    case'upper':case'ucase':v=String(a[0]).toUpperCase();break;case'lower':case'lcase':v=String(a[0]).toLowerCase();break;case'length':case'char_length':v=String(a[0]).length;break;
    case'concat':v=a.join('');break;case'left':v=String(a[0]).slice(0,a[1]);break;case'right':v=String(a[0]).slice(-a[1]);break;
    case'mid':case'substr':case'substring':{const s=String(a[0]),st=a[1]<0?s.length+a[1]:a[1]-1;v=a[2]!==undefined?s.substr(st,a[2]):s.slice(st);break}
    case'instr':v=String(a[0]).indexOf(String(a[1]))+1;break;case'ltrim':v=String(a[0]).replace(/^\s+/,'');break;case'rtrim':v=String(a[0]).replace(/\s+$/,'');break;case'trim':v=String(a[0]).trim();break;default:return null}}catch(e){return null}
  if(v===undefined||(typeof v==='number'&&!isFinite(v)))return null;
  return R(['SQL function: '+m[1].toUpperCase()+'('+m[2]+')','Answer (output): '+v],String(v),typeof v==='number'?v:null,'Informatics Practices — SQL functions')});
add('boolean',(T,low)=>{
  if(!/\b(truth table|boolean|logic gate|logical expression|de morgan)\b/i.test(T))return null;
  const body=(/(?::|of|for|expression)\s*([A-Za-z0-9\s.+'()~!&|^*]*?(?:\b(?:and|or|not|xor|nand|nor)\b|[.+'~!&|^*])[A-Za-z0-9\s.+'()~!&|^*]*)\s*\.?\s*$/i.exec(T.replace(/\n/g,' '))||[])[1];
  if(!body)return null;
  let s=' '+body.replace(/\bnand\b/gi,' @ ').replace(/\bnor\b/gi,' # ').replace(/\bxor\b/gi,' ^ ').replace(/\band\b/gi,' . ').replace(/\bor\b/gi,' + ').replace(/\bnot\b/gi,' ~ ')+' ';
  const toks=[];for(let i=0;i<s.length;i++){const c=s[i];if(/\s/.test(c))continue;if(/[A-Za-z]/.test(c))toks.push({v:c.toUpperCase()});else if(/[()~!+.*&|^@#']/.test(c))toks.push({o:c==='!'?'~':c==='*'||c==='&'?'.':c==='|'?'+':c})}
  const vars=[...new Set(toks.filter(t=>t.v).map(t=>t.v))].sort();if(!vars.length||vars.length>4||toks.length<3)return null;
  let p=0;const pk=()=>toks[p],isO=(t,c)=>t&&t.o===c;
  function orE(env){let l=xorE(env);while(isO(pk(),'+')||isO(pk(),'#')){const o=toks[p++].o,r=xorE(env);l=o==='+'?(l|r):(1-(l|r))}return l}
  function xorE(env){let l=andE(env);while(isO(pk(),'^')){p++;l=l^andE(env)}return l}
  function andE(env){let l=notE(env);while(isO(pk(),'.')||isO(pk(),'@')||(pk()&&(pk().v||isO(pk(),'(')||isO(pk(),'~')))){let o='.';if(isO(pk(),'.')||isO(pk(),'@'))o=toks[p++].o;const r=notE(env);l=o==='@'?1-(l&r):(l&r)}return l}
  function notE(env){if(isO(pk(),'~')){p++;return 1-notE(env)}let b=prim(env);while(isO(pk(),"'")){p++;b=1-b}return b}
  function prim(env){const t=toks[p++];if(!t)throw new Error('end');if(t.v)return env[t.v];if(t.o==='('){const v=orE(env);if(!isO(toks[p++],')'))throw new Error(')');return v}throw new Error('bad')}
  const rows=[];
  try{for(let i=0;i<(1<<vars.length);i++){const env={};vars.forEach((v,j)=>env[v]=(i>>(vars.length-1-j))&1);p=0;const out=orE(env);if(p<toks.length)throw new Error('extra');rows.push([vars.map(v=>env[v]),out])}}catch(e){return null}
  const L=['Expression: '+cut(body),'Variables: '+vars.join(', ')+' → '+rows.length+' rows (2'+sup(vars.length)+')','Truth table:','  '+vars.join(' ')+' | Output',...rows.map(r=>'  '+r[0].join(' ')+' | '+r[1])];
  const ones=rows.filter(r=>r[1]).length;L.push('Answer: output is 1 for '+ones+' of '+rows.length+' input combinations'+(ones===rows.length?' (tautology)':ones===0?' (contradiction)':'')+'.');
  return R(L,ones+' of '+rows.length,null,'Computer Science — Boolean algebra')});


/* =============== everyday maths and reasoning: percentages, ratios, work, HCF/LCM, primes, roots, averages =============== */
const NW={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12,fifteen:15,twenty:20};
const nw=x=>/^\d/.test(x)?+x:NW[String(x).toLowerCase()];
add('percent',(T,low)=>{
  let m;
  if((m=/(\d+(?:\.\d+)?)\s*%\s*of\s+(?:a|the|my|his|her)?\s*(?:number|quantity|amount|value|sum|salary|price|total|income|marks)?\s*(?:is|are|=|equals?|be|was)\s*(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i.exec(T))&&/find|what|calculate|determine|number|quantity/i.test(T)&&!/what is\s*\d+(?:\.\d+)?\s*%\s*of\s*\d/i.test(T)){
    const x=+m[1],part=+m[2],n=part*100/x;
    return R(['Given: '+nf(x)+'% of the number = '+nf(part),'Let the number be N. Then ('+nf(x)+'/100) × N = '+nf(part),'N = '+nf(part)+' × 100 / '+nf(x)+' = '+nf(n),'Answer: The number is '+nf(n)+'.'],nf(n),n,'Maths — percentages')}
  if((m=/(?:what is|find|calculate|determine|compute)\s*(?:the\s*)?(\d+(?:\.\d+)?)\s*%\s*of\s*(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i.exec(T))){
    const x=+m[1],n=+m[2],v=x*n/100;return R(['Given: '+nf(x)+'% of '+nf(n),nf(x)+'% of '+nf(n)+' = ('+nf(x)+'/100) × '+nf(n)+' = '+nf(v),'Answer: '+nf(v)],nf(v),v,'Maths — percentages')}
  if((m=/(\d+(?:\.\d+)?)\s+is\s+what\s+(?:percent|%|per cent)(?:age)?\s+of\s+(\d+(?:\.\d+)?)/i.exec(T))){
    const a=+m[1],b=+m[2],v=a/b*100;return R(['Percentage = (part / whole) × 100','= ('+nf(a)+' / '+nf(b)+') × 100 = '+nf(v)+'%','Answer: '+nf(v)+'%'],nf(v)+'%',v,'Maths — percentages')}
  if((m=/(increase|decrease|reduce|raise|reduced|increased|decreased)\s+(?:rs\.?\s*)?(\d+(?:\.\d+)?)\s+by\s+(\d+(?:\.\d+)?)\s*%/i.exec(T))){
    const up=/^(in|ra)/i.test(m[1]),a=+m[2],p2=+m[3],v=a*(1+(up?1:-1)*p2/100);
    return R(['New value = '+nf(a)+' × (1 '+(up?'+':'−')+' '+nf(p2)+'/100)','= '+nf(a)+' × '+nf(1+(up?1:-1)*p2/100)+' = '+nf(v),'Answer: '+nf(v)],nf(v),v,'Maths — percentages')}
  return null});
add('average',(T,low)=>{
  let m=/average\s+of\s+(\w+)\s+(?:numbers|values|observations|terms|marks|items)\s+is\s+(\d+(?:\.\d+)?)[^]*?\b(sum|total)\b/i.exec(T);
  if(m){const n=nw(m[1]),a=+m[2];if(n){const v=n*a;return R(['Given: n = '+n+', average = '+nf(a),'Sum = average × number of observations = '+nf(a)+' × '+n+' = '+nf(v),'Answer: the sum is '+nf(v)],nf(v),v,'Maths — averages')}}
  m=/sum\s+of\s+(\w+)\s+(?:numbers|values|observations|terms|marks|items)\s+is\s+(\d+(?:\.\d+)?)[^]*?average/i.exec(T);
  if(m){const n=nw(m[1]),sm=+m[2];if(n){const v=sm/n;return R(['Average = sum / number of observations = '+nf(sm)+' / '+n+' = '+nf(v),'Answer: '+nf(v)],nf(v),v,'Maths — averages')}}
  return null});
add('ratio',(T,low)=>{
  const m=/(\d+)\s*:\s*(\d+)(?:\s*:\s*(\d+))?/.exec(T);if(!m||!/\bratio\b|divide|share|distribute/i.test(T)||/\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d|internally|externally|coordinates|line segment|joining|profit|capital|sacrific/i.test(T))return null;
  const parts=[+m[1],+m[2]].concat(m[3]?[+m[3]]:[]),S=parts.reduce((a,b)=>a+b,0);
  let total=null,how='';
  const sm=/(?:sum|total|together|divide|share|distribute)[^0-9]{0,40}(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i.exec(T.replace(m[0],' '));
  const df=/difference[^0-9]{0,40}(\d+(?:\.\d+)?)/i.exec(T.replace(m[0],' '));
  const L=['Given ratio = '+parts.join(' : ')+',  sum of the parts = '+S];
  let vals;
  if(df&&parts.length===2&&parts[0]!==parts[1]){const k=+df[1]/Math.abs(parts[1]-parts[0]);vals=parts.map(x=>x*k);L.push('Difference of the parts = '+Math.abs(parts[1]-parts[0])+', so 1 part = '+nf(+df[1])+' / '+Math.abs(parts[1]-parts[0])+' = '+nf(k))}
  else if(sm){total=+sm[1];const k=total/S;vals=parts.map(x=>x*k);L.push('1 part = '+nf(total)+' / '+S+' = '+nf(k))}
  else return null;
  void how;L.push(...vals.map((v,i)=>'Part '+(i+1)+' = '+parts[i]+' × '+nf(vals[i]/parts[i])+' = '+nf(v)));
  L.push('Answer: '+vals.map(nf).join(', '));return R(L,vals.map(nf).join(', '),vals[0],'Maths — ratio and proportion')});
add('work',(T,low)=>{
  if(!/\b(work|job|task|wall|tank|pipe|fill|build|finish|complete)\b/i.test(T)||!/\bdays?|hours?\b/i.test(T))return null;
  const unit=/hours?/i.test(T)&&!/days?/i.test(T)?'hours':'days';
  const people=[...T.matchAll(/\b([A-D])\b[^.?;]{0,70}?\b(\d+(?:\.\d+)?)\s*(?:days?|hours?)/g)].map(x=>({n:x[1],t:+x[2]}));
  const uniq=[];people.forEach(p=>{if(!uniq.some(u=>u.n===p.n))uniq.push(p)});
  if(uniq.length>=2&&/together|jointly|both|combined|all/i.test(T)&&/(how many|how long|how much time|in how many|find the time)/i.test(T)){
    const r=uniq.reduce((s,p)=>s+1/p.t,0),d=1/r;
    return R(['Given: '+uniq.map(p=>p.n+' alone takes '+nf(p.t)+' '+unit).join(', '),'Work done in 1 '+unit.slice(0,-1)+': '+uniq.map(p=>p.n+' = 1/'+nf(p.t)).join(', '),'Together in 1 '+unit.slice(0,-1)+' = '+uniq.map(p=>'1/'+nf(p.t)).join(' + ')+' = '+nf(r),'Time taken together = 1 / '+nf(r)+' = '+nf(d)+' '+unit,'Answer: '+nf(d)+' '+unit],nf(d)+' '+unit,d,'Maths — time and work')}
  const tg=/\b(?:A\s+and\s+B|both)\b[^.?;]{0,60}?(\d+(?:\.\d+)?)\s*(?:days?|hours?)/i.exec(T);
  if(tg&&uniq.length>=1&&/\b(B|A)\s+alone|alone|separately|only\b/i.test(T)&&/(how many|how long|find)/i.test(T)){
    const one=uniq.find(p=>!/A\s+and\s+B/.test(T.slice(Math.max(0,T.indexOf(String(p.t))-30),T.indexOf(String(p.t)))));
    if(one&&+tg[1]!==one.t){const rem=1/+tg[1]-1/one.t,d=1/rem,other=one.n==='A'?'B':'A';
      return R(['A and B together do 1/'+nf(+tg[1])+' of the work per '+unit.slice(0,-1),one.n+' alone does 1/'+nf(one.t),other+' alone does 1/'+nf(+tg[1])+' − 1/'+nf(one.t)+' = '+nf(rem)+' per '+unit.slice(0,-1),'Time for '+other+' alone = 1 / '+nf(rem)+' = '+nf(d)+' '+unit,'Answer: '+nf(d)+' '+unit],nf(d)+' '+unit,d,'Maths — time and work')}}
  return null});
const primeFactors=n=>{const f=[];for(let p=2;p*p<=n;p++)while(n%p===0){f.push(p);n/=p}if(n>1)f.push(n);return f};
const gcdN=(a,b)=>b?gcdN(b,a%b):a;
const expForm=f=>{const c={};f.forEach(x=>c[x]=(c[x]||0)+1);return Object.keys(c).map(k=>k+(c[k]>1?sup(c[k]):'')).join(' × ')};
add('hcflcm',(T,low)=>{
  if(!/\b(hcf|gcd|lcm|highest common factor|greatest common divisor|lowest common multiple|least common multiple)\b/i.test(T))return null;
  const ns=(T.match(/\b\d+\b/g)||[]).map(Number).filter(n=>n>0&&n<1e9);if(ns.length<2||ns.length>4)return null;
  const wantH=/hcf|gcd|highest common|greatest common/i.test(T),wantL=/lcm|lowest common|least common/i.test(T);
  const h=ns.reduce(gcdN),l=ns.reduce((a,b)=>a*b/gcdN(a,b));
  const L=['Numbers: '+ns.join(', ')].concat(ns.map(n=>'  '+n+' = '+expForm(primeFactors(n))));
  if(wantH)L.push('HCF = product of the common prime factors with the smallest powers = '+h);
  if(wantL)L.push('LCM = product of all prime factors with the highest powers = '+l);
  L.push('Answer: '+[wantH?'HCF = '+h:'',wantL?'LCM = '+l:''].filter(Boolean).join(', '));
  return R(L,[wantH?'HCF = '+h:'',wantL?'LCM = '+l:''].filter(Boolean).join(', '),wantH?h:l,'Maths — HCF and LCM')});
add('primes',(T,low)=>{
  let m=/prime\s+factor(?:s|isation|ization)?\s+of\s+(\d+)/i.exec(T)||/factori[sz]e\s+(\d+)/i.exec(T);
  if(m){const n=+m[1],f=primeFactors(n);return R(['Divide by the smallest primes in turn:'].concat((()=>{let k=n,rows=[];for(const p of f){rows.push('  '+k+' ÷ '+p+' = '+k/p);k/=p}return rows})(),[n+' = '+f.join(' × ')+(new Set(f).size<f.length?' = '+expForm(f):''),'Answer: '+f.join(' × ')]),f.join(' × '),f.length,'Maths — prime factors')}
  m=/\bis\s+(\d+)\s+a\s+prime|\b(\d+)\s+(?:is\s+)?(?:a\s+)?prime\s+(?:number\s+)?or\s+composite|prime\s+or\s+composite[^0-9]*(\d+)|check whether\s+(\d+)\s+is\s+(?:a\s+)?prime/i.exec(T);
  if(m){const n=+(m[1]||m[2]||m[3]||m[4]),isP=n>1&&primeFactors(n).length===1,d=primeFactors(n)[0];
    return R(['To test '+n+', try dividing by every prime up to √'+n+' ≈ '+nf(Math.sqrt(n))+'.',isP?'None of them divides '+n+' exactly.':n+' is divisible by '+d+' ('+n+' = '+d+' × '+n/d+').','Answer: '+n+' is '+(isP?'a prime number':'not a prime number (it is composite)')],isP?'prime':'composite',isP?1:0,'Maths — prime numbers')}
  return null});
add('roots',(T,low)=>{
  const m=/\b(square|cube)\s+root\s+of\s+(\d+(?:\.\d+)?)/i.exec(T);if(!m)return null;
  const n=+m[2],sq=/square/i.test(m[1]),v=sq?Math.sqrt(n):Math.cbrt(n),k=sq?2:3,L=[(sq?'√':'∛')+nf(n)+' = ?'];
  if(Number.isInteger(n)){const f=primeFactors(n),c={};f.forEach(x=>c[x]=(c[x]||0)+1);L.push(n+' = '+expForm(f));if(Object.values(c).every(e=>e%k===0))L.push('Take one of every '+k+' equal prime factors: '+Object.keys(c).map(p=>p+(c[p]/k>1?sup(c[p]/k):'')).join(' × ')+' = '+nf(v))}
  L.push('Answer: '+(sq?'√':'∛')+nf(n)+' = '+(Number.isInteger(v)?v:nf(v)+' (≈ '+fmt(v,6)+')'));return R(L,nf(v),v,'Maths — roots')});


/* electrons with one spin (ms = +1/2 or -1/2) in a shell: half of 2n^2 = n^2 */
add('spinelec',(T,low)=>{
  if(!/electrons?/.test(low)||!/(?:\bms\b|m_s|spin)[^.?]{0,30}?(?:[-+−]\s*)?(?:1\/2|0\.5|½)/.test(low))return null;
  const m=low.match(/\bn\s*=\s*(\d)\b/);if(!m)return null;const n=+m[1],v=n*n;
  return R(['Given: n = '+n+', ms = -1/2','Formula: each orbital holds 2 electrons (one with ms = +1/2, one with ms = -1/2). Orbitals in shell n = n²','Calculation: electrons with ms = -1/2 = n² = '+n+'² = '+v,'Answer: '+v+' electrons'],String(v),v,'Atomic structure')});
/* =============== dispatcher =============== */
const ORDER=['spinelec','stdsum','sequence','percent','average','ratio','work','hcflcm','primes','roots','numsys','convert','molarmass','derivative','integral','limit','python','sql','boolean','punnett','hardyw','sacrifice','elasticity','dice','coins','cards','bag','binomdist','equations','geometry','vectors','complex','matrix','counting','stats','evaluate'];
function solve(text){
  const T=prep(text),low=T.toLowerCase();
  const list=ORDER.map(n=>SOLVERS.find(s=>s.name===n)).filter(Boolean);
  for(const s of list){let r=null;try{r=s.run(T,low)}catch(e){r=null}
    if(r&&r.lines&&r.lines.length)return finish(r,s.name)}
  let r=null;try{r=S.formulaSolve(text)}catch(e){r=null}
  return r?finish(r,'formula'):null}
function finish(r,name){
  const lines=[];(r.lines||[]).forEach(l=>String(l).split('\n').forEach(x=>lines.push(x)));
  return{lines,ans:r.ans||'',num:r.num===undefined?null:r.num,unit:r.unit||'',topic:r.topic||r.sub||'',kind:name,name:r.name||''}}
S.solve=solve;S.prep=prep;S.solvers=SOLVERS;
if(typeof module!=='undefined')module.exports=S;
})(typeof window!=='undefined'?window:globalThis);
