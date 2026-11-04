# OCHE 7.0 – Kompakt Edition

**Entwickelt von Lenas Sum** · Kostenlose, offlinefähige Dart-PWA mit HTML, CSS und JavaScript.

## Neu in Version 7.0

- **Deutlich kompakterer Spielbildschirm:** Matchstatus, Spielerstände, Restpunkte und aktuelle Dartaufnahme nehmen weniger Platz ein. Das ursprüngliche Zahlentastenfeld (1–20, Single/Double/Triple, Bull und Miss) bleibt vollständig erhalten und rückt nach oben. Der Verlauf bleibt darunter erreichbar.
- **Kameramodus entfernt.** Keine Berechtigungsabfrage und keine Kamerabibliothek mehr. `camera.js` und `camera-vision.js` werden nicht mehr benötigt.
- **„Als Checkout-Versuch markieren“ entfernt.** Checkout-Treffer werden bei einem erfolgreichen Finish weiterhin automatisch protokolliert. Ohne Erfassung aller Fehlversuche wäre eine Checkout-Prozentquote irreführend; stattdessen zeigt das Profil die Anzahl erfolgreicher Checkouts an. Historische Daten und vorab erfasste Markierungen bleiben in Backups erhalten.
- **Checkout-Assistent ausschließlich bei einem mit den verbleibenden Darts wirklich erreichbaren Finish**, passend zu Double/Straight/Master Out. Wenn kein Checkout möglich ist, wird der Assistent komplett ausgeblendet.
- **Sound-Einstellungen vollständig aus dem Profil entfernt.** Ein kurzer dezenter Eingabeton (`tap.wav`) wird beim Erfassen jedes Darts versucht. Er nutzt reguläre Browser-Audiowiedergabe ohne externe Dienste. **Wichtig:** Web-Apps können den Status des iPhone-Stummschalters und die systemweite Benachrichtigungston-Einstellung weder lesen noch exakt nachbilden. Ob und wie laut der Ton ausgegeben wird, hängt von iOS/Safari und dessen Audioeinstellungen ab. Ein Ton bei aktivem Klingelmodus kann daher nicht auf jedem iPhone garantiert werden.
- Die bisherige Sprachausgabe bleibt entfernt.

## Unverändert

Beliebig viele Gastspieler, Legs-/Sets-/Freies Spiel, Double/Straight/Master Out, Undo, Match fortsetzen, Match teilen, Training, Heatmap, detaillierte Statistiken, JSON-Backup, lokale Speicherung und Offline-Funktion.

## Update über GitHub Pages

1. Vor dem Update im Profil **Backup exportieren**.
2. ZIP entpacken und **alle Dateien aus dem ZIP in das Hauptverzeichnis deines bestehenden GitHub-Repositories hochladen** (Add file → Upload files → Commit changes). Nicht die ZIP-Datei selbst hochladen.
3. Die alten Dateien `camera.js` und `camera-vision.js` kannst du im Repository löschen; sie werden nicht mehr geladen. Auch ohne Löschung wird der Kamera-Modus nicht mehr angezeigt.
4. Unter GitHub → **Actions** die Veröffentlichung abwarten. Die bestehende PWA auf dem iPhone online öffnen und komplett schließen/neu starten.
5. Die installierte App **nicht löschen** und keine Website-Daten löschen; deine bisherigen Einträge sind lokal gespeichert.

Die vorhandene Datenbasis `oche-dart-data-v4` bleibt kompatibel. Der neue Offline-Cache `oche-dart-offline-v7-20261104` ersetzt den bisherigen Cache.

## Tests

```bash
node --check app.js
node --check sw.js
node tests/smoke-tests.cjs
```

Die bestehenden 8 automatisierten Tests für Multiplayer, Leg- und Setlogik, Undo, Speicherung, Migration und Training bestehen. Die neue kompakte Ansicht und die Wurfeingabe wurden in einem mobilen Chromium-Test geprüft. Ein Test auf einem echten iPhone und der iOS-Audiowiedergabe steht noch aus.
