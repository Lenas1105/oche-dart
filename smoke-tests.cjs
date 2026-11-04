const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const SOURCE=fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
function createRuntime(store={}){
 const els=new Map();
 function el(sel){if(!els.has(sel))els.set(sel,{
  value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,style:{},dataset:{},
  classList:{toggle(){},add(){},remove(){}},
  setAttribute(k,v){this[k]=v},addEventListener(k,f){this['on_'+k]=f},focus(){},click(){},appendChild(){},remove(){},
 });return els.get(sel)}
 for(const [id,value] of Object.entries({'#startScore':'301','#outMode':'double','#firstPlayer':'owner',
 '#legsToWin':'3','#setsToWin':'2','#legsPerSet':'2','#targetSelect':'T20','#trainingGoal':'15',
 '#avgPeriod':'all','#hitSource':'all'}))el(id).value=value;
 const context={console,Date,Math,JSON,Number,String,Map,Set,Array,Object,Promise,
  navigator:{onLine:true},
  localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=v}},
  document:{querySelector:el,querySelectorAll(){return []},body:{appendChild(){}}},
  window:{addEventListener(){},scrollTo(){}},confirm(){return true},
  setTimeout(){return 1},clearTimeout(){},crypto:{randomUUID(){return 'id-'+Math.random().toString(36).slice(2)}},
  URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Blob
 };
 vm.createContext(context);vm.runInContext(SOURCE,context,{filename:'app.js'});
 return {run:code=>vm.runInContext(code,context),el,store};
}
function test(name,fn){try{fn();console.log('✓',name)}catch(error){console.error('✗',name);throw error}}
function add301(run,id){
 // Tests können den aktiven Werfer im Testkontext auswählen.
 run(`activeSession.currentPlayerId=${JSON.stringify(id)}`);
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20');");
 run(`activeSession.currentPlayerId=${JSON.stringify(id)}`);
 run("addGameDart('T20');addGameDart('T15');addGameDart('D8');");
}
function init3(r,fmt){
 r.run("setupGuests=[{id:'g1',name:'Julia'},{id:'g2',name:'Tobias'}];renderSetupGuests()");
 r.run(`setSetupFormat('${fmt}')`);
 r.el('#firstPlayer').value='owner';
 r.run('startGame()');
}
test('Drei Spieler: eigene Restpunkte, automatische Rotation und kein Gastanteil im Profil',()=>{
 const r=createRuntime(),run=r.run;init3(r,'free');
 assert.equal(run('activeSession.players.length'),3);
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20');");
 assert.equal(run('activeSession.currentPlayerId'),'g1');
 assert.equal(run("sessionRemaining(activeSession,'owner')"),121);
 assert.equal(run("sessionRemaining(activeSession,'g1')"),301);
 run("addGameDart('MISS');addGameDart('MISS');addGameDart('MISS');");
 assert.equal(run('activeSession.currentPlayerId'),'g2');
 run("addGameDart('MISS');addGameDart('MISS');addGameDart('MISS');");
 assert.equal(run('activeSession.currentPlayerId'),'owner');
 run("addGameDart('T20');addGameDart('T15');addGameDart('D8');");
 assert.equal(run('activeSession.phase'),'between');
 assert.equal(run('activeSession.completedLegs.length'),1);
 assert.equal(run('statSet().totalThrown'),6);
 assert.equal(run('profileGames().length'),1);
 assert.equal(run('statSet().visits.filter(v=>v.score===180).length'),1);
 run('nextLeg()');
 assert.equal(run('activeSession.currentPlayerId'),'g1');
 assert.equal(run('activeSession.starterIndex'),1);
 assert.equal(run("sessionRemaining(activeSession,'owner')"),301);
 assert.equal(run("sessionRemaining(activeSession,'g1')"),301);
 assert.equal(run('activeSession.completedLegs.length'),1);
 add301(run,'g1');
 assert.equal(run('activeSession.phase'),'between');
 assert.equal(run('statSet().totalThrown'),6);
 assert.equal(run('sessionStandings(activeSession).totals.g1'),1);
 assert.equal(run('sessionStandings(activeSession).totals.owner'),1);
 run('endMatch()');
 assert.equal(run('activeSession.phase'),'finished');
 assert.equal(run('db.sessions[0].completedLegs.length'),2);
 assert.equal(run('profileGames().length'),1);
 assert.ok(r.store['oche-dart-data-v4']);
});
test('Legs-Modus: First to 2 Legs beendet das Match automatisch',()=>{
 const r=createRuntime(),run=r.run;
 r.el('#legsToWin').value='2';init3(r,'legs');
 add301(run,'g1');
 assert.equal(run('activeSession.phase'),'between');
 run('nextLeg()');
 add301(run,'g1');
 assert.equal(run('activeSession.phase'),'finished');
 assert.equal(run('activeSession.finishedReason'),'target');
 assert.equal(run('sessionStandings(activeSession).targetWinner'),'g1');
 assert.equal(run('db.sessions[0].completedLegs.length'),2);
 assert.equal(run('statSet().totalThrown'),0);
 assert.equal(run('profileGames().length'),0);
});
test('Sets-Modus: 2 Legs pro Set, 2 Sets zum Matchsieg',()=>{
 const r=createRuntime(),run=r.run;init3(r,'sets');
 for(let i=0;i<4;i++){
  add301(run,'owner');
  const standing=run('sessionStandings(activeSession)');
  if(i===1){assert.equal(standing.sets.owner,1);assert.equal(standing.inSet.owner,0)}
  if(i<3){assert.equal(run('activeSession.phase'),'between');run('nextLeg()')}
 }
 assert.equal(run('sessionStandings(activeSession).sets.owner'),2);
 assert.equal(run('sessionStandings(activeSession).targetWinner'),'owner');
 assert.equal(run('activeSession.phase'),'finished');
 assert.equal(run('statSet().wins'),4);
 assert.equal(run('profileGames().length'),4);
 assert.equal(run('statSet().totalThrown'),24);
 assert.equal(run("profileGames().at(-1).visits.at(-1).remainingBefore"),121);
});
test('Rückgängig nach Checkout storniert Leg, Score und Statistiken',()=>{
 const r=createRuntime(),run=r.run;init3(r,'legs');add301(run,'owner');
 assert.equal(run('activeSession.phase'),'between');
 assert.equal(run('profileGames().length'),1);
 run('undoCheckout()');
 assert.equal(run('activeSession.phase'),'playing');
 assert.equal(run('activeSession.completedLegs.length'),0);
 assert.equal(run('activeSession.currentPlayerId'),'owner');
 assert.equal(run('activeSession.turn.length'),2);
 assert.equal(run('sessionRemaining(activeSession,"owner")'),121);
 assert.equal(run('profileGames().length'),0);
 run("addGameDart('D8')");
 assert.equal(run('activeSession.completedLegs.length'),1);
});
test('Gastname wird HTML-escaped und Gast bleibt im Profil ausgeschlossen',()=>{
 const r=createRuntime(),run=r.run;
 r.run("setupGuests=[{id:'g1',name:'<script>alert(1)</script>'}];renderSetupGuests()");
 r.el('#firstPlayer').value='g1';r.run('startGame()');
 add301(run,'g1');
 assert.equal(run('activeSession.completedLegs[0].winnerId'),'g1');
 assert.equal(run('profileGames().length'),0);
 assert.ok(r.el('#standingsCards').innerHTML.includes('&lt;script&gt;'));
 assert.ok(!r.el('#standingsCards').innerHTML.includes('<script>'));
});
test('Wiederaufnahme eines offenen Matches inklusive Leg-Zwischenstand',()=>{
 const r=createRuntime(),run=r.run;init3(r,'free');add301(run,'owner');
 const restored=createRuntime({'oche-dart-data-v4':r.store['oche-dart-data-v4']});
 assert.equal(restored.run('activeSession.phase'),'between');
 assert.equal(restored.run('activeSession.completedLegs.length'),1);
 restored.run('nextLeg()');
 assert.equal(restored.run('activeSession.currentPlayerId'),'g1');
 restored.run("addGameDart('S20')");
 const resumed=createRuntime({'oche-dart-data-v4':restored.store['oche-dart-data-v4']});
 assert.equal(resumed.run('activeSession.turn.length'),1);
 assert.equal(resumed.run('activeSession.currentPlayerId'),'g1');
});
test('V3-Migration: Altes Match und unterbrochener Spielstand ohne Dubletten',()=>{
 const old={version:3,games:[],matches:[{
  id:'archived',start:301,mode:'double',hasGuest:true,guestName:'Julia',
  startedAt:'2026-10-30T10:00:00Z',completedAt:'2026-10-30T10:10:00Z',winner:'guest',visits:[
   {player:'owner',darts:[{segment:'S20',points:20}],score:20},
   {player:'guest',darts:[{segment:'T20',points:60}]}]}],trainings:[],activeGame:{
    id:'active-old',start:301,mode:'double',hasGuest:true,guestName:'Tobias',activePlayer:'guest',
    visits:[{player:'owner',score:60,darts:[{segment:'S20',points:20},{segment:'S20',points:20},{segment:'S20',points:20}]}],turn:[{segment:'T20',points:60}]
  }};
 const r=createRuntime({'oche-dart-data-v3':JSON.stringify(old)}),run=r.run;
 assert.equal(run('db.sessions.length'),1);
 assert.equal(run('activeSession.currentPlayerId'),'legacy-guest');
 assert.equal(run('activeSession.turn.length'),1);
 assert.equal(run('db.matches.length'),1);
 assert.equal(run('profileGames().length'),1);
 const another=createRuntime({'oche-dart-data-v4':r.store['oche-dart-data-v4']});
 assert.equal(another.run('db.sessions.length'),1);
 assert.equal(another.run('db.matches.length'),1);
});
test('Training läuft unverändert und separat',()=>{
 const r=createRuntime(),run=r.run;
 run('startTraining()');
 run("addTrainingDart('T20');addTrainingDart('S20');");
 for(let i=0;i<13;i++)run("addTrainingDart('MISS')");
 assert.equal(run('db.trainings.length'),1);
 assert.equal(run('statSet().trainDarts.length'),15);
 assert.equal(run('statSet().gameDarts.length'),0);
});
console.log('PASS: alle OCHE-V4-Tests');

