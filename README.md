# OCHE 5.0 – Dart Companion

Offlinefähige Dart-PWA, entwickelt von **Lenas Sum**.

## Neu in Version 5

- **Dartboard-Heatmap** im Profil: Original-Segmente Single, Double, Triple, Bull. Quelle Alle/X01/Training. Nur eigene Würfe, niemals Gastwürfe. Interaktive Feld-Details.
- **Versionshinweis** v5.0 und **Entwicklername** oben rechts.
- **Sprachansagen** für abgeschlossene Aufnahmen, Bust, 140+, 180 und Leg-Sieg über die System-Sprachausgabe (de-DE, soweit verfügbar).
- **Soundeffekte** für Treffer, hohe Scores, Bust und Sieg mit Web Audio; keine zusätzlichen Sounddateien und kein Netzwerk nötig.
- **Audio-Einstellungen** im Profil (An/Aus und Lautstärke), separat auf dem Gerät gespeichert.
- **Match teilen**: nach jedem Leg und aus der Matchhistorie. Auf unterstützten Geräten über das Teilen-Menü mit PNG-Matchkarte, sonst Text, Kopieren oder Textdialog.

**Hinweis zur Heatmap:** Die App kennt pro Dart das eingegebene Segment, nicht die exakte Position des Einschlags. Die Heatmap visualisiert deshalb Treffer pro Feld, keine räumliche Streuung innerhalb eines Felds.

## Installation / Update

ZIP entpacken und die Dateien **aus dem ZIP-Stamm** in das Root-Verzeichnis deines bestehenden GitHub-Pages-Repositories hochladen. Gleiche Dateinamen ersetzen. Die `tests` sind optional für die Veröffentlichung. Auf GitHub `Commit changes` bestätigen und nach dem Pages-Deployment die App mit Internetverbindung neu öffnen. Die Offline-Cache-Version wurde auf v5 aktualisiert.

**Vor dem Update** im Profil ein JSON-Backup exportieren. Die vorhandene Datenstruktur und Speicherkennung aus OCHE 4.1 bleiben erhalten, damit bisherige Daten weiter genutzt werden können. Die App benötigt weder Konto noch Backend.

## Tests

`node tests/smoke-tests.cjs`

Audio hängt von der Browser-Unterstützung ab; insbesondere auf iOS muss Audio über eine Nutzeraktion freigegeben werden. Das Match-Teilen erfordert für das native Teilen HTTPS (GitHub Pages bietet HTTPS).

Der Punkt „7.“ in der Anforderung enthielt keine Funktionsbeschreibung und ist daher noch offen.
