
'use strict';
const $=(sel,scope=document)=>scope.querySelector(sel);
const $$=(sel,scope=document)=>Array.from(scope.querySelectorAll(sel));
const STORAGE_KEY='oche-dart-data-v4', PREVIOUS_KEY='oche-dart-data-v3', OLD_V2_KEY='oche-dart-data-v2', LEGACY_KEY='oche-dart-data-v1';
const NUMBERS=Array.from({length:20},(_,i)=>i+1);
const VALID_MODES=['double','straight','master'];
const TARGETS=[
 ...NUMBERS.flatMap(n=>[`S${n}`,`D${n}`,`T${n}`]),'SB','DB'
];
const validSegment=s=>s==='MISS'||TARGETS.includes(s);
const POINTS=Object.fromEntries([...NUMBERS.flatMap(n=>[[`S${n}`,n],[`D${n}`,2*n],[`T${n}`,3*n]]),['SB',25],['DB',50],['MISS',0]]);
const displayed=s=>s==='SB'?'Single Bull':s==='DB'?'Bullseye':s==='MISS'?'Miss':s;
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numberFormat=x=>Number(x||0).toFixed(1).replace('.',',');
const integer=x=>Number.isFinite(Number(x))?Number(x):0;
const localDay=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dayLabel=day=>{const [y,m,d]=day.split('-');return `${d}.${m}.${y}`};
function makeId(){return (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,10)}`}
// OCHE 5: Soundeffekte via Web Audio (keine externen Audiodateien).
const AUDIO_KEY='oche-dart-audio-v5';
let audioSettings={sounds:true,volume:65};
try{audioSettings={...audioSettings,...JSON.parse(localStorage.getItem(AUDIO_KEY)||'{}')};delete audioSettings.voice}catch{}
let audioContext=null;
function audioCtx(){
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});return audioContext;
 }catch{return null}
}
function tone(frequency=560,duration=.09,delay=0,type='sine',level=.12){
 if(!audioSettings.sounds||!audioSettings.volume)return;
 const ctx=audioCtx();if(!ctx)return;
 try{const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime+delay;
 o.type=type;o.frequency.setValueAtTime(frequency,now);
 g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level*audioSettings.volume/100),now+.012);
 g.gain.exponentialRampToValueAtTime(.0001,now+duration);
 o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+duration+.03);
 }catch{}
}
function playEffect(kind){
 if(kind==='dart')tone(420,.065,0,'triangle',.07);
 else if(kind==='bust'){tone(210,.16);tone(160,.19,.13)}
 else if(kind==='high'){tone(520,.11);tone(690,.12,.12);tone(880,.2,.26)}
 else if(kind==='win'){tone(440,.12);tone(550,.12,.13);tone(660,.13,.26);tone(880,.28,.40)}
 else tone(620,.09);
}
function announceVisit(s,id,score,bust,checkout){
 if(checkout)playEffect('win');
 else if(bust)playEffect('bust');
 else if(score>=140)playEffect('high');
 else playEffect('dart');
}
function initAudioControls(){
 const sounds=$('#soundsEnabled'),volume=$('#audioVolume'),label=$('#audioVolumeLabel');
 sounds.checked=!!audioSettings.sounds;
 volume.value=Math.max(0,Math.min(100,Number(audioSettings.volume)||0));label.textContent=volume.value+' %';
 function persist(){localStorage.setItem(AUDIO_KEY,JSON.stringify(audioSettings))}
 sounds.addEventListener('change',()=>{audioSettings.sounds=sounds.checked;persist()});
 volume.addEventListener('input',()=>{audioSettings.volume=Number(volume.value);label.textContent=volume.value+' %';persist()});
 $('#testAudio').addEventListener('click',()=>playEffect('high'));
}
function normalizeDart(raw){
 if(!raw||typeof raw!=='object')return null;
 let segment=raw.segment;
 if(!validSegment(segment)){
  const label=String(raw.label||'').toUpperCase();
  if(label==='SB'||label==='DB'||label==='MISS')segment=label;
  else if(['S','D','T'].includes(label)&&NUMBERS.includes(Number(raw.number)))segment=label+Number(raw.number);
  else if(raw.points===25)segment='SB';
  else if(raw.points===50&&label==='DB')segment='DB';
  else if(raw.points===0)segment='MISS';
 }
 if(!validSegment(segment))return null;
 return {segment,points:POINTS[segment],checkoutAttempt:!!raw.checkoutAttempt};
}
function normalizeGame(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.visits))return null;
 const start=[301,501,701,901,1001].includes(Number(raw.start))?Number(raw.start):501;
 let running=start;
 const visits=raw.visits.slice(0,1000).map((v,i)=>{
   const darts=(Array.isArray(v.darts)?v.darts:[]).slice(0,3).map(normalizeDart).filter(Boolean);
   const bust=!!v.bust;
   const score=bust?0:darts.reduce((s,d)=>s+d.points,0);
   const result={number:i+1,darts,bust,score,remainingBefore:running,checkout:!!v.checkout};
   running-=score;
   return result;
 }).filter(v=>v.darts.length);
 if((raw.checkout||raw.won)&&visits.length){
  const last=visits.at(-1).darts.at(-1);
  if(last)last.checkoutAttempt=true;
 }
 const completedAt=typeof raw.completedAt==='string'?raw.completedAt:
   typeof raw.date==='string'?raw.date:new Date().toISOString();
 const id=typeof raw.id==='string'||typeof raw.id==='number'?raw.id:makeId();
 return {id,start,mode:VALID_MODES.includes(raw.mode)?raw.mode:'double',
   startedAt:typeof raw.startedAt==='string'?raw.startedAt:completedAt,completedAt,visits,remaining:running,
   finished:!!(raw.finished||raw.checkout||raw.won),checkout:!!(raw.checkout||raw.won),turn:[]};
}
function normalizeTraining(raw){
 if(!raw||typeof raw!=='object'||!TARGETS.includes(raw.target)||!Array.isArray(raw.darts))return null;
 const darts=raw.darts.slice(0,20000).map(normalizeDart).filter(Boolean);
 return {id:typeof raw.id==='string'||typeof raw.id==='number'?raw.id:makeId(),
  target:raw.target,goal:Math.max(1,Math.min(20000,integer(raw.goal)||30)),
  startedAt:typeof raw.startedAt==='string'?raw.startedAt:new Date().toISOString(),
  completedAt:typeof raw.completedAt==='string'?raw.completedAt:new Date().toISOString(),darts};
}
// Spielmodell V3: chronologische Aufnahmen mit eindeutiger Rolle "owner"/"guest".
// Der Profil-Selektor gibt ausschließlich die Aufnahmen der Rolle "owner" zurück.
function normalizeMatch(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.visits))return null;
 const start=[301,501,701,901,1001].includes(Number(raw.start))?Number(raw.start):501;
 const hasGuest=!!raw.hasGuest;
 const guestName=String(raw.guestName||'Gast').trim().slice(0,28)||'Gast';
 const scoreState={owner:start,guest:start},visitCount={owner:0,guest:0};
 const visits=[];
 for(const v of raw.visits.slice(0,10000)){
  const player=v?.player==='guest'&&hasGuest?'guest':'owner';
  const darts=(Array.isArray(v?.darts)?v.darts:[]).slice(0,3).map(normalizeDart).filter(Boolean);
  if(!darts.length)continue;
  const bust=!!v.bust,score=bust?0:darts.reduce((n,d)=>n+d.points,0);
  const remainingBefore=scoreState[player];
  if(score>remainingBefore)continue;
  scoreState[player]-=score;
  visits.push({player,number:++visitCount[player],darts,bust,score,remainingBefore,
   checkout:!!v.checkout});
 }
 const winner=(raw.winner==='owner'||(hasGuest&&raw.winner==='guest'))?raw.winner:null;
 return {id:typeof raw.id==='string'||typeof raw.id==='number'?raw.id:makeId(),
  start,mode:VALID_MODES.includes(raw.mode)?raw.mode:'double',hasGuest,guestName,
  startedAt:typeof raw.startedAt==='string'?raw.startedAt:new Date().toISOString(),
  completedAt:typeof raw.completedAt==='string'?raw.completedAt:null,
  activePlayer:hasGuest&&raw.activePlayer==='guest'?'guest':'owner',
  visits,turn:Array.isArray(raw.turn)?raw.turn.slice(0,2).map(normalizeDart).filter(Boolean):[],winner};
}
function oldActiveToMatch(raw){
 const old=normalizeGame({...raw,finished:false,checkout:false});
 if(!old)return null;
 return normalizeMatch({id:old.id,start:old.start,mode:old.mode,startedAt:old.startedAt,
  hasGuest:false,visits:old.visits.map(v=>({...v,player:'owner'})),
  turn:Array.isArray(raw.turn)?raw.turn:[],winner:null,activePlayer:'owner'});
}
function ownGameFromMatch(match){
 // Zentraler Filter: Weder Gastaufnahmen noch Gast-Checkout-Versuche verlassen diese Funktion.
 return {id:match.id,start:match.start,mode:match.mode,startedAt:match.startedAt,
  completedAt:match.completedAt,visits:match.visits.filter(v=>v.player==='owner'),
  checkout:match.winner==='owner',finished:true,
  opponent:match.hasGuest?match.guestName:null,winner:match.winner};
}
// V4: Die Match-Session ist die einzige Quelle der Wahrheit. Ein Checkout wird
// sofort als abgeschlossenes Leg in derselben Session gesichert. Jede Aufnahme
// trägt eine feste playerId. Gäste bleiben außerhalb des persönlichen Profils.
function normaliseSessionVisit(v,players){
 if(!v||!players.some(p=>p.id===v.playerId))return null;
 const darts=(Array.isArray(v.darts)?v.darts:[]).slice(0,3).map(normalizeDart).filter(Boolean);
 if(!darts.length)return null;
 const bust=!!v.bust;
 return {playerId:v.playerId,number:Math.max(1,integer(v.number)||1),
  darts,score:bust?0:darts.reduce((sum,d)=>sum+d.points,0),bust,checkout:!!v.checkout};
}
function normalizeSession(raw){
 if(!raw||!Array.isArray(raw.players)||!raw.players.length)return null;
 const players=[],used=new Set();
 for(const p of raw.players){
  if(!p||typeof p.id!=='string'||!p.id||used.has(p.id))continue;
  used.add(p.id);
  players.push({id:p.id,role:p.id==='owner'?'owner':'guest',
   name:p.id==='owner'?'Du':String(p.name||'Gast').trim().slice(0,28)||'Gast'});
 }
 if(!players.some(p=>p.id==='owner'))return null;
 const format=['free','legs','sets'].includes(raw.format)?raw.format:'free';
 const completedLegs=(Array.isArray(raw.completedLegs)?raw.completedLegs:[]).map((leg,i)=>{
  if(!players.some(p=>p.id===leg?.winnerId))return null;
  const visits=(Array.isArray(leg.visits)?leg.visits:[]).map(v=>normaliseSessionVisit(v,players)).filter(Boolean);
  return {id:leg.id||makeId(),number:i+1,startedAt:leg.startedAt||raw.startedAt||new Date().toISOString(),
   completedAt:leg.completedAt||new Date().toISOString(),starterIndex:integer(leg.starterIndex)%players.length,
   winnerId:leg.winnerId,visits};
 }).filter(Boolean);
 const visits=(Array.isArray(raw.visits)?raw.visits:[]).map(v=>normaliseSessionVisit(v,players)).filter(Boolean);
 const phase=['playing','between','finished'].includes(raw.phase)?raw.phase:'playing';
 const currentPlayerId=players.some(p=>p.id===raw.currentPlayerId)?raw.currentPlayerId:players[0].id;
 return {id:raw.id||makeId(),start:[301,501,701,901,1001].includes(+raw.start)?+raw.start:501,
  mode:VALID_MODES.includes(raw.mode)?raw.mode:'double',format,
  legsToWin:Math.max(1,Math.min(99,integer(raw.legsToWin)||3)),
  setsToWin:Math.max(1,Math.min(99,integer(raw.setsToWin)||2)),
  legsPerSet:Math.max(1,Math.min(99,integer(raw.legsPerSet)||3)),
  players,firstStarterIndex:Math.max(0,integer(raw.firstStarterIndex))%players.length,
  starterIndex:Math.max(0,integer(raw.starterIndex))%players.length,
  currentPlayerId,phase,completedLegs,visits,
  turn:Array.isArray(raw.turn)?raw.turn.slice(0,2).map(normalizeDart).filter(Boolean):[],
  startedAt:raw.startedAt||new Date().toISOString(),
  legStartedAt:raw.legStartedAt||raw.startedAt||new Date().toISOString(),
  finishedAt:raw.finishedAt||null,finishedReason:raw.finishedReason||null};
}
function migrateOldActive(raw){
 const m=raw.hasGuest!==undefined?normalizeMatch(raw):oldActiveToMatch(raw);
 if(!m)return null;
 const guests=m.hasGuest?[{id:'legacy-guest',role:'guest',name:m.guestName}]:[];
 const players=[{id:'owner',role:'owner',name:'Du'},...guests];
 const currentPlayerId=m.activePlayer==='guest'&&m.hasGuest?'legacy-guest':'owner';
 return normalizeSession({id:m.id,start:m.start,mode:m.mode,format:'free',players,
  firstStarterIndex:0,starterIndex:0,currentPlayerId,
  phase:'playing',startedAt:m.startedAt,legStartedAt:m.startedAt,completedLegs:[],
  visits:m.visits.map(v=>({...v,playerId:v.player==='guest'?'legacy-guest':'owner'})),turn:m.turn});
}
function sessionStandings(session){
 const totals=Object.fromEntries(session.players.map(p=>[p.id,0]));
 const sets=Object.fromEntries(session.players.map(p=>[p.id,0]));
 const inSet=Object.fromEntries(session.players.map(p=>[p.id,0]));
 let setNumber=1,lastSetWinnerId=null;
 for(const leg of session.completedLegs){
  if(!(leg.winnerId in totals))continue;
  totals[leg.winnerId]++;inSet[leg.winnerId]++;
  if(session.format==='sets'&&inSet[leg.winnerId]>=session.legsPerSet){
   sets[leg.winnerId]++;lastSetWinnerId=leg.winnerId;setNumber++;
   for(const id of Object.keys(inSet))inSet[id]=0;
  }else lastSetWinnerId=null;
 }
 const targetWinner=session.players.find(p=>session.format==='legs'&&totals[p.id]>=session.legsToWin||
   session.format==='sets'&&sets[p.id]>=session.setsToWin)?.id||null;
 return {totals,sets,inSet,setNumber,lastSetWinnerId,targetWinner};
}
function sessionLegPlayerVisits(leg,playerId,start){
 let remaining=start;
 return leg.visits.filter(v=>v.playerId===playerId).map(v=>{
  const visit={...v,remainingBefore:remaining};
  remaining-=v.score;return visit;
 });
}
function ownGameFromSessionLeg(session,leg){
 const visits=sessionLegPlayerVisits(leg,'owner',session.start);
 if(!visits.length)return null;
 const opponents=session.players.filter(p=>p.id!=='owner').map(p=>p.name).join(', ');
 return {id:leg.id,start:session.start,mode:session.mode,
  startedAt:leg.startedAt,completedAt:leg.completedAt,visits,
  checkout:leg.winnerId==='owner',finished:true,opponent:opponents||null,
  winner:leg.winnerId==='owner'?'owner':'guest',sessionId:session.id};
}
function profileGames(){
 return [...db.games,...db.matches.filter(m=>!!m.winner).map(ownGameFromMatch),
  ...db.sessions.flatMap(session=>session.completedLegs.map(leg=>ownGameFromSessionLeg(session,leg)).filter(Boolean))];
}
function sessionPlayerName(session,id){return session.players.find(p=>p.id===id)?.name||'Spieler'}
function nextSessionPlayer(session,id){
 const idx=session.players.findIndex(p=>p.id===id);
 return session.players[(idx+1)%session.players.length].id;
}
function sessionCurrentVisits(session,id){return session.visits.filter(v=>v.playerId===id)}
function sessionRemaining(session,id){
 return session.start-sessionCurrentVisits(session,id).reduce((sum,v)=>sum+v.score,0);
}
function normalizeData(raw){
 const base={version:4,games:[],matches:[],sessions:[],trainings:[],activeSessionId:null,activeTraining:null};
 if(!raw||typeof raw!=='object')return base;
 if(Array.isArray(raw.games))base.games=raw.games.slice(0,10000).map(normalizeGame).filter(g=>g&&g.finished);
 if(Array.isArray(raw.matches))base.matches=raw.matches.slice(0,10000).map(normalizeMatch).filter(m=>m&&m.winner);
 if(Array.isArray(raw.sessions))base.sessions=raw.sessions.map(normalizeSession).filter(Boolean);
 if(Array.isArray(raw.trainings))base.trainings=raw.trainings.slice(0,10000).map(normalizeTraining).filter(Boolean);
 if(base.sessions.some(s=>s.id===raw.activeSessionId&&s.phase!=='finished'))
  base.activeSessionId=raw.activeSessionId;
 if(!base.sessions.length&&raw.activeGame&&Array.isArray(raw.activeGame.turn)){
  const old=migrateOldActive(raw.activeGame);
  if(old){base.sessions.push(old);base.activeSessionId=old.id}
 }
 if(raw.activeTraining&&TARGETS.includes(raw.activeTraining.target)&&Array.isArray(raw.activeTraining.darts)){
  const t=normalizeTraining(raw.activeTraining);
  if(t&&t.darts.length<t.goal)base.activeTraining=t;
 }
 return base;
}
function readData(){
 let raw=null;
 try{
  const previous=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(PREVIOUS_KEY)||
   localStorage.getItem(OLD_V2_KEY)||localStorage.getItem(LEGACY_KEY);
  if(previous)raw=JSON.parse(previous);
 }catch(e){console.warn('Speicher kann nicht gelesen werden',e)}
 return normalizeData(raw);
}
let db=readData();
let activeSession=db.sessions.find(s=>s.id===db.activeSessionId)||null;
let activeTraining=db.activeTraining;
let completedTraining=null,activePage='gameView',hitSort='count',setupGuests=[],setupFormat='free';
let gameMarkAttempt=false,toastTimer=null;
function save(){
 db.version=4;db.activeSessionId=activeSession?.phase==='finished'?null:activeSession?.id||null;
 db.activeTraining=activeTraining;
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
 catch(e){toast('Speicher voll oder blockiert: Bitte Backup exportieren.');console.warn(e)}
}
function toast(message){
 const el=$('#toast');el.textContent=message;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)
}
function showPage(id){
 if(!['gameView','trainingView','profileView'].includes(id))return;
 activePage=id;
 $$('.page').forEach(el=>el.classList.toggle('active',el.id===id));
 $$('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.page===id));
 if(id!=='gameView')window.ocheCamera?.onLeaveGame();
 if(id==='profileView')renderProfile();
 if(id==='trainingView')renderTrainingPreview();
 window.scrollTo({top:0,behavior:'auto'});
}
$$('.nav-btn').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$('#brandLink').addEventListener('click',e=>{e.preventDefault();showPage('gameView')});
function updateConnection(){
 const online=navigator.onLine;
 $('#connectionLabel').textContent=online?'Online · Offline bereit':'Offline-Modus';
 $('#connectionDot').style.background=online?'var(--green)':'var(--lime)';
}
window.addEventListener('online',updateConnection);
window.addEventListener('offline',updateConnection);
updateConnection();

function buildKeypad(container,onDart){
 const el=$(container);let multiplier='S';
 el.innerHTML=`<div class="mult-row">
  <button type="button" class="mult-btn active" data-m="S">S <small>Single</small></button>
  <button type="button" class="mult-btn" data-m="D">D <small>Double</small></button>
  <button type="button" class="mult-btn" data-m="T">T <small>Triple</small></button></div>
  <div class="number-grid">${NUMBERS.map(n=>`<button type="button" class="number-btn" data-n="${n}">${n}</button>`).join('')}</div>
  <div class="special-grid">
   <button type="button" class="special-btn" data-segment="SB">25 · Single Bull</button>
   <button type="button" class="special-btn" data-segment="DB">50 · Bull</button>
   <button type="button" class="special-btn" data-segment="MISS">Miss · 0</button>
  </div><p class="keypad-hint">Multiplikator auswählen, dann getroffene Zahl tippen.</p>`;
 el.addEventListener('click',e=>{
  const btn=e.target.closest('button');
  if(!btn||!el.contains(btn))return;
  if(btn.dataset.m){
   multiplier=btn.dataset.m;
   $$('.mult-btn',el).forEach(b=>b.classList.toggle('active',b===btn));
  }else if(btn.dataset.n){onDart(multiplier+btn.dataset.n)}
  else if(btn.dataset.segment){onDart(btn.dataset.segment)}
 });
}
const CHECKOUT_OPTIONS=[
 ...NUMBERS.slice().reverse().map(n=>`T${n}`),
 ...NUMBERS.slice().reverse().map(n=>`S${n}`),
 ...NUMBERS.slice().reverse().map(n=>`D${n}`),
 'SB','DB'
];
function allowedFinisher(segment,mode){
 return mode==='straight'||segment==='DB'||segment.startsWith('D')||(mode==='master'&&segment.startsWith('T'))
}
function lastCost(seg){
 if(seg==='D16')return 0;if(seg==='D20')return .5;if(seg==='D8')return 1;
 if(seg==='D12')return 1.5;if(seg==='D10')return 2;if(seg==='D18')return 2.5;
 if(seg==='DB')return 11;
 if(seg.startsWith('D'))return 5+Math.abs(16-Number(seg.slice(1)))*.1;
 if(seg.startsWith('T'))return 12+Math.abs(20-Number(seg.slice(1)))*.3;
 return 22+Math.abs(20-POINTS[seg])*.15;
}
function throwCost(seg){
 if(seg.startsWith('T'))return 0+(20-Number(seg.slice(1)))*.95;
 if(seg.startsWith('S'))return 16+(20-Number(seg.slice(1)))*.6;
 if(seg.startsWith('D'))return 24+(20-Number(seg.slice(1)))*.65;
 return seg==='SB'?25:30;
}
const solveCache=new Map();
function checkoutRoute(score,available,mode){
 if(score<1||score>180||available<1)return null;
 const key=`${score}|${available}|${mode}`;if(solveCache.has(key))return solveCache.get(key);
 const memory=new Map();
 function search(rem,slots){
  if(rem<=0||slots===0||rem>60*(slots-1)+60)return null;
  const state=`${rem}|${slots}`;if(memory.has(state))return memory.get(state);
  let best=null;
  for(const s of CHECKOUT_OPTIONS){
   const pts=POINTS[s];if(pts>rem)continue;
   if(pts===rem){
    if(!allowedFinisher(s,mode))continue;
    const candidate={route:[s],cost:lastCost(s)};
    if(!best||candidate.cost<best.cost)best=candidate;
   }else if(slots>1){
    if((mode==='double'||mode==='master')&&rem-pts===1)continue;
    const future=search(rem-pts,slots-1);
    if(!future)continue;
    const candidate={route:[s,...future.route],cost:throwCost(s)+future.cost};
    if(!best||candidate.cost<best.cost)best=candidate;
   }
  }
  memory.set(state,best);return best;
 }
 // Prefer checkouts using fewer darts; choose a quality route within the same length.
 for(let len=1;len<=available;len++){
  const result=search(score,len);
  if(result){solveCache.set(key,result.route);return result.route}
 }
 solveCache.set(key,null);return null;
}
const SETUP_SEGMENTS=[
 'T20','T19','T18','T17','T16','T15','T14','T13',
 'S20','S19','S18','S17','S16','S15','S14','S13',
 'S12','S11','S10','S9','S8','S7','S6','S5','S4','S3','S2','S1','SB','D20','D16'
];
const GOOD_LEAVES=[40,32,24,16,36,20,8,12,4,2,50,48,56,64,72,80,88,96,100,104,110,120,121,124,127,130,132,135,136,140,141,144,148,150,151,154,156,157,160,161,164,167,170];
function setupRoute(score,slots,mode){
 if(slots<1||score<1)return [];
 let beam=[{remaining:score,route:[],cost:0}];
 for(let step=0;step<slots;step++){
  const next=[];
  for(const state of beam)for(const seg of SETUP_SEGMENTS){
   const r=state.remaining-POINTS[seg];
   if(r<1||((mode==='double'||mode==='master')&&r===1))continue;
   next.push({remaining:r,route:[...state.route,seg],cost:state.cost+throwCost(seg)*.04});
  }
  next.sort((a,b)=>(a.remaining+a.cost)-(b.remaining+b.cost));
  // Keep candidate diversity by remainder, not only greedy maximal scoring.
  const seen=new Set();beam=[];
  for(const state of next){
   if(seen.has(state.remaining))continue;
   seen.add(state.remaining);beam.push(state);
   if(beam.length>=140)break;
  }
  if(!beam.length)break;
 }
 if(!beam.length)return [];
 let best=beam[0],bestCost=Infinity;
 for(const b of beam){
  const canFinishNext=b.remaining<=170&&!!checkoutRoute(b.remaining,3,mode);
  const preferred=GOOD_LEAVES.indexOf(b.remaining);
  const pref=preferred>=0?preferred:40;
  const cost=b.remaining*.5+(canFinishNext?-90:0)+(b.remaining<=170&&!canFinishNext?55:0)+
    pref*7+b.cost;
  if(cost<bestCost){bestCost=cost;best=b}
 }
 return best.route;
}
function adviceFor(score,slots,mode){
 if(score<=0||slots<1)return {kind:'none',route:[],headline:'Aufnahme abgeschlossen',text:''};
 const route=checkoutRoute(score,slots,mode);
 if(route)return {kind:'checkout',route,headline:`${score} Punkte checken`,text:'Möglicher Checkout-Weg mit den verbleibenden Darts.'};
 const setup=setupRoute(score,slots,mode);
 return {kind:'setup',route:setup,headline:'Günstig stellen',text:score>170?'Noch kein Checkout möglich – Punkte reduzieren.':'Aktuell nicht direkt checkbar – auf ein gutes Finish stellen.'};
}
function allDartsOfGame(game){return game.visits.flatMap(v=>v.darts)}
function visitPoints(game){return game.visits.reduce((sum,v)=>sum+v.score,0)}
function gameDartCount(game){return game.visits.reduce((n,v)=>n+v.darts.length,0)}
function gameAverage(game){
 const thrown=gameDartCount(game);
 return thrown?visitPoints(game)/thrown*3:0;
}
function first9Stats(game){
 const all=game.visits.flatMap(v=>v.darts.map(d=>v.bust?0:d.points));
 const count=Math.min(9,all.length);
 return {points:all.slice(0,9).reduce((s,n)=>s+n,0),darts:count};
}
// MATCH SETUP
function renderSetupGuests(){
 const place=$('#setupPlayers');
 place.innerHTML=`<div class="setup-player owner-player"><span class="player-number">01</span><span class="setup-player-main"><strong>Du</strong><small>Dein Profil · persönliche Statistik</small></span><span class="owner-tag">PROFIL</span></div>`+
  setupGuests.map((g,i)=>`<div class="setup-player guest-player" data-id="${escapeHTML(g.id)}">
   <span class="player-number">${String(i+2).padStart(2,'0')}</span>
   <label class="setup-player-main"><span>GASTSPIELER</span><input type="text" maxlength="28" data-guest-id="${escapeHTML(g.id)}" value="${escapeHTML(g.name)}" placeholder="Name des Spielers" autocomplete="off" aria-label="Name Gastspieler ${i+1}"></label>
   <button type="button" class="remove-guest" data-remove-id="${escapeHTML(g.id)}" aria-label="Gastspieler ${i+1} entfernen">×</button>
  </div>`).join('');
 $('#playerSetupCount').textContent=`${setupGuests.length+1} ${setupGuests.length?'Spieler':'Spieler'}`;
 syncStarterSelect();
}
function syncStarterSelect(){
 const select=$('#firstPlayer'),previous=select.value;
 select.innerHTML=[{id:'owner',name:'Du'},...setupGuests.map((g,i)=>({id:g.id,name:g.name||`Gast ${i+1}`}))]
  .map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join('');
 select.value=[...setupGuests.map(g=>g.id),'owner'].includes(previous)?previous:'owner';
}
$('#addGuest').addEventListener('click',()=>{
 setupGuests.push({id:makeId(),name:`Gast ${setupGuests.length+1}`});
 renderSetupGuests();
 const last=setupGuests.at(-1);$(`[data-guest-id="${last.id}"]`)?.focus?.();
});
$('#setupPlayers').addEventListener('input',e=>{
 const input=e.target.closest('[data-guest-id]');if(!input)return;
 const guest=setupGuests.find(g=>g.id===input.dataset.guestId);
 if(guest){guest.name=input.value;syncStarterSelect()}
});
$('#setupPlayers').addEventListener('click',e=>{
 const btn=e.target.closest('[data-remove-id]');if(!btn)return;
 setupGuests=setupGuests.filter(g=>g.id!==btn.dataset.removeId);
 renderSetupGuests();
});
function setSetupFormat(format){
 setupFormat=['free','legs','sets'].includes(format)?format:'free';
 $$('.format-choice').forEach(b=>b.classList.toggle('selected',b.dataset.format===setupFormat));
 $('#legsFormatOptions').hidden=setupFormat!=='legs';
 $('#setsFormatOptions').hidden=setupFormat!=='sets';
 $('#formatExplanation').textContent=setupFormat==='free'?
  'Ohne festes Limit. Nach jedem Leg entscheidet ihr, ob ihr weiterspielt.':setupFormat==='legs'?
  'Wer zuerst die ausgewählte Anzahl Legs gewinnt, gewinnt das Match.':
  'Ein Set gewinnt, wer zuerst die festgelegte Anzahl Legs erreicht. Wer die eingestellte Anzahl Sets gewinnt, gewinnt das Match.';
}
$('#formatChoices').addEventListener('click',e=>{
 const b=e.target.closest('[data-format]');if(b)setSetupFormat(b.dataset.format);
});
renderSetupGuests();setSetupFormat('free');
function activeMatch(){return activeSession&&activeSession.phase==='playing'?activeSession:null}
function showGameState(){
 const s=activeSession;
 $('#gameSetup').hidden=!!s;
 $('#gameActive').hidden=!s||s.phase!=='playing';
 $('#gameFinished').hidden=!s||s.phase==='playing';
 if(s&&s.phase==='playing')renderGame();
 if(s&&s.phase!=='playing')renderGameFinish();
 window.ocheCamera?.onGameStateChange();
}
function startGame(){
 if(activeSession&&activeSession.phase!=='finished'&&!confirm('Aktuelles Match wirklich beenden? Abgeschlossene Legs bleiben gespeichert; das laufende Leg wird verworfen.'))return;
 if(activeSession&&activeSession.phase!=='finished'){
  activeSession.phase='finished';activeSession.finishedAt=new Date().toISOString();activeSession.finishedReason='manual';
  activeSession.visits=[];activeSession.turn=[];
 }
 const players=[{id:'owner',role:'owner',name:'Du'},...setupGuests.map((g,i)=>({id:g.id,role:'guest',name:String(g.name||'').trim().slice(0,28)||`Gast ${i+1}`}))];
 const firstStarterIndex=Math.max(0,players.findIndex(p=>p.id===$('#firstPlayer').value));
 activeSession={id:makeId(),start:integer($('#startScore').value)||501,
  mode:$('#outMode').value,format:setupFormat,
  legsToWin:integer($('#legsToWin').value)||3,setsToWin:integer($('#setsToWin').value)||2,
  legsPerSet:integer($('#legsPerSet').value)||3,
  players,firstStarterIndex,starterIndex:firstStarterIndex,
  currentPlayerId:players[firstStarterIndex].id,startedAt:new Date().toISOString(),
  legStartedAt:new Date().toISOString(),finishedAt:null,finishedReason:null,
  phase:'playing',completedLegs:[],visits:[],turn:[]};
 db.sessions.push(activeSession);
 gameMarkAttempt=false;updateAttemptToggle();save();showGameState();
}
$('#startGame').addEventListener('click',startGame);
$('#newMatch').addEventListener('click',()=>{activeSession=null;save();showGameState();window.scrollTo(0,0)});
$('#goProfile').addEventListener('click',()=>showPage('profileView'));
function updateAttemptToggle(){
 $('#attemptToggle').setAttribute('aria-pressed',String(gameMarkAttempt));
 $('#attemptCheck').textContent=gameMarkAttempt?'◉':'○';
}
$('#attemptToggle').addEventListener('click',()=>{
 if(!activeMatch())return;
 gameMarkAttempt=!gameMarkAttempt;updateAttemptToggle();
});
function addGameDart(segment){
 const s=activeMatch();if(!s||!validSegment(segment))return;
 window.ocheCamera?.onGameDart(segment);
 const id=s.currentPlayerId;
 const dart={segment,points:POINTS[segment],checkoutAttempt:gameMarkAttempt};
 gameMarkAttempt=false;updateAttemptToggle();
 const before=sessionRemaining(s,id)-s.turn.reduce((n,d)=>n+d.points,0);
 const after=before-dart.points;
 if(after===0&&allowedFinisher(segment,s.mode))dart.checkoutAttempt=true;
 s.turn.push(dart);
 const bust=after<0||(after===0&&!allowedFinisher(segment,s.mode))||
  (after===1&&s.mode!=='straight');
 if(bust){finalizeVisit(true,false);toast(`${sessionPlayerName(s,id)}: Bust – 0 Punkte.`);return}
 if(after===0){finalizeVisit(false,true);return}
 if(s.turn.length===3){finalizeVisit(false,false);return}
 save();renderGame();
}
function finalizeVisit(bust,checkout){
 const s=activeMatch();if(!s||!s.turn.length)return;
 const id=s.currentPlayerId,darts=s.turn.map(d=>({...d})),
  score=bust?0:darts.reduce((n,d)=>n+d.points,0);
 s.visits.push({playerId:id,number:sessionCurrentVisits(s,id).length+1,darts,score,bust,checkout});
 s.turn=[];
 announceVisit(s,id,score,bust,checkout);
 if(checkout){
  const now=new Date().toISOString();
  s.completedLegs.push({id:makeId(),number:s.completedLegs.length+1,
   starterIndex:s.starterIndex,winnerId:id,startedAt:s.legStartedAt,
   completedAt:now,visits:s.visits.map(v=>({...v,darts:v.darts.map(d=>({...d}))}))});
  s.visits=[];
  const standings=sessionStandings(s);
  s.phase=standings.targetWinner?'finished':'between';
  if(standings.targetWinner){s.finishedAt=now;s.finishedReason='target'}
  toast(standings.targetWinner?`${sessionPlayerName(s,id)} gewinnt das Match!`:
   `${sessionPlayerName(s,id)} gewinnt Leg ${s.completedLegs.length}!`);
 }else{
  s.currentPlayerId=nextSessionPlayer(s,id);
 }
 gameMarkAttempt=false;updateAttemptToggle();save();showGameState();
}
function undoGameDart(){
 const s=activeMatch();if(!s)return;
 window.ocheCamera?.onGameDart();
 if(s.turn.length){s.turn.pop()}
 else if(s.visits.length){
  const v=s.visits.pop();
  s.currentPlayerId=v.playerId;
  s.turn=v.darts.slice(0,-1);
 }else{toast('Noch kein Dart zum Rückgängigmachen.');return}
 gameMarkAttempt=false;updateAttemptToggle();save();renderGame();
}
$('#undoGame').addEventListener('click',undoGameDart);
function undoCheckout(){
 const s=activeSession;if(!s||s.phase==='playing'||!s.completedLegs.length)return;
 const last=s.completedLegs.pop();
 const finalVisit=last.visits.at(-1);
 if(!finalVisit)return;
 s.visits=last.visits.slice(0,-1).map(v=>({...v,darts:v.darts.map(d=>({...d}))}));
 s.turn=finalVisit.darts.slice(0,-1).map(d=>({...d}));
 s.currentPlayerId=finalVisit.playerId;
 s.legStartedAt=last.startedAt;
 s.starterIndex=last.starterIndex;
 s.phase='playing';s.finishedAt=null;s.finishedReason=null;
 gameMarkAttempt=false;updateAttemptToggle();save();showGameState();toast('Checkout rückgängig gemacht.');
}
$('#undoCheckout').addEventListener('click',undoCheckout);
function nextLeg(){
 const s=activeSession;if(!s||s.phase!=='between')return;
 s.starterIndex=(s.firstStarterIndex+s.completedLegs.length)%s.players.length;
 s.currentPlayerId=s.players[s.starterIndex].id;
 s.visits=[];s.turn=[];s.legStartedAt=new Date().toISOString();
 s.phase='playing';gameMarkAttempt=false;updateAttemptToggle();save();showGameState();
}
$('#nextLeg').addEventListener('click',nextLeg);
function endMatch(){
 const s=activeSession;if(!s||s.phase==='finished')return;
 if(s.phase==='playing'&&!confirm('Match wirklich beenden? Bereits abgeschlossene Legs bleiben gespeichert. Darts des unvollständigen Legs werden verworfen.'))return;
 s.visits=[];s.turn=[];s.phase='finished';s.finishedAt=new Date().toISOString();s.finishedReason='manual';
 gameMarkAttempt=false;updateAttemptToggle();save();showGameState();
 toast('Match beendet. Alle fertigen Legs gespeichert.');
}
$('#endMatchAfterLeg').addEventListener('click',endMatch);
$('#abandonGame').addEventListener('click',endMatch);
function standingsHTML(s){
 const summary=sessionStandings(s);
 const order=[...s.players].sort((a,b)=>{
  const ax=s.format==='sets'?summary.sets[a.id]:summary.totals[a.id];
  const bx=s.format==='sets'?summary.sets[b.id]:summary.totals[b.id];
  return bx-ax||summary.totals[b.id]-summary.totals[a.id]||s.players.indexOf(a)-s.players.indexOf(b);
 });
 return order.map((p,i)=>{
  const champion=summary.targetWinner===p.id;
  return `<div class="standing-player ${champion?'champion':''}">
    <div class="standing-place">${champion?'🏆':String(i+1).padStart(2,'0')}</div>
    <div class="standing-person"><strong>${escapeHTML(p.name)}</strong><small>${p.role==='owner'?'Dein Profil':'Gastspieler'} · ${summary.totals[p.id]} Legs gesamt</small></div>
    <div class="standing-numbers">
      ${s.format==='sets'?`<strong>${summary.sets[p.id]}<small> SETS</small></strong><span>${summary.inSet[p.id]} Leg(s) im Set</span>`:
       `<strong>${summary.totals[p.id]}<small> LEGS</small></strong>`}
    </div>
  </div>`;
 }).join('');
}
function renderMatchHeader(s){
 const result=sessionStandings(s);
 $('#matchRoundLabel').textContent=`${s.format==='sets'?'SET '+result.setNumber+' · ':''}LEG ${s.completedLegs.length+1}`;
 $('#matchFormatLabel').textContent=s.format==='free'?'Freies Spiel':s.format==='legs'?`Erster mit ${s.legsToWin} Legs`:
  `${s.setsToWin} Sets · ${s.legsPerSet} Legs/Set`;
 $('#matchProgressText').textContent=`${s.completedLegs.length} ${s.completedLegs.length===1?'Leg':'Legs'} gespielt`;
}
function renderGame(){
 const s=activeMatch();if(!s)return;
 const id=s.currentPlayerId,pview={visits:sessionCurrentVisits(s,id)},
  pending=s.turn.reduce((n,d)=>n+d.points,0),remaining=sessionRemaining(s,id)-pending,
  available=3-s.turn.length,summary=sessionStandings(s);
 renderMatchHeader(s);
 $('#playerCards').classList.toggle('solo',s.players.length===1);
 $('#playerCards').classList.toggle('is-many',s.players.length>4);
 $('#playerSwipeHint').hidden=s.players.length<=4;
 $('#playerCards').innerHTML=s.players.map((p,i)=>{
  const view={visits:sessionCurrentVisits(s,p.id)};
  const isCurrent=p.id===id;
  const score=sessionRemaining(s,p.id)-(isCurrent?pending:0),darts=gameDartCount(view),avg=darts?visitPoints(view)/darts*3:0;
  return `<div class="player-card ${isCurrent?'is-active':''}" ${isCurrent?'aria-current="true"':''}>
   <div class="player-top"><strong class="player-name">${escapeHTML(p.name)}</strong><span class="player-role">${isCurrent?'● AM ZUG':p.role==='owner'?'PROFIL':'GAST'}</span></div>
   <div class="player-score">${score}</div><div class="player-sub">Ø ${numberFormat(avg)} · ${darts} Darts</div>
   <div class="player-tally">${s.format==='sets'?`<strong>${summary.sets[p.id]} Sets</strong><span>${summary.inSet[p.id]} Legs im Set</span>`:
   `<strong>${summary.totals[p.id]} Legs</strong><span>${s.format==='legs'?`Ziel: ${s.legsToWin}`:'Gesamtstand'}</span>`}</div></div>`;
 }).join('');
 if(s.players.length>4){
  const board=$('#playerCards'),current=$('.player-card.is-active',board);
  if(current&&typeof board.scrollTo==='function')board.scrollTo({
    left:Math.max(0,current.offsetLeft-board.offsetLeft-board.clientWidth/2+current.clientWidth/2),behavior:'auto'});
 }
 $('#turnBanner').textContent=`🎯 ${sessionPlayerName(s,id)} ${id==='owner'?'bist':'ist'} am Zug`;
 $('#currentPlayerCaption').textContent=`${sessionPlayerName(s,id)} wirft gerade`;
 $('#scoreLabel').textContent=id==='owner'?'DEINE RESTPUNKTE':'RESTPUNKTE '+sessionPlayerName(s,id).toUpperCase();
 $('#remainingScore').textContent=remaining;
 $('#scoreProgress').style.width=`${Math.max(0,Math.min(100,(1-remaining/s.start)*100))}%`;
 const mode={double:'Double Out',straight:'Straight Out',master:'Master Out'}[s.mode];
 $('#matchMode').textContent=`${s.start} · ${mode}`;
 $('#scoreSubline').textContent=`${sessionPlayerName(s,id)} · Aufnahme ${pview.visits.length+1} · Dart ${s.turn.length+1}/3`;
 const thrown=gameDartCount(pview)+s.turn.length;
 $('#gameAvg').textContent=numberFormat(thrown?(visitPoints(pview)+pending)/thrown*3:0);
 $('#gameDarts').textContent=thrown;
 $('#gameBest').textContent=pview.visits.length?Math.max(...pview.visits.map(v=>v.score)):'–';
 $('#turnHeader').textContent=id==='owner'?'Deine Darts':`${sessionPlayerName(s,id)} wirft`;
 $('#turnTotal').textContent=`${pending} Punkte`;
 $('#turnIndex').textContent=`${s.turn.length+1} / 3`;
 $('#dartSlots').innerHTML=[0,1,2].map(i=>{
  const dart=s.turn[i],current=i===s.turn.length;
  return `<div class="dart-slot ${current?'current':''} ${dart?'':'empty'}"><small>DART ${i+1}</small><strong>${dart?escapeHTML(dart.segment):current?'↗':'–'}</strong></div>`;
 }).join('');
 const advice=adviceFor(remaining,available,s.mode);
 $('#adviceType').textContent=advice.kind==='checkout'?'CHECKOUT-MÖGLICHKEIT':'CHECKOUT-ASSISTENT';
 $('#adviceHeading').textContent=advice.headline;
 $('#adviceText').textContent=advice.text;
 $('#adviceDarts').textContent=`${available} ${available===1?'Dart':'Darts'} übrig`;
 $('#adviceSteps').innerHTML=advice.route.length?advice.route.map((seg,i)=>
  `<div class="advice-step"><small>DART ${i+1}</small><strong>${escapeHTML(seg)}</strong></div>`).join('<span class="advice-step arrow-step">→</span>'):
  '<span class="caption">Spiele einen sicheren Dart.</span>';
 $('#visitCounter').textContent=`${s.visits.length} Aufnahmen`;
 $('#visitList').innerHTML=s.visits.length?[...s.visits].reverse().slice(0,10).map(v=>
  `<div class="visit-item"><div><strong>Aufnahme ${v.number}</strong>
    <span class="visit-player ${v.playerId!=='owner'?'guest':''}">${escapeHTML(sessionPlayerName(s,v.playerId))}</span>
    <small>${v.darts.map(d=>escapeHTML(d.segment)).join(' · ')}</small></div>
    <div><strong class="${v.bust?'bust':''}">${v.bust?'BUST':v.score}</strong></div></div>`
 ).join(''):'<p class="empty">Die ersten Darts warten auf dich.</p>';
 $('#undoGame').disabled=!s.turn.length&&!s.visits.length;
}
function renderGameFinish(){
 const s=activeSession;if(!s)return;
 const leg=s.completedLegs.at(-1),standings=sessionStandings(s);
 const winner=leg?sessionPlayerName(s,leg.winnerId):null;
 const matchWinner=standings.targetWinner?sessionPlayerName(s,standings.targetWinner):null;
 const finished=s.phase==='finished';
 $('#finishSymbol').textContent=matchWinner?'🏆':finished?'✓':'🎯';
 $('#finishEyebrow').textContent=matchWinner?'MATCH GEWONNEN':finished?'MATCH BEENDET':'LEG GESPEICHERT';
 $('#finishWinnerTitle').textContent=matchWinner?`${matchWinner} gewinnt das Match!`:
  finished?'Match abgeschlossen':`${winner} ${leg.winnerId==='owner'?'gewinnst':'gewinnt'} Leg ${leg.number}!`;
 $('#finishWinnerSubtitle').textContent=matchWinner?'Herzlichen Glückwunsch! Alle Legs und Sets sind gespeichert.':
  finished?'Alle abgeschlossenen Legs sind im Verlauf gespeichert.':'Leg erfolgreich gespeichert. Ihr entscheidet, ob es weitergeht.';
 const owned=leg?ownGameFromSessionLeg(s,leg):null;
 $('#finishedAvg').textContent=owned?numberFormat(gameAverage(owned)):'–';
 $('#finishedDarts').textContent=owned?gameDartCount(owned):0;
 const last=leg?.visits.at(-1);
 const scoreBefore=last?s.start-leg.visits.filter(v=>v.playerId===last.playerId&&v!==last).reduce((n,v)=>n+v.score,0):0;
 $('#finishedCheckout').textContent=last?scoreBefore:'–';
 $('#standingsHeading').textContent=s.format==='sets'?`Set ${standings.lastSetWinnerId?Math.max(1,standings.setNumber-1):standings.setNumber}${standings.lastSetWinnerId?' abgeschlossen':''}`:'Matchübersicht';
 $('#standingFormat').textContent=s.format==='sets'?'SETS + LEGS':'LEGS';
 $('#standingsCards').innerHTML=standingsHTML(s);
 $('#standingsNote').textContent=s.format==='free'?'Freies Spiel ohne Matchlimit.':s.format==='legs'?
  `Das Match endet, sobald jemand ${s.legsToWin} ${s.legsToWin===1?'Leg':'Legs'} gewinnt.`:
  `Ein Set benötigt ${s.legsPerSet} Leg-Siege. Zum Matchgewinn sind ${s.setsToWin} Set-Siege nötig.`;
 $('#decisionPanel').hidden=finished;
 $('#matchDonePanel').hidden=!finished;
 $('#undoCheckout').hidden=!leg;
 $('#matchDoneTitle').textContent=matchWinner?`${matchWinner} ist Matchsieger!`:'Match vorzeitig beendet';
 $('#decisionTitle').textContent=standings.lastSetWinnerId?`Set für ${sessionPlayerName(s,standings.lastSetWinnerId)}! Noch eines?`:'Noch ein Leg?';
 $('#decisionText').textContent='Das letzte Leg ist bereits gespeichert. Ihr könnt sofort weiterspielen oder das Match an dieser Stelle beenden.';
}
buildKeypad('#gamePad',addGameDart);

// TRAINING: Jedes echte Trefferfeld wird erfasst – nicht nur, ob das Ziel getroffen wurde.
function populateTargets(){
 const select=$('#targetSelect');
 const groups=[
  ['Triple-Felder',NUMBERS.map(n=>`T${n}`)],
  ['Double-Felder',NUMBERS.map(n=>`D${n}`)],
  ['Single-Felder',NUMBERS.map(n=>`S${n}`)],
  ['Bull', ['SB','DB']]
 ];
 select.innerHTML=groups.map(([label,values])=>`<optgroup label="${label}">${
  values.map(x=>`<option value="${x}" ${x==='T20'?'selected':''}>${displayed(x)}</option>`).join('')
 }</optgroup>`).join('');
}
function showTrainingState(){
 $('#trainingSetup').hidden=!!activeTraining||!!completedTraining;
 $('#trainingActive').hidden=!activeTraining;
 $('#trainingFinished').hidden=!completedTraining||!!activeTraining;
 if(activeTraining)renderTraining();
 if(completedTraining)renderTrainingFinish();
 renderTrainingPreview();
}
function startTraining(){
 activeTraining={id:makeId(),target:$('#targetSelect').value,goal:integer($('#trainingGoal').value)||30,
  startedAt:new Date().toISOString(),completedAt:null,darts:[]};
 completedTraining=null;save();showTrainingState();
}
$('#startTraining').addEventListener('click',startTraining);
function addTrainingDart(segment){
 if(!activeTraining||!validSegment(segment))return;
 activeTraining.darts.push({segment,points:POINTS[segment],checkoutAttempt:false});
 if(activeTraining.darts.length>=activeTraining.goal){finishTraining(false);return}
 save();renderTraining();
}
function finishTraining(manual){
 if(!activeTraining)return;
 if(manual&&!confirm(`Training mit ${activeTraining.darts.length} von ${activeTraining.goal} Darts beenden und speichern?`))return;
 if(activeTraining.darts.length){
  activeTraining.completedAt=new Date().toISOString();
  completedTraining=normalizeTraining(activeTraining);db.trainings.push(completedTraining);
  toast('Training gespeichert.');
 }else{completedTraining=null;toast('Leeres Training verworfen.')}
 activeTraining=null;save();showTrainingState();
}
$('#endTraining').addEventListener('click',()=>finishTraining(true));
$('#undoTraining').addEventListener('click',()=>{
 if(!activeTraining||!activeTraining.darts.length)return;
 activeTraining.darts.pop();save();renderTraining();
});
$('#newTraining').addEventListener('click',()=>{completedTraining=null;showTrainingState()});
$('#trainingToProfile').addEventListener('click',()=>showPage('profileView'));
function renderTraining(){
 const t=activeTraining;if(!t)return;
 const hits=t.darts.filter(d=>d.segment===t.target).length;
 $('#targetLabel').textContent=t.target;
 $('#trainingProgressText').textContent=`${t.darts.length} / ${t.goal} Darts`;
 $('#trainingHits').textContent=hits;
 $('#trainingRate').textContent=`${t.darts.length?Math.round(hits/t.darts.length*100):0} %`;
 $('#trainingProgress').style.width=`${Math.min(100,t.darts.length/t.goal*100)}%`;
 $('#undoTraining').disabled=!t.darts.length;
}
function renderTrainingFinish(){
 const t=completedTraining;if(!t)return;
 const hits=t.darts.filter(d=>d.segment===t.target).length;
 const rate=t.darts.length?numberFormat(hits/t.darts.length*100):'0,0';
 $('#trainingResultTitle').textContent=`${hits}× ${t.target} getroffen`;
 $('#trainingResultDesc').textContent=`${rate} % Trefferquote bei ${t.darts.length} Darts auf ${displayed(t.target)}.`;
}
function renderTrainingPreview(){
 const sessions=[...db.trainings].sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).slice(0,5);
 $('#trainingHistoryPreview').innerHTML=sessions.length?sessions.map(t=>{
  const hits=t.darts.filter(d=>d.segment===t.target).length,rate=t.darts.length?Math.round(hits/t.darts.length*100):0;
  return `<div class="history-item"><div><strong>Training ${escapeHTML(t.target)}</strong><span style="display:block;margin-top:5px">${escapeHTML(dayLabel(localDay(t.completedAt)||'2000-01-01'))} · ${t.darts.length} Darts</span></div><div style="text-align:right"><strong>${rate} %</strong><span style="display:block">${hits} Treffer</span></div></div>`;
 }).join(''):'<p class="empty">Noch keine abgeschlossenen Trainingseinheiten.</p>';
}
buildKeypad('#trainingPad',addTrainingDart);
populateTargets();

// AUSWERTUNG
function statSet(){
 const games=profileGames();
 const visits=games.flatMap(g=>g.visits);
 const gameDarts=visits.flatMap(v=>v.darts);
 const trainDarts=db.trainings.flatMap(t=>t.darts);
 const totalThrown=gameDarts.length;
 const scored=visits.reduce((sum,v)=>sum+v.score,0);
 const eligibleFirst9=games.map(first9Stats).filter(x=>x.darts===9);
 const first9Count=eligibleFirst9.reduce((sum,x)=>sum+x.darts,0);
 const first9Points=eligibleFirst9.reduce((sum,x)=>sum+x.points,0);
 const attempts=gameDarts.filter(d=>d.checkoutAttempt).length;
 const wins=games.filter(g=>g.checkout).length;
 return {games,visits,gameDarts,trainDarts,totalThrown,scored,
  avg:totalThrown?scored/totalThrown*3:0,
  first9:first9Count?first9Points/first9Count*3:0,
  first9Count,attempts,wins};
}
function renderProfile(){
 const s=statSet();
 $('#statLegs').textContent=s.games.length;
 $('#statAverage').textContent=numberFormat(s.avg);
 $('#statFirst9').textContent=s.first9Count?numberFormat(s.first9):'–';
 $('#statCheckoutRate').textContent=s.attempts?`${numberFormat(s.wins/s.attempts*100)} %`:'–';
 $('#checkoutAttemptSummary').textContent=`${s.wins} von ${s.attempts} markierten Versuchen`;
 $('#stat180').textContent=s.visits.filter(v=>v.score===180).length;
 $('#stat140').textContent=s.visits.filter(v=>v.score>=140).length;
 $('#stat100').textContent=s.visits.filter(v=>v.score>=100).length;
 $('#statBestVisit').textContent=s.visits.length?Math.max(...s.visits.map(v=>v.score)):'–';
 $('#profileIntro').textContent=`${s.totalThrown+s.trainDarts.length} eigene Darts · ${s.games.length} Legs · Gastwürfe ausgeschlossen`;
 renderAverageChart();
 renderHits();
 renderHeatmap();
 renderDaily();
 renderCheckouts();
 renderHistory();
 renderMatchHistory();
}
function renderAverageChart(){
 const holder=$('#averageChart');
 const period=$('#avgPeriod').value;
 const minTime=period==='all'?0:Date.now()-Number(period)*24*60*60*1000;
 const games=profileGames().filter(g=>new Date(g.completedAt).getTime()>=minTime)
  .sort((a,b)=>new Date(a.completedAt)-new Date(b.completedAt));
 if(!games.length){holder.innerHTML='<p class="empty">Für diesen Zeitraum gibt es noch keine abgeschlossenen Legs.</p>';return}
 const vals=games.map(gameAverage);
 const lo=Math.max(0,Math.floor(Math.min(...vals)-6)),hi=Math.ceil(Math.max(...vals)+6);
 const width=600,height=170,pad=25;
 const x=i=>games.length===1?width/2:pad+i*(width-pad*2)/(games.length-1);
 const y=v=>height-pad-(v-lo)/(hi-lo||1)*(height-pad*2);
 const path=vals.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');
 const circles=vals.map((v,i)=>`<circle cx="${x(i).toFixed(2)}" cy="${y(v).toFixed(2)}" r="4" fill="#d6fa45"><title>Leg ${i+1}: ${numberFormat(v)} Average</title></circle>`).join('');
 const grid=[0,1,2,3].map(i=>`<line x1="20" y1="${(20+i*41).toFixed(2)}" x2="580" y2="${(20+i*41).toFixed(2)}" stroke="#344459" stroke-width="1"/>`).join('');
 const first=games.length?escapeHTML(dayLabel(localDay(games[0].completedAt)||'2000-01-01')):'';
 const last=games.length?escapeHTML(dayLabel(localDay(games.at(-1).completedAt)||'2000-01-01')):'';
 holder.innerHTML=`<svg class="average-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Verlauf der X01 Average-Werte">
 ${grid}<path d="${path}" fill="none" stroke="#d6fa45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}
 <text x="19" y="13" font-size="11" fill="#a3b4c6">${hi}</text>
 <text x="19" y="162" font-size="11" fill="#a3b4c6">${lo}</text>
 </svg><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted)"><span>${first}</span><span>${games.length} Legs · letzter Avg ${numberFormat(vals.at(-1))}</span><span>${last}</span></div>`;
}
$('#avgPeriod').addEventListener('change',renderAverageChart);
function fieldName(segment){
 if(segment==='MISS')return 'Daneben';
 if(segment==='SB')return 'Single Bull';
 if(segment==='DB')return 'Bullseye';
 const prefix={S:'Single',D:'Double',T:'Triple'}[segment[0]]||'';
 return `${prefix} ${segment.slice(1)}`;
}
function sortedSegments(a,b,sort){
 if(sort==='count')return b[1]-a[1]||a[0].localeCompare(b[0]);
 const num=s=>s==='MISS'?99:s==='SB'||s==='DB'?25:Number(s.slice(1));
 return num(a[0])-num(b[0])||({S:0,D:1,T:2,SB:3,DB:4,MISS:5}[a[0][0]]||0)-({S:0,D:1,T:2,SB:3,DB:4,MISS:5}[b[0][0]]||0);
}
function renderHits(){
 const source=$('#hitSource').value;
 let shots=[];
 if(source!=='training')shots.push(...profileGames().flatMap(g=>g.visits.flatMap(v=>v.darts)));
 if(source!=='game')shots.push(...db.trainings.flatMap(t=>t.darts));
 const counts=new Map();
 for(const d of shots)counts.set(d.segment,(counts.get(d.segment)||0)+1);
 const rows=[...counts.entries()].sort((a,b)=>sortedSegments(a,b,hitSort));
 const max=Math.max(1,...rows.map(r=>r[1]));
 $('#hitTotal').textContent=`${shots.length} Darts · ${rows.length} verschiedene getroffene Felder`;
 $('#hitStats').innerHTML=rows.length?rows.map(([segment,count])=>
 `<div class="hit-stat">
   <div class="hit-field"><strong class="hit-label">${escapeHTML(segment)}</strong><small>${escapeHTML(fieldName(segment))}</small></div>
   <div class="hit-bar"><i style="width:${(count/max*100).toFixed(1)}%"></i></div>
   <strong class="hit-count">${count}×</strong>
 </div>`
 ).join(''):'<p class="empty">Noch keine Darts erfasst. Spiele ein Leg oder absolviere ein Training.</p>';
}
// Heatmap aus echten Segmentzählungen: kein Schätzen von Einschlagkoordinaten.
const BOARD_ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
function heatmapDarts(){
 const source=$('#heatmapSource').value;let darts=[];
 if(source!=='training')darts.push(...profileGames().flatMap(g=>g.visits.flatMap(v=>v.darts)));
 if(source!=='game')darts.push(...db.trainings.flatMap(t=>t.darts));
 return darts;
}
function polar(r,deg){const rad=deg*Math.PI/180;return [200+r*Math.cos(rad),200+r*Math.sin(rad)]}
function sectorPath(inner,outer,a,b){
 const [x1,y1]=polar(outer,a),[x2,y2]=polar(outer,b),[x3,y3]=polar(inner,b),[x4,y4]=polar(inner,a);
 return `M${x1.toFixed(3)} ${y1.toFixed(3)} A${outer} ${outer} 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)} L${x3.toFixed(3)} ${y3.toFixed(3)} A${inner} ${inner} 0 0 0 ${x4.toFixed(3)} ${y4.toFixed(3)} Z`;
}
function heatColor(count,max){
 if(!count)return '#202f3e';const t=Math.sqrt(count/Math.max(1,max));
 const colors=[[35,65,76],[55,119,120],[112,184,123],[214,250,69]];
 const z=t*(colors.length-1),i=Math.min(colors.length-2,Math.floor(z)),f=z-i;
 const c=colors[i].map((v,j)=>Math.round(v+(colors[i+1][j]-v)*f));return `rgb(${c.join(',')})`;
}
function renderHeatmap(){
 const darts=heatmapDarts(),counts=new Map();for(const d of darts)counts.set(d.segment,(counts.get(d.segment)||0)+1);
 const max=Math.max(1,...counts.values()),absolute=$('#heatmapMode').value==='absolute';
 let paths='<circle cx="200" cy="200" r="193" fill="#101a29" stroke="#607186" stroke-width="3"/>';
 const sections=[['S',32,94],['T',94,110],['S',110,164],['D',164,185]];
 for(let i=0;i<20;i++){
  const n=BOARD_ORDER[i],a=-99+i*18,b=a+18;
  for(const [prefix,inner,outer] of sections){
   const seg=prefix+n,count=counts.get(seg)||0,color=heatColor(count,max);
   paths+=`<path class="heat-segment" tabindex="0" role="button" aria-label="${seg}: ${count} Treffer" data-seg="${seg}" d="${sectorPath(inner,outer,a,b)}" fill="${color}"><title>${seg}: ${count} Treffer</title></path>`;
  }
  const [x,y]=polar(198,-90+i*18);
  paths+=`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="800" fill="#dce8f3" pointer-events="none">${n}</text>`;
 }
 for(const [seg,r] of [['SB',32],['DB',14]]){
  const count=counts.get(seg)||0;
  paths+=`<circle class="heat-segment" role="button" tabindex="0" aria-label="${seg}: ${count} Treffer" data-seg="${seg}" cx="200" cy="200" r="${r}" fill="${heatColor(count,max)}"><title>${seg}: ${count} Treffer</title></circle>`;
 }
 const board=$('#heatmapBoard');board.innerHTML=`<svg viewBox="-12 -12 424 424" role="img" aria-label="Dartboard Heatmap aus ${darts.length} eigenen Darts">${paths}</svg>`;
 const details=$('#heatmapDetails');
 details.textContent=darts.length?`${darts.length} eigene Darts erfasst · ${counts.get('MISS')||0} daneben · Tippe auf ein Feld für Details.`:'Noch keine eigenen Darts erfasst. Spiele ein Leg oder starte ein Training.';
 const select=e=>{const el=e.target.closest('[data-seg]');if(!el)return;const seg=el.dataset.seg,c=counts.get(seg)||0;
 details.textContent=`${fieldName(seg)} (${seg}): ${c} Treffer · ${darts.length?numberFormat(c/darts.length*100):'0,0'} % aller eigenen Darts${absolute?' · '+c+' insgesamt':''}`;
 };
 board.onclick=select;board.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e)}};
}
$('#heatmapSource').addEventListener('change',renderHeatmap);
$('#heatmapMode').addEventListener('change',renderHeatmap);
$('#hitSource').addEventListener('change',renderHits);
$('#sortHitsCount').addEventListener('click',()=>setHitSort('count'));
$('#sortHitsNumber').addEventListener('click',()=>setHitSort('number'));
function setHitSort(kind){
 hitSort=kind;
 $('#sortHitsCount').classList.toggle('selected',kind==='count');
 $('#sortHitsNumber').classList.toggle('selected',kind==='number');
 renderHits();
}
function renderDaily(){
 const days=new Map();
 function ensure(day){
  if(!day)return null;
  if(!days.has(day))days.set(day,{games:0,trainings:0,points:0,darts:0,trainingDarts:0,checkout:0,high:0});
  return days.get(day);
 }
 for(const g of profileGames()){
  const row=ensure(localDay(g.completedAt));if(!row)continue;
  row.games++;row.points+=visitPoints(g);row.darts+=gameDartCount(g);
  row.checkout+=Number(g.checkout);
  row.high+=g.visits.filter(v=>v.score>=100).length;
 }
 for(const t of db.trainings){
  const row=ensure(localDay(t.completedAt));if(row){row.trainings++;row.trainingDarts+=t.darts.length}
 }
 const sorted=[...days.entries()].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,20);
 $('#dailyStats').innerHTML=sorted.length?sorted.map(([day,d])=>
  `<div class="daily-item">
    <div><strong class="daily-date">${escapeHTML(dayLabel(day))}</strong>
     <span class="daily-meta">${d.games} ${d.games===1?'Leg':'Legs'} · ${d.trainings} ${d.trainings===1?'Training':'Trainings'}</span>
     <span class="daily-meta">${d.darts} Match-Darts · ${d.trainingDarts} Trainings-Darts · ${d.high}× 100+</span></div>
    <div class="daily-values"><strong>${d.darts?numberFormat(d.points/d.darts*3):'–'}</strong><small>3-DART-AVG</small></div>
  </div>`).join(''):'<p class="empty">Deine Tagesstatistik entsteht mit den ersten Spielen.</p>';
}
function renderCheckouts(){
 const list=profileGames().filter(g=>g.checkout).map(g=>{
  const v=g.visits.at(-1);
  return {date:g.completedAt,checkout:v?v.remainingBefore:0,
   darts:v?v.darts.length:0,finish:v?.darts.at(-1)?.segment||'–'};
 }).sort((a,b)=>new Date(b.date)-new Date(a.date));
 const finishes={};for(const item of list)finishes[item.finish]=(finishes[item.finish]||0)+1;
 const top=Object.entries(finishes).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const attempts=statSet().attempts;
 const summary=attempts?`<p class="caption">${list.length} erfolgreiche Checkouts aus ${attempts} markierten Checkout-Darts. Die Quote berücksichtigt nur markierte Versuche (auch Fehlwürfe).</p>`:
 '<p class="caption">Für eine verlässliche Quote markiere auch Checkout-Fehlversuche bei der Eingabe.</p>';
 $('#checkoutStats').innerHTML=summary+(list.length?
  `<p class="caption"><strong>Häufigste Finish-Felder:</strong> ${top.map(([name,count])=>`${escapeHTML(name)} ${count}×`).join(' · ')}</p>`+
  list.slice(0,12).map(item=>`<div class="checkout-item"><div><strong>${item.checkout} Punkte</strong><small style="display:block;margin-top:3px">${escapeHTML(dayLabel(localDay(item.date)||'2000-01-01'))} · ${item.darts} Dart(s) in der Aufnahme</small></div><div><strong>${escapeHTML(item.finish)}</strong><small style="display:block">letzter Dart</small></div></div>`).join('')
  :'<p class="empty">Noch kein Checkout gespeichert.</p>');
}
function renderHistory(){
 const entries=[
 ...profileGames().map(g=>({date:g.completedAt,type:'Leg',title:`${g.start} · ${g.mode==='double'?'Double Out':g.mode==='master'?'Master Out':'Straight Out'}${g.opponent?' · gegen '+g.opponent:''}`,
 info:`${gameDartCount(g)} eigene Darts · Best ${Math.max(0,...g.visits.map(v=>v.score))}${g.opponent?(g.checkout?' · Sieg':' · Niederlage'):''}`,
 result:numberFormat(gameAverage(g)),sub:'3-DART-AVG'})),
 ...db.trainings.map(t=>{const hits=t.darts.filter(d=>d.segment===t.target).length;return {
  date:t.completedAt,type:'Training',title:`Training ${t.target}`,
  info:`${hits}/${t.darts.length} Treffer`,result:`${t.darts.length?Math.round(hits/t.darts.length*100):0} %`,sub:'TREFFERQUOTE'
 }})
 ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20);
 $('#recentHistory').innerHTML=entries.length?entries.map(e=>
 `<div class="history-item" style="margin-bottom:8px"><div><small>${escapeHTML(e.type)} · ${escapeHTML(dayLabel(localDay(e.date)||'2000-01-01'))}</small><div><strong>${escapeHTML(e.title)}</strong></div><span>${escapeHTML(e.info)}</span></div><div style="text-align:right;white-space:nowrap"><strong>${escapeHTML(e.result)}</strong><small style="display:block">${e.sub}</small></div></div>`
 ).join(''):'<p class="empty">Deine letzten Legs und Trainings werden hier angezeigt.</p>';
}

