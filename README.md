# OCHE 6.0 – Dart Companion · Kamera-Beta

Entwickelt von **Lenas Sum**. Offlinefähige HTML/CSS/JavaScript-PWA für iPhone und andere Smartphones. Läuft weiterhin auf GitHub Pages ohne Server oder Benutzerkonto.

## Neu in Version 6

- **Optionale Eingabeart im laufenden X01-Leg**: „Manuell eingeben“ (unverändert) oder „Handykamera BETA“.
- **Rückkamera** via Web-API `navigator.mediaDevices.getUserMedia` (benötigt HTTPS und die Berechtigung des Geräts).
- **Kalibrierung auf dein Dartboard**: Auf dem eingefrorenen Kamerabild nacheinander Bullseye, oberer, rechter, unterer und linker Punkt auf dem äußersten Doppelring antippen. Daraus wird eine perspektivisch angepasste Feldkarte berechnet.
- **Vergleich zweier Kamerabilder**: Zuerst eine Referenz aufnehmen, danach wirft ein Spieler einen Dart. Die App analysiert lokal die Veränderung und versucht die neue Dartspitze samt Feld (z. B. T20, D16, SB) zu bestimmen. Bei ausreichend stabiler Erkennung erscheint automatisch ein Treffervorschlag. Für einen manuellen Abgleich gibt es „Jetzt erkennen“.
- **Treffervorschlag prüfen und übernehmen**: Erst eine Bestätigung schreibt den erkannten Dart in die X01-Wertung. Ist das erkannte Feld falsch, kannst du die tatsächliche Dartspitze im Bild antippen und die Position mit den Pfeiltasten präzise korrigieren. Die gewohnte manuelle Eingabe ist jederzeit nur einen Tab entfernt.
- **Automatischer Wechsel** und Anzeige der neuen Restpunkte funktionieren weiterhin für beliebig viele Spieler, Legs und Sets.
- **Sprachausgabe vollständig entfernt**; optionale Soundeffekte bleiben erhalten.
- Versionsanzeige **v6.0** und **von Lenas Sum** in der Kopfzeile.
- Offline-Dateien `camera.js` und `camera-vision.js` im Service-Worker-Cache ergänzt.

## So verwendest du den Kameramodus

1. iPhone mit der Rückkamera fest auf einem **Stativ** positionieren, möglichst so, dass die gesamte Scheibe gut beleuchtet zu sehen ist. Ohne festen Stand funktioniert Bildvergleich nicht.
2. In OCHE ein X01-Match starten. Unter der aktuellen Aufnahme „Handykamera BETA“ wählen und auf „Kamera starten“ tippen. Kamerazugriff erlauben.
3. „Scheibe kalibrieren“ wählen und **fünf Punkte** genau antippen: Mitte des Bullseyes, oben auf dem äußeren Doppelring bei D20, rechts auf dem äußeren Doppelring, unten auf dem äußeren Doppelring, links auf dem äußeren Doppelring.
4. Im Auswahlfeld einstellen, wo das iPhone ungefähr steht (links/rechts/oben/unten/gerade davor). Das hilft, die Spitze vom Schaft zu unterscheiden.
5. Eine **Referenz speichern**, während die Szene stillsteht. Danach einen Dart werfen und kurz warten. OCHE sucht automatisch nach einem neuen Dart. Bei Bedarf „Jetzt erkennen“ drücken.
6. Den Vorschlag prüfen. Wenn er falsch ist, die *Dartspitze an der Scheibe* im Bild antippen und bei Bedarf mit den Pfeiltasten pixelweise korrigieren. Anschließend „Treffer übernehmen“ wählen. Der Dart wird wie bei einer manuellen Eingabe regulär gezählt.
7. Bei der nächsten Aufnahme: Darts aus dem Board ziehen, Hände aus dem Bild nehmen und **erneut eine Referenz speichern**. Beim nächsten Dart geht es weiter. Vor der neuen Referenz muss nicht neu kalibriert werden, solange die Kamera nicht bewegt wurde.

## Ehrliche technische Einschränkungen

