# OCHE Version 7.2 – iPhone-Statusleisten-Fix

**Änderung:** Die obere Navigationsleiste berücksichtigt jetzt den iPhone-Sicherheitsabstand (`env(safe-area-inset-top)`) im Standalone-/Home-Bildschirm-Modus. Uhrzeit, Netz und Akkustand überlappen nicht mehr das OCHE-Logo oder den Versionshinweis.

Die Spiellogik, lokale Datenhaltung, Heatmap und alle anderen Funktionen entsprechen Version 7.1.

## Update
Vorher im Profil Backup exportieren. Alle Dateien in das Wurzelverzeichnis des GitHub-Pages-Repositories hochladen und bestehende Dateien ersetzen. Auf dem iPhone die App danach mit Internetverbindung vollständig schließen und neu starten. Version oben rechts: v7.2.

## Technischer Hinweis
Die Seite verwendet `viewport-fit=cover` und eine durchscheinende iOS-Statusleiste. Deshalb muss die Headerhöhe den zusätzlichen Safe-Area-Abstand aufnehmen; dieser Patch ergänzt ihn ausschließlich oben.
