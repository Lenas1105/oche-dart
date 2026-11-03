# Oche – Dart X01 PWA

Eine mobile-first X01-Dart-Zähler-App als Progressive Web App.

## Funktionen
- X01 mit 301, 501, 701, 901 oder 1001 Startpunkten
- Double Out, Straight Out und Master Out
- Dartweise Eingabe (Single, Double, Triple, Single Bull, Bull, Miss)
- Bust-Erkennung, Checkout, Aufnahmeverlauf und Rückgängig
- Profil mit 3-Dart-Average, Bestaufnahme, Checkout-Anzahl, Trefferstatistik und Average-Verlauf
- Lokale Speicherung im Browser, JSON-Backup exportieren/importieren
- Service Worker für Offline-Nutzung nach dem ersten Laden

## Lokal testen
Ein Service Worker funktioniert nicht zuverlässig über `file://`. Starte einen lokalen statischen Server, z. B.:

```bash
python -m http.server 8080
```

Dann im Browser `http://localhost:8080` öffnen.

## Auf dem iPhone installieren
1. Die Dateien auf einen Webhost mit HTTPS hochladen (z. B. GitHub Pages).
2. Die veröffentlichte HTTPS-Adresse in Safari auf dem iPhone öffnen.
3. Teilen → „Zum Home-Bildschirm“ → „Als Web-App öffnen“ aktivieren, falls angezeigt → Hinzufügen.
4. Die App einmal online vollständig laden. Danach werden App-Dateien offline aus dem Cache geladen.

Ein Server muss danach nicht dauerhaft laufen. HTTPS/Hosting wird nur für die erstmalige Bereitstellung und spätere Updates benötigt.

## Daten
Spiele werden lokal im Browser-Speicher dieses Geräts abgelegt. Sie werden nicht automatisch synchronisiert und können beim Löschen von Website-Daten verloren gehen. Deshalb regelmäßig über das Download-Symbol im Profil ein JSON-Backup exportieren. Import ersetzt den aktuellen Datenbestand.

## Aktuelle Grenzen
- Die erste Version ist für einen einzelnen Spieler und einzelne X01-Legs ausgelegt.
- Es gibt keine automatische Cloud-Synchronisierung zwischen Geräten.
- Das Profil wertet abgeschlossene Spiele aus. Ein abgebrochenes Spiel wird nicht gespeichert.
- Die Trefferstatistik zählt die erfassten Dart-Segmente. Die Zahl 25 wird als Single Bull und Bull als Double Bull gespeichert.