function renderMatchHistory(){
 const sessions=[...db.sessions].filter(s=>s.completedLegs.length).sort((a,b)=>
  new Date(b.finishedAt||b.completedLegs.at(-1)?.completedAt||b.startedAt)-
  new Date(a.finishedAt||a.completedLegs.at(-1)?.completedAt||a.startedAt)).slice(0,20);
 $('#matchHistory').innerHTML=sessions.length?sessions.map(s=>{
  const result=sessionStandings(s),champion=result.targetWinner?sessionPlayerName(s,result.targetWinner):null;
  const ended=s.phase==='finished';
  const label=s.format==='sets'?`${s.setsToWin} Sets · ${s.legsPerSet} Legs/Set`:
   s.format==='legs'?`Erster mit ${s.legsToWin} Legs`:'Freies Spiel';
  const names=s.players.map(p=>escapeHTML(p.name)).join(' · ');
  const summary=s.players.map(p=>`${escapeHTML(p.name)}: ${s.format==='sets'?result.sets[p.id]+' Sets':result.totals[p.id]+' Legs'}`).join(' | ');
  return `<div class="match-history-item">
   <div class="match-history-head"><strong>${escapeHTML(label)}</strong><span class="match-history-status ${ended?'finished':''}">${ended?'Beendet':'Läuft'}</span></div>
   <p>${names}</p><small>${s.completedLegs.length} Legs gespielt · ${escapeHTML(dayLabel(localDay(s.startedAt)||'2000-01-01'))}</small>
   <div class="match-history-footer"><span>${summary}</span>${champion?`<strong>🏆 ${escapeHTML(champion)}</strong>`:''}</div>
   <button type="button" class="tiny-button share-history" data-share-session="${escapeHTML(s.id)}">↗ Teilen</button>
  </div>`;
 }).join(''):'<p class="empty">Nach deinem ersten abgeschlossenen Leg erscheint hier die Matchhistorie.</p>';
}

