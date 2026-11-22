#!/usr/bin/env bash
set -Eeuo pipefail

CMD=${1:-install}
HERE=$(cd "$(dirname "$0")" && pwd)
BACK=/opt/dnx-weather-backups
TYP=${TYP:-}
CONTAINER=${CONTAINER:-}
PLUGINS=${PLUGINS:-}

notice() {
  echo "DNX Wetter 2D/3D (v1.1.0, Mod-Mode) – privates, inoffizielles Hobbyprojekt."
  echo "Kein offizielles OpenWebRX-, Cesium-, Leaflet-, OSM-, Open-Meteo-, Esri-, OpenTopoMap- oder RainViewer-Projekt. Nutzung auf eigene Gefahr."
}

detect_target() {
  if [[ -n "$PLUGINS" ]]; then
    TYP="normal"
  elif [[ -n "$CONTAINER" ]]; then
    TYP="docker"
  elif [[ -z "$TYP" ]]; then
    if command -v docker >/dev/null 2>&1; then
      local found
      found=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -iE 'openwebrx|owrx' | head -n 1 || true)
      if [[ -n "$found" ]]; then
        CONTAINER="$found"
        TYP="docker"
      fi
    fi
    if [[ -z "$TYP" ]]; then
      for p in /usr/lib/python3/dist-packages/htdocs/plugins /opt/owrx-docker/plugins; do
        if [[ -d "$p/receiver" ]]; then
          PLUGINS="$p"
          TYP="normal"
          break
        fi
      done
    fi
  fi

  if [[ "$TYP" == "docker" ]]; then
    [[ -n "$CONTAINER" ]] || CONTAINER="openwebrx"
    SRC=$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/usr/lib/python3/dist-packages/htdocs/plugins"}}{{.Source}}{{end}}{{end}}')
    [[ -n "$SRC" ]] || { echo "Plugin-Mount für Container '$CONTAINER' fehlt"; exit 1; }
  elif [[ "$TYP" == "normal" ]]; then
    [[ -n "$PLUGINS" && -d "$PLUGINS/receiver" ]] || { echo "PLUGINS-Pfad fehlt ($PLUGINS)"; exit 1; }
    SRC="$PLUGINS"
  else
    echo "Kein OpenWebRX-Plugin-Verzeichnis gefunden. Bitte TYP=normal PLUGINS=... oder TYP=docker CONTAINER=... angeben."
    exit 1
  fi

  INIT="$SRC/receiver/init.js"
  DEST="$SRC/receiver/dnx_weather"
}

remove_loader() {
  python3 - "$INIT" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
if not p.exists():
    raise SystemExit(0)
t = p.read_text(encoding="utf-8")
a = "/* DNX_WEATHER_2D3D_START */"
b = "/* DNX_WEATHER_2D3D_END */"
if a in t and b in t:
    x, y = t.split(a, 1)
    _, z = y.split(b, 1)
    p.write_text(x.rstrip() + "\n" + z.lstrip(), encoding="utf-8")
PY
}

install_pkg() {
  [[ $EUID -eq 0 ]] || { echo "Bitte mit sudo/root ausführen."; exit 1; }
  detect_target
  S=$(date +%F-%H%M%S)
  mkdir -p "$BACK/$S" "$DEST/vendor"
  [[ -f "$INIT" ]] && cp -a "$INIT" "$BACK/$S/init.js"
  [[ -d "$DEST" ]] && cp -a "$DEST" "$BACK/$S/" || true

  cp "$HERE/dnx_weather.js" "$HERE/dnx_weather.css" "$DEST/"

  if [[ ! -f "$DEST/vendor/leaflet/leaflet.js" ]]; then
    mkdir -p "$DEST/vendor/leaflet"
    T=$(mktemp -d)
    curl -fsSL https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz | tar -xz -C "$T"
    cp "$T/package/dist/leaflet.js" "$T/package/dist/leaflet.css" "$DEST/vendor/leaflet/"
    cp -a "$T/package/dist/images" "$DEST/vendor/leaflet/"
    rm -rf "$T"
  fi
  if [[ ! -f "$DEST/vendor/cesium/Cesium.js" ]]; then
    mkdir -p "$DEST/vendor/cesium"
    T=$(mktemp -d)
    curl -fsSL https://registry.npmjs.org/cesium/-/cesium-1.121.0.tgz | tar -xz -C "$T"
    cp -a "$T/package/Build/Cesium/." "$DEST/vendor/cesium/"
    rm -rf "$T"
  fi

  remove_loader
  cat >> "$INIT" <<'JS'
/* DNX_WEATHER_2D3D_START */
(function(){if(window.__dnxWeatherLoader)return;window.__dnxWeatherLoader=true;var B='/static/plugins/receiver/dnx_weather/';window.CESIUM_BASE_URL=B+'vendor/cesium/';function css(u){var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}function js(u,next){var s=document.createElement('script');s.src=u;s.onload=next;document.head.appendChild(s)}css(B+'vendor/leaflet/leaflet.css');css(B+'vendor/cesium/Widgets/widgets.css');css(B+'dnx_weather.css?v=110');js(B+'vendor/leaflet/leaflet.js',function(){js(B+'vendor/cesium/Cesium.js',function(){js(B+'dnx_weather.js?v=110')})})})();
/* DNX_WEATHER_2D3D_END */
JS

  command -v node >/dev/null && node --check "$INIT" "$DEST/dnx_weather.js"
  if [[ "$TYP" == "docker" ]]; then
    docker restart "$CONTAINER"
    echo "Installiert (Docker: $CONTAINER). OpenWebRX benötigt ca. 60–90 Sekunden."
  else
    echo "Installiert (Pfad: $DEST). Browser mit Strg+F5 neu laden."
  fi
}

uninstall_pkg() {
  [[ $EUID -eq 0 ]] || { echo "Bitte mit sudo/root ausführen."; exit 1; }
  detect_target
  S=$(date +%F-%H%M%S)
  mkdir -p "$BACK/$S"
  [[ -f "$INIT" ]] && cp -a "$INIT" "$BACK/$S/init.js"
  remove_loader
  rm -rf "$DEST"
  if [[ "$TYP" == "docker" ]]; then
    docker restart "$CONTAINER"
  fi
  echo "Entfernt; Backups bleiben unter $BACK erhalten."
}

status_pkg() {
  detect_target
  grep -q DNX_WEATHER_2D3D_START "$INIT" && echo "Loader in init.js installiert" || echo "Loader nicht in init.js (ggf. über dnx_styler.js aktiv)"
  du -sh "$DEST" 2>/dev/null || true
  if [[ "$TYP" == "docker" ]]; then
    docker ps --filter name="$CONTAINER" --format '{{.Status}}'
  fi
}

notice
case "$CMD" in
  install|update) install_pkg ;;
  uninstall) uninstall_pkg ;;
  status) status_pkg ;;
  *) echo "Verwendung: $0 {install|update|status|uninstall}" ;;
esac
