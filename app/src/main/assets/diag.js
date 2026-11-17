/* diag.js - diagrams: draw common school diagrams ourselves as SVG
   (graphs, ray diagrams, circuits, economics curves, logic gates, projectile, energy profile, Venn, free-body). */
(function(G){'use strict';
const QA=G.QA,E=QA.E,D=QA.Diag={};
const W=600,H=450,esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const svg=b=>"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "+W+" "+H+"' font-family='sans-serif' font-size='15'><rect width='"+W+"' height='"+H+"' fill='#fff' stroke='none'/>"+b+"</svg>";
const r1=v=>Math.round(v*10)/10;
const T=(x,y,s,o)=>"<text x='"+r1(x)+"' y='"+r1(y)+"' "+(o||'')+">"+esc(s)+"</text>";
const L=(a,b,c,d,o)=>"<line x1='"+r1(a)+"' y1='"+r1(b)+"' x2='"+r1(c)+"' y2='"+r1(d)+"' "+(o||"stroke='#000' stroke-width='2'")+"/>";
const arrow=(a,b,c,d,col)=>{const an=Math.atan2(d-b,c-a),k=11,p=(t)=>r1(c-k*Math.cos(an+t))+','+r1(d-k*Math.sin(an+t));
  return L(a,b,c,d,"stroke='"+(col||'#000')+"' stroke-width='2.2'")+"<polygon points='"+r1(c)+','+r1(d)+' '+p(0.4)+' '+p(-0.4)+"' fill='"+(col||'#000')+"' stroke='none'/>"};
const path=(pts,o)=>"<polyline points='"+pts.map(p=>r1(p[0])+','+r1(p[1])).join(' ')+"' fill='none' "+(o||"stroke='#000' stroke-width='2.2'")+"/>";
const dash="stroke-dasharray='6 5'";
function nice(span,n){const raw=span/(n||5),m=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/m;return(f<1.5?1:f<3.5?2:f<7.5?5:10)*m}

/* ---------- graph of y = f(x) or a list of points ---------- */
D.graph=function(o){
  o=o||{};const ml=64,mr=24,mt=46,mb=56,pw=W-ml-mr,ph=H-mt-mb;
  let pts=o.pts,fx=null;
  if(!pts){try{fx=E.parse(o.fn,'m')}catch(e){return null}}
  const x0=o.xmin!==undefined?o.xmin:-5,x1=o.xmax!==undefined?o.xmax:5;
  if(!pts){pts=[];for(let i=0;i<=300;i++){const x=x0+(x1-x0)*i/300;let y;try{y=E.ev(fx,{x})}catch(e){y=NaN}pts.push([x,y])}}
  const ys=pts.map(p=>p[1]).filter(y=>isFinite(y)&&Math.abs(y)<1e6);if(!ys.length)return null;
  let y0=o.ymin!==undefined?o.ymin:Math.min(...ys),y1=o.ymax!==undefined?o.ymax:Math.max(...ys);
  if(o.ymin===undefined&&y0>0&&y0<(y1-y0)*0.4&&!o.pts)y0=0;if(o.ymax===undefined&&y1<0&&-y1<(y1-y0)*0.4&&!o.pts)y1=0;
  if(y1-y0<1e-9){y0-=1;y1+=1}const pad=(y1-y0)*0.08;if(o.ymin===undefined)y0-=pad;if(o.ymax===undefined)y1+=pad;
  const X=x=>ml+(x-x0)/(x1-x0)*pw,Y=y=>mt+ph-(y-y0)/(y1-y0)*ph;
  let b="<rect x='"+ml+"' y='"+mt+"' width='"+pw+"' height='"+ph+"' fill='#fff' stroke='#bbb'/>";
  const sx=nice(x1-x0,6),sy=nice(y1-y0,6);
  for(let v=Math.ceil(x0/sx)*sx;v<=x1+1e-9;v+=sx){b+=L(X(v),mt,X(v),mt+ph,"stroke='#e3e3e3'")+T(X(v),mt+ph+18,String(+v.toPrecision(4)),"text-anchor='middle' font-size='12'")}
  for(let v=Math.ceil(y0/sy)*sy;v<=y1+1e-9;v+=sy){b+=L(ml,Y(v),ml+pw,Y(v),"stroke='#e3e3e3'")+T(ml-6,Y(v)+4,String(+v.toPrecision(4)),"text-anchor='end' font-size='12'")}
  if(y0<0&&y1>0)b+=L(ml,Y(0),ml+pw,Y(0),"stroke='#000' stroke-width='1.6'");
  if(x0<0&&x1>0)b+=L(X(0),mt,X(0),mt+ph,"stroke='#000' stroke-width='1.6'");
  let seg=[],segs=[];
  for(const p of pts){if(isFinite(p[1])&&Math.abs(p[1])<1e6&&p[1]>=y0-(y1-y0)&&p[1]<=y1+(y1-y0))seg.push([X(p[0]),Math.max(mt-4,Math.min(mt+ph+4,Y(p[1])))]);else{if(seg.length>1)segs.push(seg);seg=[]}}
  if(seg.length>1)segs.push(seg);
  segs.forEach(s=>{b+=path(s,"stroke='#1f4fd8' stroke-width='2.6'")});
  if(o.mark)o.mark.forEach(m=>{b+="<circle cx='"+r1(X(m[0]))+"' cy='"+r1(Y(m[1]))+"' r='4.5' fill='#d33' stroke='none'/>"+(m[2]?T(X(m[0])+8,Y(m[1])-8,m[2],"font-size='13'"):'')});
  b+=T(W/2,28,o.title||(o.fn?'y = '+o.fn:'Graph'),"text-anchor='middle' font-size='17' font-weight='bold'");
  b+=T(ml+pw/2,H-12,o.xlabel||'x',"text-anchor='middle'")+T(16,mt+ph/2,o.ylabel||'y',"text-anchor='middle' transform='rotate(-90 16 "+(mt+ph/2)+")'");
  return svg(b)};

/* ---------- ray diagrams for lenses and mirrors ---------- */
D.rays=function(o){
  const lens=o.type!=='mirror',convex=o.kind!=='concave',f0=Math.abs(o.f||10),u=Math.abs(o.u||2.5*f0);
  const ucart=-u,f=convex?f0:-f0;
  const v=lens?1/(1/f+1/ucart):1/(1/(convex?f0:-f0)-1/ucart);   // cartesian sign convention (mirror: concave f<0)
  const mag=lens?v/ucart:-v/ucart,real=lens?v>0:v<0;
  const sc=Math.min(250/Math.max(u,Math.abs(v)*0.9,f0*2.2),9),cx=lens?300:440,cy=235,xo=cx-u*sc,ho=Math.min(70,150/Math.max(1,Math.abs(mag)));
  const k2=(a,d)=>{const k=d[0]>0?(W-30-a[0])/d[0]:(a[0]-30)/-d[0];return[a[0]+d[0]*k,a[1]+d[1]*k]};
  let b=L(30,cy,W-30,cy,"stroke='#000' stroke-width='1.6'");
  const mark=(x,t)=>"<circle cx='"+r1(x)+"' cy='"+cy+"' r='3.5' fill='#000'/>"+T(x,cy+20,t,"text-anchor='middle' font-size='13'");
  if(lens){
    b+=convex?"<path d='M "+cx+" "+(cy-120)+" Q "+(cx+24)+" "+cy+" "+cx+" "+(cy+120)+" Q "+(cx-24)+" "+cy+" "+cx+" "+(cy-120)+"' fill='#dfefff' stroke='#1f4fd8' stroke-width='2'/>":"<path d='M "+(cx-14)+" "+(cy-120)+" Q "+(cx+2)+" "+cy+" "+(cx-14)+" "+(cy+120)+" L "+(cx+14)+" "+(cy+120)+" Q "+(cx-2)+" "+cy+" "+(cx+14)+" "+(cy-120)+" Z' fill='#dfefff' stroke='#1f4fd8' stroke-width='2'/>";
    b+=T(cx,cy-128,(convex?'Convex':'Concave')+' lens',"text-anchor='middle' font-size='13'")+mark(cx-f0*sc,'F')+mark(cx+f0*sc,"F'")+mark(cx-2*f0*sc,'2F')+mark(cx+2*f0*sc,"2F'")}
  else{
    b+="<path d='M "+cx+" "+(cy-130)+" Q "+(cx+(convex?28:-28))+" "+cy+" "+cx+" "+(cy+130)+"' fill='none' stroke='#1f4fd8' stroke-width='3'/>";
    for(let k=-120;k<=120;k+=24)b+=L(cx,cy+k,cx+(convex?12:-12),cy+k+12,"stroke='#1f4fd8' stroke-width='1'");
    b+=T(cx,cy-138,(convex?'Convex':'Concave')+' mirror',"text-anchor='middle' font-size='13'")+mark(cx,'P')+mark(cx+(convex?1:-1)*f0*sc,'F')+mark(cx+(convex?1:-1)*2*f0*sc,'C')}
  const topO=[xo,cy-ho],hit=[cx,topO[1]],xi=cx+v*sc,tip=[xi,cy-mag*ho];
  b+=arrow(xo,cy,xo,cy-ho,'#222')+T(xo,cy+18,'Object',"text-anchor='middle' font-size='12'");
  const red="stroke='#d33' stroke-width='2'",grn="stroke='#2a8a3a' stroke-width='2'",dsh=" "+dash;
  // ray 1: parallel to the axis, then through F (or as if from F)
  b+=path([topO,hit],red);
  const d1=real?[tip[0]-hit[0],tip[1]-hit[1]]:[hit[0]-tip[0],hit[1]-tip[1]];
  b+=path([hit,k2(hit,d1)],red);if(!real)b+=path([hit,tip],"stroke='#d33' stroke-width='1.6'"+dsh);
  // ray 2: through the optical centre (lens) or the pole (mirror)
  const c=[cx,cy],dx=cx-xo,dy=cy-topO[1];
  b+=path([topO,c],grn);
  if(lens)b+=path([c,k2(c,[dx,dy])],grn);
  else b+=path([c,k2(c,[-dx,dy])],grn);
  if(!real)b+=path([c,tip],"stroke='#2a8a3a' stroke-width='1.6'"+dsh);
  b+=arrow(xi,cy,tip[0],tip[1],'#c06000')+T(xi,(tip[1]<cy?tip[1]-8:tip[1]+16),'Image',"text-anchor='middle' font-size='12'");
  b+=T(W/2,24,'Image formation: '+(real?'real':'virtual')+', '+(mag<0?'inverted':'erect')+', '+(Math.abs(mag)>1?'magnified':'diminished'),"text-anchor='middle' font-size='16' font-weight='bold'")+T(W/2,H-12,'f = '+(f>0?'+':'−')+f0+' cm,  u = −'+u+' cm,  v = '+r1(v)+' cm,  m = '+r1(mag),"text-anchor='middle' font-size='13'");
  return svg(b)};

/* ---------- circuits ---------- */
const zig=(x,y,len)=>{const n=6,s=len/n,p=[[x,y]];for(let i=0;i<n;i++)p.push([x+s*(i+0.5),y+(i%2?10:-10)]);p.push([x+len,y]);return path(p,"stroke='#000' stroke-width='2.2'")};
const zigV=(x,y,len)=>{const n=6,s=len/n,p=[[x,y]];for(let i=0;i<n;i++)p.push([x+(i%2?10:-10),y+s*(i+0.5)]);p.push([x,y+len]);return path(p,"stroke='#000' stroke-width='2.2'")};
D.circuit=function(o){
  const par=o.mode==='parallel',n=Math.min(4,Math.max(2,o.n||2)),lab=o.labels||[],val=o.values||[];
  const lx=90,rx=520,ty=90,by=360;let b='';
  b+=L(lx,ty,lx,by-50)+L(lx,by-30,lx,by)+L(lx-18,by-50,lx+18,by-50,"stroke='#000' stroke-width='3'")+L(lx-10,by-30,lx+10,by-30,"stroke='#000' stroke-width='3'")+T(lx-40,by-48,'+',"font-size='16'")+T(lx-40,by-22,'−',"font-size='16'")+T(lx+26,by-34,o.cell||'Cell / battery',"font-size='12'");
  if(!par){
    b+=L(lx,by,rx,by)+L(rx,by,rx,ty)+L(lx,ty,150,ty);
    const seg=(rx-150-12*n)/n;
    for(let i=0;i<n;i++){const x=150+i*(seg+12);b+=zig(x,ty,seg)+T(x+seg/2,ty-22,lab[i]||'R'+(i+1),"text-anchor='middle'")+(val[i]?T(x+seg/2,ty+32,val[i],"text-anchor='middle' font-size='12'"):'')+L(x+seg,ty,x+seg+12,ty)}
    b+=T(W/2,H-14,'Series: the same current flows through every resistor; total R = R1 + R2'+(n>2?' + …':''),"text-anchor='middle' font-size='13'")}
  else{
    b+=L(lx,ty,rx,ty)+L(lx,by,rx,by);
    const gap=(rx-lx-80)/(n-1||1);
    for(let i=0;i<n;i++){const x=lx+70+i*gap,len=120,y0=ty+(by-ty-len)/2;
      b+=L(x,ty,x,y0)+zigV(x,y0,len)+L(x,y0+len,x,by)+"<circle cx='"+x+"' cy='"+ty+"' r='3.5' fill='#000'/><circle cx='"+x+"' cy='"+by+"' r='3.5' fill='#000'/>"+T(x+22,y0+len/2+5,lab[i]||'R'+(i+1),"font-size='15'")+(val[i]?T(x+22,y0+len/2+22,val[i],"font-size='12'"):'')}
    b+=T(W/2,H-14,'Parallel: the same voltage across every resistor; 1/R = 1/R1 + 1/R2'+(n>2?' + …':''),"text-anchor='middle' font-size='13'")}
  b+=T(W/2,34,(par?'Parallel':'Series')+' combination of resistors',"text-anchor='middle' font-size='17' font-weight='bold'");
  return svg(b)};

/* ---------- economics curves ---------- */
const axes=(b,xl,yl,t)=>L(90,380,540,380)+L(90,380,90,60)+arrow(540,380,552,380)+arrow(90,60,90,48)+T(545,404,xl||'Quantity',"text-anchor='end'")+T(28,220,yl||'Price',"text-anchor='middle' transform='rotate(-90 28 220)'")+T(W/2,28,t||'',"text-anchor='middle' font-size='17' font-weight='bold'");
D.demandSupply=function(){
  let b=axes('','Quantity (Q)','Price (P)','Market equilibrium');
  b+=path([[130,100],[500,340]],"stroke='#1f4fd8' stroke-width='3'")+path([[130,340],[500,100]],"stroke='#d33' stroke-width='3'")+T(505,352,'D',"font-weight='bold' fill='#1f4fd8'")+T(505,100,'S',"font-weight='bold' fill='#d33'");
  b+="<circle cx='315' cy='220' r='5' fill='#000'/>"+T(325,212,'E (equilibrium)')+L(90,220,315,220,"stroke='#555' "+dash)+L(315,220,315,380,"stroke='#555' "+dash)+T(84,224,'P*',"text-anchor='end'")+T(315,400,'Q*',"text-anchor='middle'");
  return svg(b)};
D.ppc=function(){
  let b=axes('','Good X (units)','Good Y (units)','Production possibility curve');
  const pts=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI/2;pts.push([90+430*Math.sin(t),380-300*Math.cos(t)])}
  b+=path(pts,"stroke='#1f4fd8' stroke-width='3'");
  [[90+430*Math.sin(0.4),380-300*Math.cos(0.4),'A'],[90+430*Math.sin(0.8),380-300*Math.cos(0.8),'B'],[90+430*Math.sin(1.2),380-300*Math.cos(1.2),'C']].forEach(p=>{b+="<circle cx='"+r1(p[0])+"' cy='"+r1(p[1])+"' r='5' fill='#d33'/>"+T(p[0]+8,p[1]-8,p[2])});
  b+="<circle cx='230' cy='300' r='5' fill='#000'/>"+T(240,296,'U (inefficient, inside)')+"<circle cx='460' cy='120' r='5' fill='#888'/>"+T(300,110,'Unattainable (outside)');
  return svg(b)};
D.cost=function(){
  let b=axes('','Output (Q)','Cost','Short-run cost curves');
  const AC=[],AVC=[],MC=[];
  for(let i=2;i<=44;i++){const t=i/44,x=90+430*t,vc=40+250*Math.pow(t-0.4,2)*1.4;AVC.push([x,380-vc*1.1-20]);AC.push([x,380-(vc+70/(t*3+0.4))*0.8-20]);MC.push([x,380-(60+420*Math.pow(t-0.28,2)*1.1)])}
  b+=path(AC,"stroke='#1f4fd8' stroke-width='3'")+path(AVC,"stroke='#2a8a3a' stroke-width='3'")+path(MC.filter(p=>p[1]>70),"stroke='#d33' stroke-width='3'");
  b+=T(96,AC[0][1]-8,'AC',"fill='#1f4fd8' font-weight='bold'")+T(96,AVC[0][1]+22,'AVC',"fill='#2a8a3a' font-weight='bold'")+T(480,90,'MC',"fill='#d33' font-weight='bold'")+T(W/2,H-12,'MC cuts AVC and AC at their minimum points',"text-anchor='middle' font-size='13'");
  return svg(b)};

/* ---------- physics / chemistry pictures ---------- */
D.projectile=function(o){
  o=o||{};const th=(o.theta||45)*Math.PI/180,u=o.u||20,R=u*u*Math.sin(2*th)/9.8,Hh=u*u*Math.pow(Math.sin(th),2)/(2*9.8),sx=420/R,sy=Math.min(sx,230/Hh);
  const p=[];for(let i=0;i<=60;i++){const x=R*i/60,y=x*Math.tan(th)-9.8*x*x/(2*u*u*Math.cos(th)*Math.cos(th));p.push([80+x*sx,360-y*sy])}
  let b=L(60,360,540,360)+L(80,380,80,60)+path(p,"stroke='#1f4fd8' stroke-width='3'")+arrow(80,360,80+90*Math.cos(th),360-90*Math.sin(th),'#d33')+T(80+95*Math.cos(th),355-95*Math.sin(th),'u',"fill='#d33'")+"<path d='M 125 360 A 45 45 0 0 0 "+r1(80+45*Math.cos(th))+' '+r1(360-45*Math.sin(th))+"' fill='none' stroke='#d33'/>"+T(135,350,'θ = '+r1(o.theta||45)+'°',"font-size='13'");
  b+=L(80+R*sx/2,360-Hh*sy,80+R*sx/2,360,"stroke='#555' "+dash)+T(80+R*sx/2+6,360-Hh*sy/2,'H = '+r1(Hh)+' m',"font-size='13'")+L(80,376,80+R*sx,376,"stroke='#555'")+T(80+R*sx/2,396,'Range R = '+r1(R)+' m',"text-anchor='middle' font-size='13'");
  b+=T(W/2,28,'Projectile motion (u = '+r1(u)+' m/s)',"text-anchor='middle' font-size='17' font-weight='bold'");return svg(b)};
D.energy=function(o){
  const exo=!(o&&o.endo);let b=axes('','Reaction coordinate','Potential energy','Energy profile of an '+(exo?'exothermic':'endothermic')+' reaction');
  const yr=exo?150:290,yp=exo?290:150,pk=70;
  b+=path([[100,yr],[200,yr],[260,pk+30],[320,pk],[380,pk+30],[440,yp],[540,yp]].map(p=>p),"stroke='#1f4fd8' stroke-width='3'");
  b+=T(130,yr-8,'Reactants')+T(470,yp-8,'Products')+T(320,pk-10,'Transition state',"text-anchor='middle' font-size='13'");
  b+=arrow(250,yr,250,pk+4,'#d33')+T(262,(yr+pk)/2,'Ea',"fill='#d33'")+arrow(510,yr,510,yp,'#2a8a3a')+T(440,(yr+yp)/2+4,exo?'ΔH < 0':'ΔH > 0',"fill='#2a8a3a'");
  return svg(b)};
D.freebody=function(o){
  let b="<rect x='240' y='190' width='120' height='80' fill='#eef' stroke='#000' stroke-width='2.5'/>"+T(300,236,'m',"text-anchor='middle' font-size='20'")+L(120,270,480,270,"stroke='#777' stroke-width='2'");
  b+=arrow(300,230,300,340,'#d33')+T(310,345,'W = mg',"fill='#d33'")+arrow(300,190,300,90,'#2a8a3a')+T(310,98,'N (normal reaction)',"fill='#2a8a3a'")+arrow(360,230,470,230,'#1f4fd8')+T(400,218,'F (applied)',"fill='#1f4fd8'")+arrow(240,250,130,250,'#c06000')+T(120,243,'f (friction)',"fill='#c06000'");
  b+=T(W/2,28,'Free-body diagram',"text-anchor='middle' font-size='17' font-weight='bold'");return svg(b)};
D.venn=function(o){
  const n=(o&&o.n)||2,nm=(o&&o.names)||['A','B','C'];let b="<rect x='60' y='60' width='480' height='330' fill='none' stroke='#000' stroke-width='2'/>"+T(75,84,'U',"font-weight='bold'");
  if(n===2)b+="<circle cx='240' cy='225' r='100' fill='#1f4fd8' fill-opacity='.25' stroke='#1f4fd8' stroke-width='2'/><circle cx='360' cy='225' r='100' fill='#d33' fill-opacity='.25' stroke='#d33' stroke-width='2'/>"+T(190,160,nm[0],"font-weight='bold'")+T(410,160,nm[1],"font-weight='bold'")+T(300,230,'A ∩ B',"text-anchor='middle'");
  else b+="<circle cx='250' cy='195' r='85' fill='#1f4fd8' fill-opacity='.25' stroke='#1f4fd8' stroke-width='2'/><circle cx='350' cy='195' r='85' fill='#d33' fill-opacity='.25' stroke='#d33' stroke-width='2'/><circle cx='300' cy='275' r='85' fill='#2a8a3a' fill-opacity='.25' stroke='#2a8a3a' stroke-width='2'/>"+T(205,150,nm[0],"font-weight='bold'")+T(395,150,nm[1],"font-weight='bold'")+T(300,345,nm[2],"text-anchor='middle' font-weight='bold'");
  return svg(b)};
D.gate=function(o){
  const g=String((o&&o.g)||'AND').toUpperCase(),inv=/^N/.test(g)&&g!=='NOT',base=g==='NOT'?'NOT':g.replace(/^N/,'');
  let b='';const cy=170,x0=170;
  if(base==='AND')b+="<path d='M "+x0+" "+(cy-55)+" L "+(x0+60)+" "+(cy-55)+" A 55 55 0 0 1 "+(x0+60)+" "+(cy+55)+" L "+x0+" "+(cy+55)+" Z' fill='#eef' stroke='#000' stroke-width='2.5'/>";
  else if(base==='OR'||base==='XOR')b+="<path d='M "+x0+" "+(cy-55)+" Q "+(x0+90)+" "+(cy-55)+" "+(x0+125)+" "+cy+" Q "+(x0+90)+" "+(cy+55)+" "+x0+" "+(cy+55)+" Q "+(x0+28)+" "+cy+" "+x0+" "+(cy-55)+" Z' fill='#eef' stroke='#000' stroke-width='2.5'/>"+(base==='XOR'?"<path d='M "+(x0-14)+" "+(cy-55)+" Q "+(x0+14)+" "+cy+" "+(x0-14)+" "+(cy+55)+"' fill='none' stroke='#000' stroke-width='2.5'/>":'');
  else b+="<polygon points='"+x0+","+(cy-50)+" "+x0+","+(cy+50)+" "+(x0+95)+","+cy+"' fill='#eef' stroke='#000' stroke-width='2.5'/>";
  const xe=base==='NOT'?x0+95:base==='AND'?x0+115:x0+125,two=base!=='NOT';
  b+=L(80,two?cy-28:cy,x0+(base==='NOT'?0:(base==='AND'?0:12)),two?cy-28:cy)+(two?L(80,cy+28,x0+(base==='AND'?0:12),cy+28):'');
  if(inv||base==='NOT'){b+="<circle cx='"+(xe+7)+"' cy='"+cy+"' r='7' fill='#fff' stroke='#000' stroke-width='2.5'/>"+L(xe+14,cy,xe+70,cy)}else b+=L(xe,cy,xe+70,cy);
  b+=T(70,two?cy-24:cy+5,'A',"text-anchor='end'")+(two?T(70,cy+32,'B',"text-anchor='end'"):'')+T(xe+82,cy+5,'Y');
  const rows=base==='NOT'?[['A','Y'],['0','1'],['1','0']]:[['A','B','Y'],...[[0,0],[0,1],[1,0],[1,1]].map(([a,c])=>{let y=base==='AND'?a&c:base==='OR'?a|c:a^c;if(inv)y=1-y;return[a,c,y]})];
  rows.forEach((r,i)=>{b+=T(150,270+i*26,r.join('    '),"font-family='monospace' font-size='16'"+(i?'':" font-weight='bold'"))});
  b+=T(W/2,28,(inv?'N':'')+base+' gate (symbol and truth table)',"text-anchor='middle' font-size='17' font-weight='bold'");return svg(b)};

/* ---------- pick a diagram from the wording of a question ---------- */
const NUM=s=>{const m=/(-?\d+(?:\.\d+)?)/.exec(s||'');return m?+m[1]:undefined};
D.fromText=function(text){
  const t=String(text||''),low=t.toLowerCase();
  let m;
  if(/ray diagram|image formation|formation of (?:an )?image|ray tracing/.test(low)&&/lens|mirror/.test(low)){
    const type=/mirror/.test(low)?'mirror':'lens',kind=/concave/.test(low)?'concave':'convex';
    const f=NUM((/(?:focal length|f)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*cm/i.exec(t)||[])[1]),u=NUM((/(?:object\s+(?:distance|is placed|placed|is at|at|kept at|is kept at)|u)\s*(?:=|at|of|is)?\s*(?:at\s*)?(\d+(?:\.\d+)?)\s*cm/i.exec(t)||[])[1]);
    return D.rays({type,kind,f:f||10,u:u||(f||10)*2.5})}
  if(/circuit/.test(low)&&/resistor|resistance|series|parallel/.test(low)){const par=/parallel/.test(low)&&!/series.*parallel|parallel.*series/.test(low);
    const vals=[...t.matchAll(/(\d+(?:\.\d+)?)\s*(?:ohm|Ω|ohms)/gi)].map(x=>x[1]+' Ω');return D.circuit({mode:par?'parallel':'series',n:Math.max(2,Math.min(4,vals.length||2)),values:vals})}
  if(/demand/.test(low)&&/supply|equilibrium/.test(low))return D.demandSupply();
  if(/production possibilit|\bppc\b|\bppf\b/.test(low))return D.ppc();
  if(/cost curves?|(?:ac|avc|mc)\s+curves?/.test(low))return D.cost();
  if(/(?:\b(and|or|not|nand|nor|xor)\b)\s+gate/.test(low)&&(m=/\b(nand|nor|xor|and|or|not)\s+gate/.exec(low)))return D.gate({g:m[1]});
  if(/projectile|trajectory/.test(low)){const th=NUM((/(\d+(?:\.\d+)?)\s*°|angle (?:of projection )?(?:of|=|is)?\s*(\d+(?:\.\d+)?)/.exec(t)||[])[1]||(/angle[^0-9]*(\d+(?:\.\d+)?)/i.exec(t)||[])[1]),u=NUM((/(\d+(?:\.\d+)?)\s*m\/s/.exec(t)||[])[1]);return D.projectile({theta:th||45,u:u||20})}
  if(/free[- ]body/.test(low))return D.freebody();
  if(/venn/.test(low))return D.venn({n:/three|\bc\b|a,\s*b\s*(?:and|,)\s*c/.test(low)?3:2});
  if(/energy (?:profile|diagram|level diagram)|reaction coordinate|activation energy.*diagram/.test(low)||(/exothermic|endothermic/.test(low)&&/diagram|graph|curve/.test(low)))return D.energy({endo:/endothermic/.test(low)&&!/exothermic/.test(low)});
  if(/(?:velocity|speed)[- ]time (?:graph|curve)|v[- ]t graph/.test(low)){const u0=NUM((/(?:initial velocity|u)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)/i.exec(t)||[])[1])||0,a=NUM((/(?:acceleration|a)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)/i.exec(t)||[])[1])||2,tt=NUM((/(\d+(?:\.\d+)?)\s*s\b/.exec(t)||[])[1])||10;
    return D.graph({pts:[[0,u0],[tt,u0+a*tt]],xmin:0,xmax:tt,ymin:0,title:'Velocity–time graph (uniform acceleration)',xlabel:'Time t (s)',ylabel:'Velocity v (m/s)'})}
  if((m=/(?:graph|plot|curve|sketch)\s+(?:of|for)?\s*(?:the\s+(?:function|curve|equation)\s*)?(?:y\s*=\s*|f\s*\(\s*x\s*\)\s*=\s*)?([^,;?]*[x][^,;?]*?)(?:\s+(?:for|from|between|on|in)\b.*|[.?]?\s*$)/i.exec(t))){
    const ex=m[1].replace(/^[\s:]+/,'').replace(/\bfind\b.*$/i,'').trim();
    if(ex.length<60&&/^[\w\s+\-*\/^().√π]+$/.test(ex)&&!(ex.match(/[A-Za-z]{4,}/g)||[]).some(w=>!/^(sin|cos|tan|sqrt|exp|log|ln|abs)$/i.test(w))){
      const trig=/sin|cos|tan/i.test(ex);let xmin=-5,xmax=5;if(trig){xmin=-6.5;xmax=6.5}else if(/sqrt|log|ln/i.test(ex)){xmin=0.01;xmax=10}
      const rg=/(?:from|between)\s*(-?\d+(?:\.\d+)?)\s*(?:to|and)\s*(-?\d+(?:\.\d+)?)/i.exec(t);if(rg){xmin=+rg[1];xmax=+rg[2]}
      return D.graph({fn:ex.replace(/\^/g,'^'),xmin,xmax,title:'y = '+ex})}}
  return null};

if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
