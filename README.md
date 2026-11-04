# OCHE 7.1 – Bugfix Matchstart + Heatmap

Entwickelt von Lenas Sum.

## Behobene Fehler

- Neues Match aus der sichtbaren Startmaske kann ohne fehlerhafte Alt-Match-Rueckfrage gestartet werden.
- Wenn intern noch ein altes Match als aktiv markiert ist, wird dieses beim Start aus der Startmaske beendet; bereits abgeschlossene Legs bleiben erhalten.
- Wenn ein laufendes Match sichtbar ist, bleibt die Sicherheitsabfrage zum Verwerfen des laufenden Legs bestehen.
- Heatmap auf kleinen Smartphones wieder quadratisch und besser lesbar, mit sichtbaren Segment-Ringen.
- Heatmap zaehlt auch laufende eigene Legs und ein laufendes Training, ohne Gastdarts einzubeziehen.
- Neue Cache-Version und versionierte Skript-/CSS-URLs reduzieren Probleme durch gemischte alte und neue Dateien.

## Update

Vorher im Profil Backup exportieren. Alle Dateien im ZIP in das Hauptverzeichnis deines bestehenden GitHub-Repositories hochladen und committen. Installierte PWA nach Online-Aktualisierung schliessen und neu starten. App nicht deinstallieren, keine Websitedaten loeschen.

Die bisherigen Daten bleiben im lokalen Schluessel `oche-dart-data-v4` erhalten.
