
'use strict';
const $=(sel,scope=document)=>scope.querySelector(sel);
const $$=(sel,scope=document)=>Array.from(scope.querySelectorAll(sel));
const STORAGE_KEY='oche-dart-data-v3', PREVIOUS_KEY='oche-dart-data-v2', LEGACY_KEY='oche-dart-data-v1';
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
function profileGames(){
 return [...db.games,...db.matches.filter(m=>!!m.winner).map(ownGameFromMatch)];
}
function matchVisits(match,player){return match.visits.filter(v=>v.player===player)}
function matchRemaining(match,player){return match.start-matchVisits(match,player).reduce((sum,v)=>sum+v.score,0)}
function playerLabel(match,player){return player==='owner'?'Du':match.guestName}
function nextPlayer(match,player){return match.hasGuest?(player==='owner'?'guest':'owner'):'owner'}
function matchPlayerView(match,player){return {visits:matchVisits(match,player)}}

function normalizeData(raw){
 const base={version:3,games:[],matches:[],trainings:[],activeGame:null,activeTraining:null};
 if(!raw||typeof raw!=='object')return base;
 if(Array.isArray(raw.games))base.games=raw.games.slice(0,10000).map(normalizeGame).filter(g=>g&&g.finished);
 if(Array.isArray(raw.matches))base.matches=raw.matches.slice(0,10000).map(normalizeMatch).filter(m=>m&&m.winner);
 if(Array.isArray(raw.trainings))base.trainings=raw.trainings.slice(0,10000).map(normalizeTraining).filter(Boolean);
 if(raw.activeGame&&Array.isArray(raw.activeGame.turn)){
  base.activeGame=Array.isArray(raw.activeGame.visits)&&
   (raw.activeGame.hasGuest!==undefined||raw.version>=3)
   ?normalizeMatch({...raw.activeGame,winner:null})
   :oldActiveToMatch(raw.activeGame);
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
  const old=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(PREVIOUS_KEY)||localStorage.getItem(LEGACY_KEY);
  if(old)raw=JSON.parse(old);
 }catch(e){console.warn('Speicher kann nicht gelesen werden',e)}
 return normalizeData(raw);
}
let db=readData();
let activeGame=db.activeGame;
let activeTraining=db.activeTraining;
let completedGame=null,completedTraining=null,activePage='gameView',hitSort='count';
let gameMarkAttempt=false,toastTimer=null;
function save(){
 db.version=3;
 db.activeGame=activeGame;
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
function showGameState(){
 $('#gameSetup').hidden=!!activeGame||!!completedGame;
 $('#gameActive').hidden=!activeGame;
 $('#gameFinished').hidden=!completedGame||!!activeGame;
 if(activeGame)renderGame();
 if(completedGame)renderGameFinish();
}
function toggleGuestOptions(){
 const enabled=$('#gameType').value==='guest';
 $('#guestOptions').hidden=!enabled;
}
$('#gameType').addEventListener('change',toggleGuestOptions);
toggleGuestOptions();
function startGame(){
 if(activeGame&&!confirm('Das aktuelle Leg verwerfen und neu starten?'))return;
 const hasGuest=$('#gameType').value==='guest';
 activeGame={id:makeId(),start:integer($('#startScore').value)||501,
  mode:$('#outMode').value,startedAt:new Date().toISOString(),completedAt:null,
  hasGuest,guestName:String($('#guestName').value||'Gast').trim().slice(0,28)||'Gast',
  activePlayer:hasGuest&&$('#firstPlayer').value==='guest'?'guest':'owner',
  visits:[],turn:[],winner:null};
 completedGame=null;gameMarkAttempt=false;updateAttemptToggle();save();showGameState();
}
$('#startGame').addEventListener('click',startGame);
$('#newLeg').addEventListener('click',()=>{completedGame=null;showGameState();window.scrollTo(0,0)});
$('#goProfile').addEventListener('click',()=>showPage('profileView'));
function updateAttemptToggle(){
 $('#attemptToggle').setAttribute('aria-pressed',String(gameMarkAttempt));
 $('#attemptCheck').textContent=gameMarkAttempt?'◉':'○';
}
$('#attemptToggle').addEventListener('click',()=>{gameMarkAttempt=!gameMarkAttempt;updateAttemptToggle()});
function addGameDart(segment){
 if(!activeGame||!validSegment(segment))return;
 const g=activeGame,player=g.activePlayer;
 const dart={segment,points:POINTS[segment],checkoutAttempt:gameMarkAttempt};
 gameMarkAttempt=false;updateAttemptToggle();
 const current=matchRemaining(g,player)-g.turn.reduce((s,d)=>s+d.points,0);
 const next=current-dart.points;
 if(next===0&&allowedFinisher(segment,g.mode))dart.checkoutAttempt=true;
 g.turn.push(dart);
 const bust=next<0||(next===0&&!allowedFinisher(segment,g.mode))||
  (next===1&&g.mode!=='straight');
 if(bust){finalizeVisit(true,false);toast(`${playerLabel(g,player)}: Bust – 0 Punkte.`);return}
 if(next===0){finalizeVisit(false,true);return}
 if(g.turn.length>=3){finalizeVisit(false,false);return}
 save();renderGame();
}
function finalizeVisit(bust,checkout){
 const g=activeGame;if(!g||!g.turn.length)return;
 const player=g.activePlayer,darts=g.turn.map(d=>({...d})),
  score=bust?0:darts.reduce((sum,d)=>sum+d.points,0);
 g.visits.push({player,number:matchVisits(g,player).length+1,darts,score,bust,checkout,
  remainingBefore:matchRemaining(g,player)});
 g.turn=[];
 if(checkout){
  g.winner=player;g.completedAt=new Date().toISOString();
  const complete=normalizeMatch(g);
  db.matches.push(complete);completedGame=complete;activeGame=null;
  toast(`${playerLabel(g,player)} gewinnt das Leg!`);
 }else{
  g.activePlayer=nextPlayer(g,player);
  gameMarkAttempt=false;updateAttemptToggle();
 }
 save();showGameState();
}
function undoGameDart(){
 if(!activeGame)return;
 if(activeGame.turn.length)activeGame.turn.pop();
 else if(activeGame.visits.length){
  const last=activeGame.visits.pop();
  activeGame.activePlayer=last.player;
  activeGame.turn=last.darts.slice(0,-1);
 }else{toast('Noch kein Dart zum Rückgängigmachen.');return}
 gameMarkAttempt=false;updateAttemptToggle();save();renderGame();
}
$('#undoGame').addEventListener('click',undoGameDart);
$('#undoCheckout').addEventListener('click',()=>{
 if(!completedGame)return;
 const m=normalizeMatch(completedGame),last=m.visits.pop();
 if(!last)return;
 m.turn=last.darts.slice(0,-1);m.activePlayer=last.player;
 m.winner=null;m.completedAt=null;
 db.matches=db.matches.filter(v=>v.id!==m.id);
 completedGame=null;activeGame=m;gameMarkAttempt=false;updateAttemptToggle();
 save();showGameState();toast('Checkout rückgängig gemacht.');
});
$('#abandonGame').addEventListener('click',()=>{
 if(!activeGame||!confirm('Dieses Leg wirklich verwerfen? Die Aufnahmen dieses Legs werden nicht in die Statistik übernommen.'))return;
 activeGame=null;gameMarkAttempt=false;save();showGameState();toast('Leg verworfen.');
});
function renderGame(){
 const m=activeGame;if(!m)return;
 const player=m.activePlayer,own=player==='owner',pview=matchPlayerView(m,player),
  pending=m.turn.reduce((s,d)=>s+d.points,0),remaining=matchRemaining(m,player)-pending,
  available=3-m.turn.length;
 $('#playerCards').classList.toggle('solo',!m.hasGuest);
 const cards=m.hasGuest?['owner','guest']:['owner'];
 $('#playerCards').innerHTML=cards.map(role=>{
  const score=matchRemaining(m,role)-(role===player?pending:0),view=matchPlayerView(m,role),
   darts=gameDartCount(view),avg=darts?visitPoints(view)/darts*3:0;
  return `<div class="player-card ${role===player?'is-active':''}" ${role===player?'aria-current="true"':''}>
    <div class="player-top"><strong class="player-name">${escapeHTML(playerLabel(m,role))}</strong>
    <span class="player-role">${role===player?'● AM ZUG':role==='guest'?'GAST':'DEIN PROFIL'}</span></div>
    <div class="player-score">${score}</div><div class="player-sub">Ø ${numberFormat(avg)} · ${darts} Darts</div></div>`;
 }).join('');
 $('#turnBanner').textContent=`🎯 ${playerLabel(m,player)} ${own?'bist':'ist'} am Zug`;
 $('#scoreLabel').textContent=own?'DEINE RESTPUNKTE':'RESTPUNKTE GAST';
 $('#remainingScore').textContent=remaining;
 $('#scoreProgress').style.width=`${Math.max(0,Math.min(100,(1-remaining/m.start)*100))}%`;
 const mode={double:'Double Out',straight:'Straight Out',master:'Master Out'}[m.mode];
 $('#matchMode').textContent=`${m.start} · ${mode}`;
 $('#scoreSubline').textContent=`${playerLabel(m,player)} · Aufnahme ${pview.visits.length+1} · Dart ${m.turn.length+1}/3`;
 const thrown=gameDartCount(pview)+m.turn.length;
 $('#gameAvg').textContent=numberFormat(thrown?(visitPoints(pview)+pending)/thrown*3:0);
 $('#gameDarts').textContent=thrown;
 $('#gameBest').textContent=pview.visits.length?Math.max(...pview.visits.map(v=>v.score)):'–';
 $('#turnHeader').textContent=own?'Deine Darts':`${playerLabel(m,player)} wirft`;
 $('#turnTotal').textContent=`${pending} Punkte`;
 $('#turnIndex').textContent=`${m.turn.length+1} / 3`;
 $('#dartSlots').innerHTML=NUMBERS.slice(0,3).map((_,i)=>{
  const dart=m.turn[i],current=i===m.turn.length;
  return `<div class="dart-slot ${current?'current':''} ${dart?'':'empty'}">
   <small>DART ${i+1}</small><strong>${dart?escapeHTML(dart.segment):current?'↗':'–'}</strong></div>`;
 }).join('');
 const a=adviceFor(remaining,available,m.mode);
 $('#adviceType').textContent=a.kind==='checkout'?'CHECKOUT-MÖGLICHKEIT':'CHECKOUT-ASSISTENT';
 $('#adviceHeading').textContent=a.headline;$('#adviceText').textContent=a.text;
 $('#adviceDarts').textContent=`${available} ${available===1?'Dart':'Darts'} übrig`;
 $('#adviceSteps').innerHTML=a.route.length?a.route.map((seg,i)=>
  `<div class="advice-step"><small>DART ${i+1}</small><strong>${escapeHTML(seg)}</strong></div>`).join('<span class="advice-step arrow-step">→</span>'):'<span class="caption">Spiele einen sicheren Dart.</span>';
 $('#visitCounter').textContent=`${m.visits.length} Aufnahmen`;
 $('#visitList').innerHTML=m.visits.length?[...m.visits].reverse().slice(0,10).map(v=>
  `<div class="visit-item"><div><strong>Aufnahme ${v.number}</strong>
    <span class="visit-player ${v.player==='guest'?'guest':''}">${escapeHTML(playerLabel(m,v.player))}</span>
    <small>${v.darts.map(d=>escapeHTML(d.segment)).join(' · ')}</small></div>
    <div><strong class="${v.bust?'bust':''}">${v.bust?'BUST':v.score}</strong></div></div>`
 ).join(''):'<p class="empty">Die ersten Darts warten auf dich.</p>';
 $('#undoGame').disabled=!m.turn.length&&!m.visits.length;
}
function renderGameFinish(){
 const m=completedGame;if(!m)return;
 const own=ownGameFromMatch(m),last=m.visits.at(-1),winner=playerLabel(m,m.winner);
 $('#finishWinnerTitle').textContent=`${winner} ${m.winner==='owner'?'gewinnst':'gewinnt'} das Leg!`;
 $('#finishWinnerSubtitle').textContent=m.hasGuest?
  'Nur deine eigenen Darts wurden für dein Profil gespeichert. Die Gastwürfe bleiben getrennt.':
  'Deine Darts wurden im Profil gespeichert.';
 $('#finishedAvg').textContent=numberFormat(gameAverage(own));
 $('#finishedDarts').textContent=gameDartCount(own);
 $('#finishedCheckout').textContent=last?last.remainingBefore:'–';
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
 renderDaily();
 renderCheckouts();
 renderHistory();
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

// BACKUP – Keine Cloud, keine fremden Server, kein Benutzerkonto nötig.
function exportBackup(){
 const content=JSON.stringify({...db,activeGame,activeTraining},null,2);
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
  if(!raw||!(Array.isArray(raw.games)||Array.isArray(raw.matches)))
   throw new Error('Unbekanntes Backup-Format.');
  if(!confirm('Dieses Backup ersetzt alle aktuellen Spiele, Trainings und laufenden Sessions. Fortfahren?'))return;
  db=normalizeData(raw);activeGame=db.activeGame;activeTraining=db.activeTraining;
  completedGame=null;completedTraining=null;save();
  showGameState();showTrainingState();renderProfile();toast('Backup erfolgreich importiert.');
 }catch(err){toast(err.message||'Backup konnte nicht gelesen werden.')}
 finally{e.target.value=''}
});
$('#deleteAll').addEventListener('click',()=>{
 if(!confirm('Wirklich ALLE Legs, Trainings und Statistiken löschen? Die Daten sind ohne Backup unwiederbringlich verloren.'))return;
 db={version:3,games:[],matches:[],trainings:[],activeGame:null,activeTraining:null};
 activeGame=null;activeTraining=null;completedGame=null;completedTraining=null;
 save();showGameState();showTrainingState();renderProfile();toast('Alle Daten gelöscht.');
});
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('Offline-Cache konnte nicht gestartet werden',e)));
}
window.addEventListener('resize',()=>{if(activePage==='profileView')renderAverageChart()});
save();showGameState();showTrainingState();renderProfile();
