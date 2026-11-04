/* OCHE 6: optionaler iPhone-Kameramodus. Lokal, ohne Upload oder KI-Cloud. */
(function(){
 'use strict';
 const V=window.OcheVision;
 const $=id=>document.getElementById(id);
 const W=800,H=600;
 const canvas=$('cameraCanvas'),view=canvas.getContext('2d');
 const frame=document.createElement('canvas');frame.width=W;frame.height=H;
 const ctx=frame.getContext('2d',{willReadFrequently:true});
 const video=$('cameraVideo');
 let mode='manual',stream=null,model=null,calib=[],calibrating=false,frozen=null,baseline=null;
 let pending=null,candidateFrame=null,accepting=false,scanner=null,requestId=null,stable=null;
 let lastScan=0,stepLabel='',cameraSide='right';
 const descriptions=['Bullseye (Mitte)','D20 – oberer äußerer Doppelring','Rechter äußerer Doppelring','Unterer äußerer Doppelring','Linker äußerer Doppelring'];
 const status=(msg,kind='normal')=>{const el=$('cameraStatus');el.textContent=msg;el.dataset.kind=kind};
 function toggle(id,show){$(id).hidden=!show}
 function updateUI(){
  toggle('cameraPanel',mode==='camera');toggle('gamePad',mode!=='camera');
  $('inputModeManual').classList.toggle('selected',mode==='manual');
  $('inputModeCamera').classList.toggle('selected',mode==='camera');
  $('cameraLiveTag').textContent=stream?'● LIVE':'○ AUS';
  $('cameraStart').hidden=!!stream;
  $('cameraStop').hidden=!stream;
  $('cameraCalibrate').disabled=!stream;
  $('cameraReference').disabled=!stream||!model||calibrating||!!pending;
  $('cameraCheck').disabled=!stream||!model||!baseline||calibrating||!!pending;
  $('cameraAccept').disabled=!pending?.segment;
  toggle('cameraResult',!!pending);
  $('cameraCalibrate').textContent=calibrating?'Kalibrierung abbrechen':'Scheibe kalibrieren';
  const message=pending?.segment?`Erkannt: ${pending.segment} (${Number(pending.segment==='DB'?50:pending.segment==='SB'?25:pending.segment==='MISS'?0:Number(pending.segment.slice(1))*({S:1,D:2,T:3}[pending.segment[0]]||0))} Punkte)`:
   pending?'Dartspitze im Bild antippen':null;
  if(message)$('cameraSuggestion').textContent=message;
 }
 function showMode(next){
  if(next==='camera'&&!activeMatch()){status('Starte zuerst ein X01-Match.','warn');return}
  mode=next;
  if(next==='manual'){stop();status('Manuelle Eingabe aktiviert.');}
  else if(!stream)status('Kamera starten und einmal das Dartboard kalibrieren.');
  updateUI();
 }
 function capture(){
  if(!stream||!video.videoWidth||!video.videoHeight)return null;
  const vw=video.videoWidth,vh=video.videoHeight,scale=Math.min(W/vw,H/vh),w=vw*scale,h=vh*scale;
  ctx.fillStyle='#07101a';ctx.fillRect(0,0,W,H);
  ctx.drawImage(video,(W-w)/2,(H-h)/2,w,h);
  return ctx.getImageData(0,0,W,H);
 }
 function showSnapshot(img){if(img)view.putImageData(img,0,0)}
 function renderOverlay(){
  if(!model&&calib.length===0)return;
  view.save();view.lineWidth=3;
  const points=calibrating?calib:model?.points||[];
  if(model){
   view.strokeStyle='rgba(214,250,69,.72)';view.beginPath();
   model.points.slice(1).forEach((p,i)=>i?view.lineTo(p.x,p.y):view.moveTo(p.x,p.y));
   view.closePath();view.stroke();
  }
  points.forEach((p,i)=>{
   view.beginPath();view.arc(p.x,p.y,10,0,Math.PI*2);view.fillStyle=i===0?'#fe9b76':'#d6fa45';view.fill();
   view.fillStyle='#0c1522';view.font='bold 15px system-ui';view.textAlign='center';view.textBaseline='middle';view.fillText(String(i+1),p.x,p.y);
  });
  if(pending?.segment&&Number.isFinite(pending.x)){
   view.beginPath();view.arc(pending.x,pending.y,19,0,Math.PI*2);view.strokeStyle='#fff';view.lineWidth=4;view.stroke();
   view.beginPath();view.moveTo(pending.x-26,pending.y);view.lineTo(pending.x+26,pending.y);
   view.moveTo(pending.x,pending.y-26);view.lineTo(pending.x,pending.y+26);view.stroke();
  }
  view.restore();
 }
 function paint(t){
  if(!document.hidden&&mode==='camera'&&stream&&canvas.isConnected){
   if(!calibrating&&!pending&&t-lastScan>90){
    const shot=capture();if(shot)showSnapshot(shot);lastScan=t;
   }else if(frozen)showSnapshot(frozen);
   renderOverlay();
  }
  if(stream&&mode==='camera')requestId=requestAnimationFrame(paint);
 }
 function beginPaint(){if(requestId!==null)cancelAnimationFrame(requestId);requestId=requestAnimationFrame(paint)}
 async function start(){
  if(!activeMatch()){status('Bitte zuerst ein Match starten.','warn');return}
  if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext){status('Kamera benötigt HTTPS und einen Browser mit Kamerazugriff. Bitte in Safari öffnen.','warn');return}
  try{
   stop();mode='camera';updateUI();status('Kamera wird geöffnet …');
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}}});
   video.srcObject=stream;video.setAttribute('playsinline','');video.muted=true;
   await video.play();
   model=null;calib=[];baseline=null;pending=null;frozen=null;stable=null;
   status('Kamera aktiv. Stelle das iPhone fest auf und tippe „Scheibe kalibrieren“.');
   updateUI();beginPaint();
  }catch(e){stop();let reason=e?.name==='NotAllowedError'?'Kamerazugriff nicht erlaubt. Bitte in den iPhone-Einstellungen freigeben.':e?.name==='NotFoundError'?'Keine Kamera gefunden.':'Kamera konnte nicht geöffnet werden. Versuche Safari statt der Homescreen-App.';
   status(reason,'warn');updateUI()}
 }
 function stop(){
  if(scanner){clearInterval(scanner);scanner=null}
  if(requestId!==null){cancelAnimationFrame(requestId);requestId=null}
  stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;
  calib=[];calibrating=false;model=null;baseline=null;frozen=null;pending=null;candidateFrame=null;stable=null;
  updateUI();
 }
 function calibration(){
  if(!stream)return;
  if(calibrating){calibrating=false;calib=[];frozen=null;status('Kalibrierung abgebrochen.');updateUI();return}
  frozen=capture();if(!frozen){status('Noch kein Kamerabild verfügbar.','warn');return}
  calib=[];model=null;baseline=null;pending=null;calibrating=true;
  status('Punkt 1/5: '+descriptions[0]+' antippen.');updateUI();
 }
 function pointOnCanvas(event){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
  return {x:Math.max(0,Math.min(W-1,(event.clientX-rect.left)*W/rect.width)),y:Math.max(0,Math.min(H-1,(event.clientY-rect.top)*H/rect.height))};
 }
 function clickCanvas(e){
  const p=pointOnCanvas(e);if(!p)return;
  if(calibrating){
   calib.push(p);
   if(calib.length<5){status(`Punkt ${calib.length+1}/5: ${descriptions[calib.length]} antippen.`)}
   else{
    const result=V.calibrate(calib,W,H);
    if(!result){calib=[];status('Kalibrierung ungenau. Bitte erneut ab Mitte starten.','warn');return}
    model=result;calibrating=false;frozen=null;
    status('Kalibrierung fertig! Jetzt ohne Bewegung vor der Scheibe „Referenz speichern“ tippen.','good');
    updateUI();
   }
   return;
  }
  if(pending&&model){
   const hit=V.hitAt(model,p.x,p.y);
   pending={...pending,x:p.x,y:p.y,segment:hit.segment,confidence:'manual'};
   status(`Dartspitze auf ${hit.segment} gesetzt. Mit „Treffer übernehmen“ bestätigen.`,'good');
   updateUI();renderOverlay();
  }
 }
 function reference(){
  if(!stream||!model||calibrating)return;
  const data=capture();if(!data){status('Bitte Kamera prüfen.','warn');return}
  baseline=data;stable=null;pending=null;candidateFrame=null;frozen=null;
  status('Referenz gespeichert. Dart werfen – OCHE sucht automatisch nach der Veränderung.','good');updateUI();
  beginScan();
 }
 function beginScan(){
  if(scanner)clearInterval(scanner);
  scanner=setInterval(()=>{
   if(!stream||!baseline||pending||calibrating||document.hidden||!activeMatch()||mode!=='camera')return;
   const img=capture();if(!img)return;
   const result=V.detectChange(baseline,img,W,H,model,cameraSide);
   if(!result.ok){stable=null;return}
   if(stable&&Math.hypot(result.x-stable.x,result.y-stable.y)<28&&result.segment===stable.segment)stable.count++;
   else stable={x:result.x,y:result.y,segment:result.segment,count:1};
   if(stable.count>=3){acceptSuggestion(result,img)}
  },760);
 }
 function acceptSuggestion(result,img){
  if(scanner){clearInterval(scanner);scanner=null}
  pending={x:result.x,y:result.y,segment:result.segment,confidence:result.confidence};
  candidateFrame=img;frozen=img;
  status(`Vorschlag ${result.segment}. Bitte prüfen – bei Bedarf die echte Dartspitze im Bild antippen.`,'good');
  updateUI();
 }
 function detectNow(){
  if(!stream||!model||!baseline)return;
  const img=capture();if(!img){status('Kamerabild nicht bereit.','warn');return}
  const result=V.detectChange(baseline,img,W,H,model,cameraSide);
  if(result.ok)acceptSuggestion(result,img);
  else{
   pending={segment:null,x:null,y:null,confidence:'manual'};frozen=img;candidateFrame=img;
   status(`${result.reason} Tippe im Standbild die Dartspitze an oder wechsle zur Zahleneingabe.`,'warn');updateUI();
  }
 }
 function resetSuggestion(){pending=null;candidateFrame=null;frozen=null;stable=null;status('Weiter scannen. Wirf einen Dart oder tippe „Jetzt erkennen“.');updateUI();if(baseline)beginScan()}
 function acceptDart(){
  if(!pending?.segment||!activeMatch())return;
  const dart=pending.segment,img=candidateFrame,session=activeMatch(),id=session.currentPlayerId,count=session.turn.length;
  accepting=true;try{addGameDart(dart)}finally{accepting=false}
  pending=null;candidateFrame=null;frozen=null;stable=null;
  const next=activeMatch();
  if(next&&next===session&&next.currentPlayerId===id&&next.turn.length===count+1){
   baseline=img;status(`${dart} übernommen. Nächsten Dart werfen.`, 'good');if(stream)beginScan();
  }else{
   baseline=null;if(scanner){clearInterval(scanner);scanner=null}
   status('Aufnahme beendet. Pfeile entfernen, dann eine neue Referenz speichern.','good');
  }
  updateUI();
 }
 function onGameDart(){
  if(mode!=='camera'||accepting)return;
  baseline=null;pending=null;candidateFrame=null;frozen=null;stable=null;
  if(scanner){clearInterval(scanner);scanner=null}
  status('Manueller Dart übernommen. Für die nächste Kameraerkennung die Referenz aktualisieren.');updateUI();
 }
 function onGameStateChange(){
  if(!activeMatch()&&stream){stop();status('Kamera gestoppt: kein laufendes Leg.');}
  updateUI();
 }
 function onLeaveGame(){if(stream){stop();status('Kamera aus Datenschutzgründen beim Verlassen der Spielseite gestoppt.')}}
 $('inputModeManual').addEventListener('click',()=>showMode('manual'));
 $('inputModeCamera').addEventListener('click',()=>showMode('camera'));
 $('cameraStart').addEventListener('click',start);
 $('cameraStop').addEventListener('click',()=>{stop();status('Kamera ausgeschaltet.');});
 $('cameraCalibrate').addEventListener('click',calibration);
 $('cameraReference').addEventListener('click',reference);
 $('cameraCheck').addEventListener('click',detectNow);
 $('cameraAccept').addEventListener('click',acceptDart);
 $('cameraRetry').addEventListener('click',resetSuggestion);
 $('cameraDirection').addEventListener('change',e=>{cameraSide=e.target.value;if(baseline){stable=null;status('Kameraposition angepasst. Aufnahme erneut prüfen.')}});
 canvas.addEventListener('click',clickCanvas);
 $('cameraResult').addEventListener('click',event=>{
  const btn=event.target.closest('[data-camera-nudge]');
  if(!btn||!pending?.segment||!model)return;
  const increments={left:[-3,0],up:[0,-3],down:[0,3],right:[3,0]};
  const [dx,dy]=increments[btn.dataset.cameraNudge]||[0,0];
  pending.x=Math.max(0,Math.min(W-1,pending.x+dx));
  pending.y=Math.max(0,Math.min(H-1,pending.y+dy));
  pending.segment=V.hitAt(model,pending.x,pending.y).segment;
  pending.confidence='manual';
  status(`Dartspitze fein korrigiert: ${pending.segment}.`,'good');updateUI();
  if(frozen){showSnapshot(frozen);renderOverlay()}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream){stop();status('Kamera pausiert. Zum Fortsetzen erneut starten.')}});
 window.addEventListener('pagehide',()=>{if(stream)stop()});
 window.ocheCamera={onGameDart,onGameStateChange,onLeaveGame};
 updateUI();
})();
