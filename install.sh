#!/usr/bin/env bash
set -Eeuo pipefail
CMD=${1:-install};CONTAINER=${CONTAINER:-owrx-8013};HERE=$(cd "$(dirname "$0")"&&pwd);BACK=/opt/dnx-weather-backups
notice(){ echo 'DNX Wetter 2D/3D – privates, inoffizielles Hobbyprojekt; kein offizielles OpenWebRX-, Cesium-, OSM-, Open-Meteo- oder RainViewer-Projekt. Nutzung auf eigene Gefahr.'; }
paths(){ SRC=$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/usr/lib/python3/dist-packages/htdocs/plugins"}}{{.Source}}{{end}}{{end}}');[[ -n $SRC ]]||{ echo 'Plugin-Mount fehlt';exit 1;};INIT="$SRC/receiver/init.js";DEST="$SRC/receiver/dnx_weather";}
remove(){ python3 - "$INIT" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);t=p.read_text();a='/* DNX_WEATHER_2D3D_START */';b='/* DNX_WEATHER_2D3D_END */'
if a in t and b in t:x,y=t.split(a,1);_,z=y.split(b,1);p.write_text(x+z)
PY
}
install(){ [[ $EUID -eq 0 ]]||exit 1;paths;S=$(date +%F-%H%M%S);mkdir -p "$BACK/$S" "$DEST/vendor";cp -a "$INIT" "$BACK/$S/init.js";[[ -d $DEST ]]&&cp -a "$DEST" "$BACK/$S/"||true;cp "$HERE/dnx_weather.js" "$HERE/dnx_weather.css" "$DEST/";
 if [[ ! -f $DEST/vendor/leaflet/leaflet.js ]];then mkdir -p "$DEST/vendor/leaflet";T=$(mktemp -d);curl -fsSL https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz|tar -xz -C "$T";cp "$T/package/dist/leaflet.js" "$T/package/dist/leaflet.css" "$DEST/vendor/leaflet/";cp -a "$T/package/dist/images" "$DEST/vendor/leaflet/";rm -rf "$T";fi
 if [[ ! -f $DEST/vendor/cesium/Cesium.js ]];then mkdir -p "$DEST/vendor/cesium";T=$(mktemp -d);curl -fsSL https://registry.npmjs.org/cesium/-/cesium-1.121.0.tgz|tar -xz -C "$T";cp -a "$T/package/Build/Cesium/." "$DEST/vendor/cesium/";rm -rf "$T";fi
 remove;cat >>"$INIT" <<'JS'
/* DNX_WEATHER_2D3D_START */
(function(){if(window.__dnxWeatherLoader)return;window.__dnxWeatherLoader=true;var B='/static/plugins/receiver/dnx_weather/';window.CESIUM_BASE_URL=B+'vendor/cesium/';function css(u){var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}function js(u,next){var s=document.createElement('script');s.src=u;s.onload=next;document.head.appendChild(s)}css(B+'vendor/leaflet/leaflet.css');css(B+'vendor/cesium/Widgets/widgets.css');css(B+'dnx_weather.css');js(B+'vendor/leaflet/leaflet.js',function(){js(B+'vendor/cesium/Cesium.js',function(){js(B+'dnx_weather.js')})})})();
/* DNX_WEATHER_2D3D_END */
JS
 command -v node>/dev/null&&node --check "$INIT";docker restart "$CONTAINER";echo 'Installiert. OpenWebRX benötigt 60–90 Sekunden.';}
uninstall(){ [[ $EUID -eq 0 ]]||exit 1;paths;S=$(date +%F-%H%M%S);mkdir -p "$BACK/$S";cp -a "$INIT" "$BACK/$S/init.js";remove;rm -rf "$DEST";docker restart "$CONTAINER";echo 'Entfernt; Backups bleiben erhalten.';}
status(){ paths;grep -q DNX_WEATHER_2D3D_START "$INIT"&&echo 'Loader installiert'||echo 'Loader fehlt';du -sh "$DEST" 2>/dev/null||true;docker ps --filter name="$CONTAINER" --format '{{.Status}}';}
notice
case "$CMD" in install|update)install;;uninstall)uninstall;;status)status;;*)echo 'install | update | status | uninstall';;esac