test('Regressionsfix: Startmaske startet ohne irrefuehrende Match-Rueckfrage',()=>{
 const r=createRuntime();
 r.run('startGame()');
 const previousId=r.run('activeSession.id');
 r.el('#gameActive').hidden=true;
 r.run('globalThis.confirm=()=>{throw new Error("Die Startmaske darf keine Rueckfrage ausloesen")};');
 r.run('startGame()');
 assert.notEqual(r.run('activeSession.id'),previousId);
 assert.equal(r.run('db.sessions[0].phase'),'finished');
 assert.equal(r.run('db.sessions[1].phase'),'playing');
});
test('Heatmap zeigt laufende eigene Darts, niemals Gastdarts und SVG mit fester Geometrie',()=>{
 const r=createRuntime();
 r.run("setupGuests=[{id:'g1',name:'Gast'}];renderSetupGuests();startGame()");
 r.run("addGameDart('T20');addGameDart('S5');addGameDart('MISS')");
 r.run("addGameDart('T19');addGameDart('T19');addGameDart('T19')");
 r.el('#heatmapSource').value='all';r.el('#heatmapMode').value='relative';
 assert.equal(r.run('heatmapDarts().length'),3);
 r.run('renderHeatmap()');
 const svg=r.el('#heatmapBoard').innerHTML;
 assert.ok(svg.includes('width="424" height="424"'));
 assert.ok(svg.includes('data-seg="T20"'));
 assert.ok(!r.el('#heatmapDetails').textContent.includes('6 eigene Darts'));
});

