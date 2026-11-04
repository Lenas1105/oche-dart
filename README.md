# OCHE 4.0 – Dart Companion

Offlinefähige Progressive Web App (PWA), programmiert in **HTML, CSS und JavaScript**. Kostenloses statisches Hosting, keine Datenbank und kein eigener Server erforderlich.

## Was ist neu?

- **Beliebig weitere Gastspieler hinzufügen**: Neben „Du“ kannst du Gäste mit Namen hinzufügen und wieder entfernen. Die Spielerreihenfolge ist die Reihenfolge der Anmeldung.
- **Alle Spieler bekommen ihre eigenen Restpunkte und Durchschnittswerte**. Die Aufnahme wechselt nach dem dritten Dart oder Bust automatisch zum nächsten Spieler.
- **Rundum-Ansicht** mit Match- und Punkteständen. Bei mehr als vier Teilnehmern wird die Spielerübersicht horizontal scrollbar und folgt dem aktiven Spieler.
- **Drei Spielmodi**:
  1. **Frei**: Beliebig viele Legs, nach jedem Leg entscheiden, ob es weitergeht.
  2. **Legs**: Erster Spieler mit X gewonnenen Legs gewinnt das Match (z. B. „First to 3“).
  3. **Sets**: Ein Set gewinnt, wer zuerst Y Legs gewinnt. Das Match gewinnt, wer zuerst X Sets gewinnt (z. B. 2 Sets, jeweils 3 Legs zum Setsieg). Das funktioniert auch bei mehr als zwei Spielern.
- **Leg-Ende**: Ein Checkout speichert das Leg sofort dauerhaft im lokalen Datenspeicher. Das Match pausiert auf einer übersichtlichen Ergebnisansicht mit „Nächstes Leg“ und „Match jetzt beenden“. Sobald das Spielziel erreicht ist, erscheint der Matchsieger.
- **Fairer Startspieler**: In den nächsten Legs wandert das Anwurf-Recht automatisch einen Platz weiter.
- **Match vorzeitig beenden**: Bereits abgeschlossene Legs bleiben erhalten, das unvollständige Leg wird verworfen.
- **Rückgängig**: Bei laufendem Leg über die Spielerwechsel hinweg, und nach einem Checkout sogar der letzte Checkout (das Leg-Ergebnis wird dazu aus der Statistik zurückgenommen).
- **Matchhistorie** mit allen Teilnehmern, Leg-/Set-Zwischenstand und Matchstatus.
- **Nur die eigenen Darts** (Spieler „Du“) werden in der persönlichen Statistik ausgewertet. Gastwürfe bleiben ausschließlich in der Matchhistorie und zählen weder im Training noch für den 3-Dart-Average, First 9, 180er, Checkout-Quote etc.
- Die vorhandenen Funktionen wie Checkout-Vorschläge, Trefferstatistik nach Segment (T20, S20 usw.), First 9, 180er, 100+, Tagesstatistik und Trainingsmodus bleiben bestehen.

## Update deiner bestehenden GitHub-Pages-App

1. **Vorher ein Backup** in OCHE → Profil exportieren (JSON). Bitte die installierte PWA und die Website-Daten nicht löschen.
2. Dieses ZIP entpacken. Die Dateien `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon.svg`, die PNGs und `README.md` müssen direkt in das Hauptverzeichnis deines bisherigen GitHub-Repositories.
3. GitHub Repository → **Add file → Upload files** → alle Dateien auswählen → **Commit changes**. Gleichnamige Dateien im Hauptverzeichnis ersetzen, neue Dateien ergänzen. Der Ordner `tests` ist nur für Entwickler und muss für die PWA nicht hochgeladen werden.
4. Unter GitHub → **Actions** prüfen, ob `pages build and deployment` erfolgreich abgeschlossen ist.
5. Die **bestehende** GitHub-Pages-Adresse in Safari mit Internet öffnen. Bei Bedarf die PWA vollständig schließen und erneut starten, damit der neue Cache übernommen wird.
6. Die App braucht **keinen App Store** und läuft nach dem ersten Laden auch **offline**. Die bisherigen Daten bleiben unter derselben Website-Adresse normalerweise erhalten.