// Matchkarte als PNG erzeugen; native iOS-Teilen-Funktion, Fallback Textkopie.
function matchShareText(s){
 const st=sessionStandings(s),label=s.format==='sets'?`${s.setsToWin} Sets / ${s.legsPerSet} Legs je Set`:s.format==='legs'?`Erster mit ${s.legsToWin} Legs`:'Freies Spiel';
 const lines=s.players.map(p=>`${p.name}: ${st.totals[p.id]} Legs${s.format==='sets'?`, ${st.sets[p.id]} Sets`:''}`);
 return `🎯 OCHE 6.0 – Dart-Match\n${s.start} · ${s.mode==='double'?'Double Out':s.mode==='master'?'Master Out':'Straight Out'} · ${label}\n${lines.join('\n')}\n${s.completedLegs.length} Legs gespielt${st.targetWinner?'\n🏆 Sieger: '+sessionPlayerName(s,st.targetWinner):''}\nErstellt mit OCHE von Lenas Sum`;
}
function createMatchImage(s){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=630;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas nicht verfügbar');
 ctx.fillStyle='#0b1220';ctx.fillRect(0,0,1080,630);
 ctx.fillStyle='#d6fa45';ctx.font='bold 75px system-ui';ctx.fillText('OCHE.',65,115);
 ctx.fillStyle='#a8bacd';ctx.font='26px system-ui';ctx.fillText('DART MATCH  ·  VERSION 5.0',68,158);
 ctx.fillStyle='#f4f7fb';ctx.font='bold 38px system-ui';ctx.fillText(`${s.start} · ${s.completedLegs.length} Legs gespielt`,65,238);
 const st=sessionStandings(s);
 const sorted=[...s.players].sort((a,b)=>st.totals[b.id]-st.totals[a.id]);
 sorted.slice(0,5).forEach((p,i)=>{
  const y=302+i*52;ctx.fillStyle=i===0?'#d6fa45':'#e4ecf5';ctx.font='bold 29px system-ui';
  const name=p.name.length>23?p.name.slice(0,22)+'…':p.name;
  ctx.fillText(name,70,y);ctx.textAlign='right';ctx.fillText(`${st.totals[p.id]} Legs${s.format==='sets'?' · '+st.sets[p.id]+' Sets':''}`,1005,y);ctx.textAlign='left';
 });
 if(sorted.length>5){ctx.fillStyle='#a8bacd';ctx.font='23px system-ui';ctx.fillText(`+ ${sorted.length-5} weitere Spieler`,70,580)}
 ctx.fillStyle='#a8bacd';ctx.font='22px system-ui';ctx.fillText('Entwickelt von Lenas Sum',68,610);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Bild konnte nicht erstellt werden')),'image/png'));
}
async function shareMatch(s){
 if(!s||!s.completedLegs.length){toast('Erst nach einem abgeschlossenen Leg kannst du teilen.');return}
 const text=matchShareText(s);
 try{
  if(navigator.share){
   try{const blob=await createMatchImage(s);const file=new File([blob],'oche-match.png',{type:'image/png'});
    if(navigator.canShare?.({files:[file]})){await navigator.share({title:'OCHE Match',text,files:[file]});return}
   }catch(e){if(e?.name==='AbortError')return}
   await navigator.share({title:'OCHE Match',text});return;
  }
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);toast('Match-Ergebnis kopiert. Jetzt in WhatsApp einfügen.');return}
  window.prompt('Match-Ergebnis zum Kopieren:',text);
 }catch(e){if(e?.name!=='AbortError')toast('Teilen nicht möglich. Bitte erneut versuchen.')}
}
$('#shareCurrentMatch').addEventListener('click',()=>shareMatch(activeSession));
$('#matchHistory').addEventListener('click',e=>{const btn=e.target.closest('[data-share-session]');if(btn){const s=db.sessions.find(x=>String(x.id)===btn.dataset.shareSession);if(s)shareMatch(s)}});
// BACKUP – Keine Cloud, keine fremden Server, kein Benutzerkonto nötig.
function exportBackup(){
 const content=JSON.stringify({...db,activeSessionId:activeSession?.phase==='finished'?null:activeSession?.id||null,activeTraining},null,2);
 const blob=new Blob([content],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=`oche-backup-${localDay(new Date().toISOString())}.json`;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
 toast('Backup zum Speichern bereit.');
}
$('#exportData').addEventListener('click',exportBackup);
$('#exportData2').addEventListener('click',exportBackup);
$('#importData').addEventListener('click',()=>$('#importFile').click());
$('#importFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>8*1024*1024)throw new Error('Backup ist zu groß (max. 8 MB).');
  const raw=JSON.parse(await file.text());
  if(!raw||!(Array.isArray(raw.games)||Array.isArray(raw.matches)||Array.isArray(raw.sessions)))
   throw new Error('Unbekanntes Backup-Format.');
  if(!confirm('Dieses Backup ersetzt alle aktuellen Spiele, Trainings und laufenden Sessions. Fortfahren?'))return;
  db=normalizeData(raw);activeSession=db.sessions.find(s=>s.id===db.activeSessionId)||null;activeTraining=db.activeTraining;
  completedTraining=null;save();
  showGameState();showTrainingState();renderProfile();toast('Backup erfolgreich importiert.');
 }catch(err){toast(err.message||'Backup konnte nicht gelesen werden.')}
 finally{e.target.value=''}
});
$('#deleteAll').addEventListener('click',()=>{
 if(!confirm('Wirklich ALLE Legs, Trainings und Statistiken löschen? Die Daten sind ohne Backup unwiederbringlich verloren.'))return;
 db={version:4,games:[],matches:[],sessions:[],trainings:[],activeSessionId:null,activeTraining:null};
 activeSession=null;activeTraining=null;completedTraining=null;
 initAudioControls();save();showGameState();showTrainingState();renderProfile();toast('Alle Daten gelöscht.');
});
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('Offline-Cache konnte nicht gestartet werden',e)));
}
window.addEventListener('resize',()=>{if(activePage==='profileView')renderAverageChart()});
initAudioControls();save();showGameState();showTrainingState();renderProfile();
