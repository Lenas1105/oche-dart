/* OCHE 6 · lokale, modellfreie Bildauswertung (Beta). Keine Netzwerkanfragen. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.OcheVision=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
 const TARGETS=[{x:0,y:0},{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
 function solve(A,b){
  const m=A.map((r,i)=>[...r,b[i]]),n=b.length;
  for(let c=0;c<n;c++){
   let best=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[best][c]))best=r;
   if(Math.abs(m[best][c])<1e-10)return null;
   [m[c],m[best]]=[m[best],m[c]];const d=m[c][c];for(let k=c;k<=n;k++)m[c][k]/=d;
   for(let r=0;r<n;r++){if(r===c)continue;const f=m[r][c];for(let k=c;k<=n;k++)m[r][k]-=f*m[c][k]}
  }return m.map(r=>r[n]);
 }
 function calibrate(points,width,height){
  if(!Array.isArray(points)||points.length!==5||width<=0||height<=0)return null;
  const rows=[];const b=[];
  points.forEach((point,i)=>{
   const x=point.x/width,y=point.y/height,u=TARGETS[i].x,v=TARGETS[i].y;
   rows.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
   rows.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);
  });
  const a=Array.from({length:8},()=>Array(8).fill(0)),rhs=Array(8).fill(0);
  for(let row=0;row<rows.length;row++)for(let i=0;i<8;i++){
   rhs[i]+=rows[row][i]*b[row];for(let j=0;j<8;j++)a[i][j]+=rows[row][i]*rows[row][j];
  }
  const h=solve(a,rhs);if(!h)return null;
  const model={h,width,height,points:points.map(p=>({x:p.x,y:p.y}))};
  const maxError=Math.max(...points.map((p,i)=>{const got=project(model,p.x,p.y);return Math.hypot(got.x-TARGETS[i].x,got.y-TARGETS[i].y)}));
  if(!Number.isFinite(maxError)||maxError>.20)return null;
  return model;
 }
 function project(model,x,y){
  const h=model.h,px=x/model.width,py=y/model.height,d=h[6]*px+h[7]*py+1;
  return {x:(h[0]*px+h[1]*py+h[2])/d,y:(h[3]*px+h[4]*py+h[5])/d};
 }
 function hitAt(model,x,y){
  if(!model)return {segment:null,reason:'not-calibrated'};
  const p=project(model,x,y),r=Math.hypot(p.x,p.y);
  if(!Number.isFinite(r))return {segment:null,reason:'geometry'};
  if(r>1)return {segment:'MISS',ring:'outside',p,r,edge:Math.abs(r-1)};
  if(r<=6.35/170)return {segment:'DB',ring:'bull',p,r,edge:Math.abs(r-6.35/170)};
  if(r<=15.9/170)return {segment:'SB',ring:'bull',p,r,edge:Math.min(Math.abs(r-6.35/170),Math.abs(r-15.9/170))};
  let angle=Math.atan2(p.x,-p.y)*180/Math.PI;if(angle<0)angle+=360;
  const idx=Math.floor((angle+9)/18)%20,num=ORDER[idx];
  const band=r>=162/170?'D':r>=107/170?'S':r>=99/170?'T':'S';
  const radialEdges=[15.9/170,99/170,107/170,162/170,1];
  const minEdge=Math.min(...radialEdges.map(v=>Math.abs(r-v)));
  const sliceDistance=Math.min((angle+9)%18,18-((angle+9)%18))*Math.PI/180*r;
  return {segment:band+num,ring:band,p,r,edge:Math.min(minEdge,sliceDistance)};
 }
 function detectChange(before,after,width,height,model,side='right'){
  if(!model||!before||!after||!before.data||!after.data||before.data.length!==after.data.length)return {ok:false,reason:'Keine gültigen Vergleichsbilder.'};
  const step=2,gw=Math.ceil(width/step),gh=Math.ceil(height/step),mask=new Uint8Array(gw*gh);
  let sampled=0,changed=0;
  for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
   const x=gx*step,y=gy*step;
   const p=project(model,x,y),r2=p.x*p.x+p.y*p.y;
   if(r2>1.12*1.12)continue;sampled++;
   const i=(y*width+x)*4;
   const dr=Math.abs(after.data[i]-before.data[i]);
   const dg=Math.abs(after.data[i+1]-before.data[i+1]);
   const db=Math.abs(after.data[i+2]-before.data[i+2]);
   if(dr+dg+db>77&&Math.max(dr,dg,db)>21){mask[gy*gw+gx]=1;changed++}
  }
  if(changed<11)return {ok:false,reason:'Kein neuer Pfeil sichtbar. Prüfe Licht und Kameraposition.',changed,sampled};
  const changeRatio=changed/Math.max(1,sampled);
  if(changeRatio>.085)return {ok:false,reason:'Zu viel Bewegung im Bild. Kamera fest aufstellen und Hände aus dem Bild nehmen.',changed,sampled};
  const seen=new Uint8Array(mask.length),components=[];
  for(let k=0;k<mask.length;k++){
   if(!mask[k]||seen[k])continue;
   const q=[k],points=[];seen[k]=1;
   for(let qi=0;qi<q.length;qi++){
    const z=q[qi],x=z%gw,y=Math.floor(z/gw);points.push({x:x*step,y:y*step});
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     if(!dx&&!dy)continue;
     const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=gw||ny>=gh)continue;
     const nz=ny*gw+nx;if(mask[nz]&&!seen[nz]){seen[nz]=1;q.push(nz)}
    }
   }
   if(points.length>=9){
    const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
    const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
    const span=Math.hypot(maxX-minX,maxY-minY);
    if(span>=9)components.push({points,span,area:points.length});
   }
  }
  if(!components.length)return {ok:false,reason:'Die Veränderung ist für eine sichere Erkennung zu klein.',changed,sampled};
  components.sort((a,b)=>(b.span*Math.sqrt(Math.min(b.area,800)))-(a.span*Math.sqrt(Math.min(a.area,800))));
  const best=components[0];
  if(best.area>4500)return {ok:false,reason:'Zu große Bewegung vor dem Dartboard erkannt.',changed,sampled};
  let key;
  if(side==='left')key=p=>-p.x;
  else if(side==='above')key=p=>-p.y;
  else if(side==='below')key=p=>p.y;
  else if(side==='center'){
   const center=model.points[0];key=p=>Math.hypot(p.x-center.x,p.y-center.y);
  }else key=p=>p.x;
  const sorted=[...best.points].sort((a,b)=>key(a)-key(b));
  const n=Math.max(3,Math.floor(sorted.length*.09)),tip=sorted.slice(0,n).reduce((acc,p)=>({x:acc.x+p.x/n,y:acc.y+p.y/n}),{x:0,y:0});
  const hit=hitAt(model,tip.x,tip.y);
  if(!hit.segment)return {ok:false,reason:'Dartspitze nicht eindeutig.'};
  const confidence=hit.edge>.032&&best.span>=30&&best.area>=20&&changeRatio<.04?'medium':'low';
  return {ok:true,x:tip.x,y:tip.y,segment:hit.segment,confidence,changeRatio,componentSize:best.area,reason:'Vorschlag anhand der Bildveränderung – bitte Dartspitze prüfen.'};
 }
 return {ORDER,calibrate,project,hitAt,detectChange};
});