**Dies ist ein experimenteller kamerabasierter Assistenzmodus und kein professionelles, vollautomatisches Autoscoring-System.** Die Erkennung basiert auf Bildunterschieden und einfacher Geometrie, nicht auf einem trainierten KI-Modell. Sie funktioniert vor allem bei fest aufgestelltem iPhone, gutem Licht und klar sichtbaren Dartspitzen. Eng beieinander steckende/überlappende Darts, Schatten, Wackeln, verdeckte Spitzen und Drähte können Fehler verursachen. Daher ist die Bestätigung pro Dart absichtlich Pflicht. Das bedeutet, dass du nicht zwingend jedes Trefferfeld per Zifferntastatur eingeben musst, aber es ist **keine garantiert zuverlässige Hands-free-Erkennung**. Für echtes vollautomatisches Scoring ist zusätzliche Modellentwicklung und viel reales Testmaterial erforderlich.

Falls sich die Kamera aus der installierten Homescreen-PWA unter iOS nicht öffnen lässt, versuche, dieselbe HTTPS-GitHub-Pages-Adresse in **Safari** zu öffnen. WebKit hat geräte-/versionsabhängige Probleme beim Zugriff auf die Kamera aus installierten PWAs.

Kameraaufnahmen werden **nur im Arbeitsspeicher auf deinem Gerät verarbeitet**. Sie werden nicht hochgeladen, nicht an Server gesendet und nicht in deinen Backups gespeichert. Bei Wechsel aus dem Spielbereich oder wenn du die App in den Hintergrund schiebst, wird der Kamerastream gestoppt.

## Alle anderen Funktionen bleiben erhalten

- X01 301/501/701/901/1001, Double/Straight/Master Out, Checkout-Hilfe und Bust-Regeln.
- Beliebig viele Spieler, automatische Reihenfolge, Legs/Sets/freie Matches, Pausieren nach Leg und weiterspielen.
- Gastwürfe beeinflussen niemals deine persönliche Profil-Statistik.
- Training, Dartboard-Heatmap nach Segmenten, detaillierte Trefferstatistiken, Average, First 9, 180er, 100+, 140+, Checkouts, Tageshistorie.
- Match-Sharing als Grafik/Text, Soundeffekte, JSON-Backup und -Import, Service Worker / Offline-Modus.

## Update über GitHub Pages

1. Zur Sicherheit zunächst in der alten App im Profil **Backup exportieren**.
2. Dieses ZIP entpacken und die Dateien **im Hauptverzeichnis** deines GitHub-Repositories unter `main` aktualisieren (GitHub → **Add file → Upload files** → **Commit changes**). Die neuen Dateien `camera.js` und `camera-vision.js` müssen unbedingt mit hochgeladen werden. `tests` ist nur für Entwickler nötig.
3. Unter GitHub → **Actions** die erfolgreiche Pages-Veröffentlichung abwarten. Die bestehende URL auf deinem iPhone mit Internet öffnen und die PWA anschließend schließen/neu starten.
4. Die App **nicht deinstallieren** und Website-Daten nicht löschen, da sie lokal gespeichert sind.

**Datenspeicherung:** bestehender Schlüssel `oche-dart-data-v4` bleibt unverändert; vorhandene Matches, Legs, Gaststatistiken, Training und Backups bleiben kompatibel. Der zuvor verwendete Audiokonfigurationsschlüssel wird für die Sound-Einstellungen weiterverwendet, Sprach-Optionen werden ignoriert.

## Tests

```
node --check app.js
node --check camera.js
node --check camera-vision.js
node tests/smoke-tests.cjs
node tests/camera-tests.cjs
```

Die vorhandenen Match-/Statistiktests sowie Testfälle für Kalibrierung, Feldzuordnung, perspektivische Verzerrung, synthetische Bildänderung, Kamerabewegung und unveränderte Bilder wurden ausgeführt. Ein Browser-Interaktionstest mit simuliertem Kamerastream und einem neuen T20 war erfolgreich. **Ein Test auf einem echten iPhone und realer Dartscheibe fehlt noch** und ist vor einem produktiven Einsatz wichtig.
