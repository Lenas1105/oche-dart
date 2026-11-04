# OCHE – Dart Companion (PWA) Version 2

Offlinefähige Dart-App ohne Backend und ohne App-Store. HTML, CSS und Vanilla JavaScript.

## Neu in Version 2
- X01-Leg: 301, 501, 701, 901 und 1001 / Double-, Straight-, Master-Out.
- Darts einzeln erfassen, Felder **von 1 bis 20 sortiert**.
- **Automatischer Wechsel** zum nächsten Dart und automatischer Abschluss einer Aufnahme nach dem dritten Dart.
- Sofortiger Bust oder Checkout auch schon beim ersten/zweiten Dart; Rückgängig einschließlich letztem Checkout.
- Restscore mit Fortschrittsbalken, Average und **Checkout-/Stell-Empfehlung**. Die Vorschläge sind heuristisch und keine Erfolgsgarantie.
- Profil: **exakte Trefferzahlen je Segment** (S1 bis S20, D1 bis D20, T1 bis T20, SB, DB, Miss), sortierbar nach Anzahl oder Zahl.
- 180er, 140+, 100+, beste Aufnahme, First-9-Average und 3-Dart-Average.
- Tagesstatistik, Checkout-Quote, erzielte Checkout-Scores und Finish-Felder.
- Trainingsmodus: Ziel-Segment und Anzahl Darts wählen; tatsächliche Treffer einzeln erfassen; Trefferquote.
- Spiel- und Trainingshistorie, Datenexport/-import (JSON).
- Speicherung und Wiederaufnahme laufender Legs/Trainings auf diesem Gerät, Service Worker für Offline-Betrieb.
- Bestehende Spiele aus der älteren App werden beim ersten Start auf demselben Gerät aus dem früheren Speicherformat übernommen.

## Auf GitHub Pages veröffentlichen
1. Alle Dateien aus diesem Ordner in das **Hauptverzeichnis** deines bisherigen GitHub-Repositories `oche-dart` hochladen. Die alten Dateien `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest` und `icon.svg` **ersetzen**. Die neuen PNG-Icons hinzufügen.
2. Änderungen mit „Commit changes“ speichern.
3. In Repository → Settings → Pages: Deploy from a branch → main → /(root).
4. Die veröffentlichte URL in Safari am iPhone aufrufen, bei bestehender Verbindung vollständig laden, danach „Teilen“ → „Zum Home-Bildschirm“.
5. Die App auf dem Home-Bildschirm starten. Nach dem ersten Online-Aufruf lässt sie sich auch offline öffnen.

Hinweis: Über `file://` funktioniert der Service Worker nicht. Zum lokalen Testen einen statischen Server verwenden (z. B. `python -m http.server 8080`). Auf iPhone und GitHub Pages muss HTTPS verwendet werden. GitHub Pages bietet HTTPS.

## Statistische Definitionen
- **3-Dart-Average:** Summe der tatsächlich gewerteten Leg-Punkte × 3 / Anzahl aller geworfenen Match-Darts. Bust-Darts zählen als geworfen, Bust-Aufnahme mit 0 Punkten.
- **First 9 Average:** In jedem Leg die ersten neun geworfenen Match-Darts. Nur Legs mit mindestens neun Darts werden dafür berücksichtigt; Bust-Darts zählen mit 0 gewerteten Punkten.
- **Hohe Aufnahmen:** Ein Leg-Bust zählt nicht als 100+/140+/180. Kategorien sind inklusiv.
- **Checkout-Quote:** Erfolgreich beendete Legs geteilt durch die Zahl der explizit als Checkout-Versuch markierten Darts. Ein tatsächlicher Checkout-Dart wird automatisch markiert. **Misses auf ein Checkout-Doppel** bitte vor der Erfassung mit dem Schalter „Diesen Dart als Checkout-Versuch markieren“ kennzeichnen, sonst ist die Quote zu hoch.
- **Tagesstatistik:** Datum der Leg-/Training-Beendigung in der lokalen Zeitzone des Geräts.
- **Training:** Tatsächlich getroffene Segmente, nicht nur die Ziel-Treffer, werden aufgeschrieben. Spiel-Average wird nur aus X01-Legs ermittelt. Trefferstatistik lässt sich auf Training/X01/Alle filtern.

## Wichtige Einschränkungen
- Ein Spieler; X01 zählt einzelne Legs, keine Best-of-Matches und kein Mehrspieler.
- Kein automatisches Scoring per Kamera.
- Keine Cloud-Synchronisation zwischen iPhone und PC; lokale Browserdaten können gelöscht werden.
- Checkout-Empfehlungen sind Vorschläge, kein vollständiges Ranking für alle Spielerpräferenzen.
- Die App selbst ist ohne laufenden Backend-Server verwendbar, aber die statischen Dateien müssen einmalig online geladen und gecacht werden.
- Regelmäßig im Profil **Backup exportieren**.
