# DNX Wetter 2D/3D

<!-- DNX-DISCLAIMER-START -->
> **Wichtiger Hinweis / Vollständige Distanzierung (Hobby-Mod-Mode)**
>
> - **Vollständige Distanzierung:** Ich distanziere mich in jeder Hinsicht vollständig vom Projekt **OpenWebRX / OpenWebRX+** sowie dessen Entwicklern und Betreibern. Es besteht keinerlei Verbindung, Zusammenarbeit, Prüfung, Befürwortung oder Partnerschaft.
> - **Keine öffentlichen/offiziellen OpenWebRX-Plugins (nur Mod-Mode):** Bei diesem Projekt handelt es sich ausdrücklich **nicht** um ein öffentliches oder offizielles Plugin von OpenWebRX, sondern ausschließlich um einen privaten, inoffiziellen **Mod-Mode** (Eigenmodifikation).
> - **Kein öffentlicher Support & keine Haftung:** Es gibt **keinen öffentlichen Support**, keine Garantie und keine Haftung. Nutzung, Installation und Anpassung erfolgen vollständig auf eigene Gefahr (immer vorher Backups anlegen und zunächst im eigenen Testsystem prüfen).
> - **Reines Hobbyprojekt – frei nutzbar, änderbar & verbreitbar:** Dieses Projekt entsteht ausschließlich aus reinem Hobby und Interesse am gemeinsamen Funk-/SDR-Hobby. Es steht ausdrücklich frei zur Verfügung und darf frei genutzt, weiterverbreitet, verändert und verbessert werden.
<!-- DNX-DISCLAIMER-END -->

Eigenständiges Wetterfenster für eine vorhandene OpenWebRX+-Installation. Es arbeitet autark ohne Abhängigkeit von externen Zusatzservern.

## Funktionen

- 2D-Karte mit Leaflet und OpenStreetMap
- 3D-Erdkugel mit CesiumJS und OpenStreetMap
- Ansicht `2D / 3D / BEIDE`
- RainViewer-Niederschlagsradar auf beiden Ansichten
- Wetterdaten per Open-Meteo bei Kartenklick
- Ortssuche über Nominatim
- Startposition Dorsten/NRW
- Verschieben, Maximieren und Zurücksetzen
- Resize an allen vier Kanten und vier deutlich grünen Ecken
- leuchtender grüner DNX-Rahmen
- Speicherung von Position, Größe, Ansicht und Standort im Browser

## Installation

```bash
chmod +x install.sh
sudo ./install.sh install
```

Der Installer lädt Leaflet 1.9.4 und CesiumJS 1.121.0 einmalig lokal in das gemountete Pluginverzeichnis. Zur Laufzeit werden Karten- und Wetterdaten aus dem Internet geladen.

## Status

```bash
./install.sh status
```

## Update

```bash
sudo ./install.sh update
```

## Entfernen

```bash
sudo ./install.sh uninstall
```

Backups liegen unter `/opt/dnx-weather-backups`.

## Externe Datenquellen

- OpenStreetMap-Mitwirkende – Kartenmaterial
- Open-Meteo – Wetterdaten
- RainViewer – Niederschlagsradar
- Nominatim / OpenStreetMap – Ortssuche
- CesiumJS – 3D-Erdkugel
- Leaflet – 2D-Karte

Die jeweiligen Nutzungsbedingungen, Lizenzen und Abruflimits sind vom Betreiber zu beachten.

## Wichtiger Hinweis

Rein privates, unabhängiges Hobbyprojekt. Kein Projekt, Produkt oder offizielles Plugin von OpenWebRX, OpenWebRX+, Cesium, Leaflet, OpenStreetMap, Open-Meteo, RainViewer oder Nominatim. Keine Verbindung, Beauftragung, Unterstützung, Prüfung oder Empfehlung durch deren Entwickler oder Rechteinhaber.

Installation, Nutzung, Veränderung und Weitergabe erfolgen vollständig auf eigene Gefahr. Soweit gesetzlich zulässig keine Haftung für Schäden, Ausfälle, Datenverlust, fehlerhafte oder verspätete Wetterinformationen oder sonstige technische beziehungsweise rechtliche Folgen. Nicht für sicherheitskritische Warnungen verwenden. Vorher Backups erstellen und zuerst auf einem Testsystem prüfen.
