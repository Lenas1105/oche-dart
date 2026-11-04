const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SOURCE=fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
function createRuntime(store={}){
 const elements=new Map(),listeners={};
 function el(selector){if(!elements.has(selector))elements.set(selector,{
  id:selector,value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,style:{},dataset:{},
  classList:{toggle(){},add(){},remove(){}},
  setAttribute(k,v){this[k]=v},addEventListener(k,f){this['on_'+k]=f},click(){},appendChild(){},remove(){},
 });return elements.get(selector)}
 Object.assign(el('#startScore'),{value:'301'});
 Object.assign(el('#outMode'),{value:'double'});
 Object.assign(el('#gameType'),{value:'guest'});
 Object.assign(el('#guestName'),{value:'Julia'});
 Object.assign(el('#firstPlayer'),{value:'owner'});
 Object.assign(el('#targetSelect'),{value:'T20'});
 Object.assign(el('#trainingGoal'),{value:'15'});
 Object.assign(el('#avgPeriod'),{value:'all'});
 Object.assign(el('#hitSource'),{value:'all'});
 const context={console,Date,Math,JSON,Number,String,Map,Set,Array,Object,Promise,
  navigator:{onLine:true},
  localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},
  document:{querySelector:el,querySelectorAll(){return []},body:{appendChild(){}}},
  window:{addEventListener(){},scrollTo(){}},confirm(){return true},
  setTimeout(){return 1},clearTimeout(){},crypto:{randomUUID(){return 'id-'+Math.random()}},
  URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Blob,
 };
 vm.createContext(context);vm.runInContext(SOURCE,context,{filename:'app.js'});
 return {run:script=>vm.runInContext(script,context),el,store,context};
}
function check(ok,msg){assert.ok(ok,msg);console.log('✓',msg)}
{
 const r=createRuntime();const run=r.run;
 run("startGame();");
 check(run('activeGame.hasGuest && activeGame.guestName===\"Julia\"'),'Gast-Modus mit Namen');
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20')");
 check(run('activeGame.activePlayer')==='guest','Auto-Wechsel von Du zu Gast');
 check(run('matchRemaining(activeGame,\"owner\")')===121,'Eigene 180 reduziert nur deine Punkte');
 check(run('matchRemaining(activeGame,\"guest\")')===301,'Gaststand unabhängig');
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20')");
 check(run('activeGame.activePlayer')==='owner','Auto-Wechsel Gast zurück zu Du');
 check(run('matchRemaining(activeGame,\"guest\")')===121,'Gast wirft separat 180');
 run("addGameDart('T20');addGameDart('T15');addGameDart('D8')");
 check(run('db.matches.length')===1,'Checkout speichert Match');
 check(run('db.matches[0].winner')==='owner','Du gewinnst');
 check(run('profileGames()[0].visits.length')===2,'Profil nur mit eigenen Aufnahmen');
 check(run('statSet().totalThrown')===6,'Gast-Darts nicht im Profil-Dartzähler');
 check(run('statSet().visits.filter(v=>v.score===180).length')===1,'Gast-180 wird nicht mitgezählt');
 check(run('statSet().wins')===1,'Eigener Sieg in Checkout-Quote');
 check(r.el('#finishWinnerTitle').textContent==='Du gewinnst das Leg!','Siegeranzeige korrekt');
 r.el('#undoCheckout').on_click();
 check(run('db.matches.length')===0,'Checkout rückgängig entfernt Profil-Ergebnis');
 check(run('activeGame.activePlayer')==='owner','Checkout rückgängig kehrt zum richtigen Spieler zurück');
 check(run('activeGame.turn.length')===2,'Checkout rückgängig nimmt nur letzten Dart zurück');
 check(run('matchRemaining(activeGame,\"owner\")')===121,'Punktestand nach Undo wiederhergestellt');
 run("addGameDart('D8')");
 check(run('db.matches.length')===1,'Checkout nach Korrektur erneut möglich');
 check(r.store['oche-dart-data-v3']!==undefined,'V3-Daten werden persistent gespeichert');
 run("startTraining();addTrainingDart('T20');addTrainingDart('S20');");
 for(let i=0;i<13;i++)run("addTrainingDart('MISS')");
 check(run('db.trainings.length')===1,'Trainingsmodus weiterhin nutzbar');
}
{
 const r=createRuntime(),run=r.run;
 r.el('#firstPlayer').value='guest';run('startGame()');
 check(run('activeGame.activePlayer')==='guest','Gast kann beginnen');
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20')");
 run("addGameDart('MISS');addGameDart('MISS');addGameDart('MISS')");
 run("addGameDart('T20');addGameDart('T15');addGameDart('D8')");
 check(run('db.matches[0].winner')==='guest','Gast gewinnt');
 check(run('statSet().totalThrown')===3,'Nur 3 eigene MISS-Darts zählen');
 check(run('statSet().visits.filter(v=>v.score===180).length')===0,'Gast-180 komplett ausgeschlossen');
 check(run('statSet().wins')===0,'Gast-Sieg erhöht persönliche Siege nicht');
 check(run('statSet().attempts')===0,'Gast-Checkout zählt nicht in eigene Quote');
 check(run('profileGames()[0].checkout')===false,'Deine Niederlage steht korrekt im Profil');
 check(r.el('#finishWinnerTitle').textContent.includes('Julia'),'Gastname als Sieger sichtbar');
}
{
 const r=createRuntime(),run=r.run;
 run("startGame();addGameDart('S20');addGameDart('S20');addGameDart('S20')");
 check(run('activeGame.activePlayer')==='guest','Nach Besitzer-Aufnahme steht Gast am Zug');
 r.el('#undoGame').on_click();
 check(run('activeGame.activePlayer')==='owner','Undo springt zum vorherigen Spieler zurück');
 check(run('activeGame.turn.length')===2,'Undo stellt 2 von 3 Darts wieder her');
 check(run('activeGame.visits.length')===0,'Undo entfernt chronologische Aufnahme');
 check(run('matchRemaining(activeGame,\"owner\")')===301,'Restpunkte nach Undo bleiben korrekt');
 run("addGameDart('S20')");
 check(run('matchRemaining(activeGame,\"owner\")')===241,'Korrigierte Aufnahme wird richtig gewertet');
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20')");
 check(run('activeGame.activePlayer')==='owner','Auto-Wechsel zum Besitzer nach Gast-180');
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20')"); // 241 -> 61
 run("addGameDart('T20')"); // 61 -> 1, bust
 check(run('activeGame.activePlayer')==='guest','Bust löst Spielerwechsel aus');
 check(run('matchRemaining(activeGame,\"owner\")')===61,'Bust-Punkte werden zurückgesetzt');
}
{
 const old={version:2,games:[{id:'old',start:301,mode:'double',date:'2026-10-31T12:00:00.000Z',checkout:true,won:true,visits:[
 {number:1,score:180,darts:[{label:'T',number:20,points:60},{label:'T',number:20,points:60},{label:'T',number:20,points:60}],bust:false},
 {number:2,score:121,darts:[{label:'T',number:20,points:60},{label:'T',number:15,points:45},{label:'D',number:8,points:16}],bust:false}]}],trainings:[],activeGame:null};
 const r=createRuntime({'oche-dart-data-v2':JSON.stringify(old)}),run=r.run;
 check(run('profileGames().length')===1,'Altes V2-Leg migriert');
 check(run('statSet().totalThrown')===6,'Alte Statistik bleibt erhalten');
 check(run('db.matches.length')===0,'Legacy wird nicht doppelt gespeichert');
 check(r.store['oche-dart-data-v3']!==undefined,'V3 legt eigenen neuen Speicherstand an');
 const snapshot=r.store['oche-dart-data-v3'];
 const again=createRuntime({'oche-dart-data-v3':snapshot,'oche-dart-data-v2':JSON.stringify(old)});
 check(again.run('profileGames().length')===1,'Nach Neustart keine doppelte Migration');
}
{
 const r=createRuntime(),run=r.run;
 r.el('#gameType').value='solo';run('startGame()');
 run("addGameDart('T20');addGameDart('T20');addGameDart('T20')");
 check(run('activeGame.activePlayer')==='owner','Solo ohne Gast bleibt Solo');
 run("addGameDart('T20');addGameDart('T15');addGameDart('D8')");
 check(run('db.matches[0].hasGuest')===false,'Solo-Match korrekt gespeichert');
 check(run('statSet().totalThrown')===6,'Solo zählt zur eigenen Statistik');
}
console.log('PASS alle Tests');