## Speicherung und Datenübernahme

- Aktuelle Daten werden auf dem Gerät in `localStorage` unter `oche-dart-data-v4` gespeichert.
- Bei erstmaligem Update werden Bestandsdaten aus `oche-dart-data-v3`, `oche-dart-data-v2` und `oche-dart-data-v1` übernommen. Bestehende abgeschlossene Spiele und Trainings bleiben erhalten, ebenso ein laufendes X01-Leg aus einer älteren Version.
- Neue Matches liegen in `sessions`. Jedes abgeschlossene Leg ist dort mit `winnerId` und allen Würfen pro `playerId` gespeichert. Nur abgeschlossene Legs fließen in die Profil-Auswertung ein. Laufende Legs bleiben als Zwischenstand bis zum nächsten Start bestehen.
- Die alte Gast-Historie wird weiter ausgewertet, ohne Gastdarts deinem Profil zuzurechnen.
- In Profil → Backup exportieren/importieren kann die gesamte Match- und Trainingshistorie gesichert werden. Der Import **ersetzt** die aktuellen Daten.
- Es gibt keine Cloud-Synchronisierung. Wenn iOS oder Safari die Website-Daten löscht, können ohne JSON-Backup Statistiken verloren gehen.

## Spielregeln und Statistikdetails

- X01: 301, 501, 701, 901 oder 1001, Straight Out, Double Out oder Master Out. Ein nicht regelkonformer Checkout, Überwerfen oder verbleibende 1 bei Double/Master Out ist ein Bust; die ganze Aufnahme zählt dann 0 Punkte.
- **Erster Anwurf** wird beim Matchstart gewählt; danach rotiert das Anwurfrecht nach jedem Leg um einen Teilnehmer weiter. Die eigentliche Wurfreihenfolge bleibt während des gesamten Matches gleich.
- Bei einem Set-Sieg werden die **Leg-Siege innerhalb dieses Sets** auf 0 zurückgesetzt; die gewonnenen Sets und alle Legs insgesamt bleiben erhalten.
- „Du“ ist immer das Profil. Die Gästeliste ist nur die Teilnehmerliste des aktuellen Matches. Es gibt derzeit keine separaten, dauerhaft speicherbaren Gäste-Profile.
- Die Checkout-Quote wertet als Versuch markierte Darts aus. Der erfolgreiche Checkout-Dart wird automatisch markiert; fehlgeschlagene Checkout-Darts müssen manuell vor der Eingabe als Checkout-Versuch markiert werden.
- **First 9** berücksichtigt nur Legs, in denen du tatsächlich neun Darts geworfen hast. Bust-Aufnahmen zählen mit 0 gewerteten Punkten und allen geworfenen Darts.
- Checkout-Vorschläge sind heuristische Empfehlungen; sie sind keine Garantie für optimale Trefferwahrscheinlichkeit.

## Entwicklertests

Im Projektverzeichnis:

```sh
node tests/smoke-tests.cjs
```

Das Skript prüft Gast-Trennung, drei Spieler, automatische Wechsel, Legs-/Sets-Modus, Undo nach Checkout, PWA-Datenspeicherung, Neustart, V3-Migration und Training. Der JavaScript-Syntaxcheck lautet `node --check app.js`.

## Technische Grenzen

Alle Daten liegen lokal im Browser. Bei sehr vielen Teilnehmern oder extrem langer Matchhistorie wird der verfügbare Gerätespeicher irgendwann eine praktische Grenze setzen. Eine gesonderte Konten- oder Online-Multiplayer-Funktion ist nicht enthalten. Die Browseroberfläche wurde mit Chromium und Programmlogiktests geprüft; ein Test auf einem echten iPhone ist noch sinnvoll.

## Update 4.1: Versehentliches Zoom durch Doppel-Tippen verhindern
Auf dem iPhone verhindert `touch-action: manipulation` das Double-Tap-Zoom auf der App-Oberfläche. Scrollen und bewusster Pinch-Zoom bleiben erhalten. Die Service-Worker-Cache-Version wurde erhöht, damit das Update ausgerollt wird.