test('Trainingsziel-Filter gruppiert alte S20- und S19-Einheiten getrennt und filtert die Heatmap',()=>{
 const r=createRuntime();
 r.run(`db.trainings=[
 {id:'one',target:'S20',goal:3,completedAt:'2026-11-01T12:00:00',darts:[{segment:'S20',points:20},{segment:'S20',points:20},{segment:'S5',points:5}]},
 {id:'two',target:'S19',goal:3,completedAt:'2026-11-02T12:00:00',darts:[{segment:'S19',points:19},{segment:'S3',points:3},{segment:'MISS',points:0}]},
 {id:'three',target:'S20',goal:2,completedAt:'2026-11-03T12:00:00',darts:[{segment:'S20',points:20},{segment:'MISS',points:0}]}
 ]`);
 r.run('refreshTrainingTargetOptions()');
 r.el('#trainingStatsTarget').value='S20';
 r.run('renderTrainingTargetStats()');
 assert.ok(r.el('#trainingTargetSummary').innerHTML.includes('60,0 %'));
 assert.ok(r.el('#trainingTargetSummary').innerHTML.includes('5'));
 assert.ok(!r.el('#trainingTargetSessions').innerHTML.includes('S19'));
 r.el('#trainingStatsTarget').value='S19';
 r.run('renderTrainingTargetStats()');
 assert.ok(r.el('#trainingTargetSummary').innerHTML.includes('33,3 %'));
 r.el('#heatmapSource').value='training';r.el('#heatmapTrainingTarget').value='S19';
 assert.equal(r.run('heatmapDarts().length'),3);
 assert.equal(r.run("heatmapDarts().filter(d=>d.segment==='S20').length"),0);
 r.el('#hitSource').value='training';r.el('#hitTrainingTarget').value='S20';
 r.run('renderHits()');
 assert.ok(r.el('#hitTotal').textContent.includes('5 Darts'));
 assert.ok(!r.el('#hitStats').innerHTML.includes('S19'));
});
