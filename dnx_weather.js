(function () {
  "use strict";
  if (window.__dnxWeather2D3D) return;
  window.__dnxWeather2D3D = true;

  var KEY = "dnx.weather.2d3d.v2";
  var DEF_LAT = 51.16, DEF_LON = 10.45, DEF_ZOOM = 6;
  var BASEMAPS = {
    osm: {
      name: "OpenStreetMap",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      max: 19,
      credit: "© OpenStreetMap"
    },
    sat: {
      name: "Satellit",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      max: 18,
      credit: "© Esri"
    },
    topo: {
      name: "Topografie",
      url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
      max: 17,
      credit: "© OpenTopoMap (CC-BY-SA)"
    }
  };
  var WMO = {
    0: "Klar", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bedeckt",
    45: "Nebel", 48: "Reifnebel", 51: "Leichter Niesel", 53: "Mäßiger Niesel",
    55: "Dichter Niesel", 61: "Leichter Regen", 63: "Mäßiger Regen", 65: "Starker Regen",
    71: "Leichter Schnee", 73: "Mäßiger Schnee", 75: "Starker Schnee",
    80: "Regenschauer", 81: "Mäßige Schauer", 82: "Starke Schauer",
    95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Starkes Gewitter"
  };

  var state = {
    lat: DEF_LAT,
    lon: DEF_LON,
    zoom: DEF_ZOOM,
    mode: "both",
    radar: true,
    base: "osm",
    label: "Deutschland",
    pos: null
  };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved && typeof saved === "object") Object.assign(state, saved);
  } catch (e) {}
  if (!BASEMAPS[state.base]) state.base = "osm";
  if (state.mode !== "2d" && state.mode !== "3d" && state.mode !== "both") state.mode = "both";

  var map, viewer, base2d, base3d, radar2d, radar3d, marker2d, pin3d, win, resizeTimer;
  var radarInfo = { url: null, timeStr: "" };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function reqRender() {
    try {
      if (viewer && !viewer.isDestroyed() && viewer.scene) {
        viewer.scene.requestRender();
      }
    } catch (e) {}
  }

  function launch() {
    var p = document.getElementById("openwebrx-panel-receiver");
    if (!p || document.getElementById("dnx-weather-launch")) return;
    var b = document.createElement("button");
    b.id = "dnx-weather-launch";
    b.textContent = "🌦 DNX Wetter 2D/3D";
    b.onclick = open;
    p.insertBefore(b, p.firstChild);
  }

  function build() {
    if (win) return;
    win = document.createElement("div");
    win.id = "dnx-weather-win";
    win.innerHTML = [
      '<div class="dnx-w-head">',
      '  <b>🌦 DNX Wetter 2D/3D</b>',
      '  <button data-mode="2d">2D</button>',
      '  <button data-mode="3d">3D</button>',
      '  <button data-mode="both">BEIDE</button>',
      '  <button data-a="max" title="Maximieren">□</button>',
      '  <button data-a="reset" title="Fenster zurücksetzen">↺</button>',
      '  <button data-a="close" title="Schließen">✕</button>',
      '</div>',
      '<div class="dnx-w-toolbar">',
      '  <input id="dnx-w-search" type="text" placeholder="Ort suchen (z. B. Hamburg, Berlin)">',
      '  <button data-a="search">Suchen</button>',
      '  <button data-a="home">Start</button>',
      '  <select id="dnx-w-base" title="Kartenstil">',
      '    <option value="osm">OpenStreetMap</option>',
      '    <option value="sat">Satellit</option>',
      '    <option value="topo">Topografie</option>',
      '  </select>',
      '  <label class="dnx-w-chk"><input id="dnx-w-radar" type="checkbox"> Radar</label>',
      '  <button data-a="reload">Neu laden</button>',
      '  <span id="dnx-w-now">Bereit</span>',
      '</div>',
      '<div class="dnx-w-body">',
      '  <section id="dnx-w-pane2d" class="dnx-w-pane">',
      '    <div id="dnx-w-map2d" class="dnx-w-map"></div>',
      '    <div class="dnx-w-info">2D-Karte · Kartenklick zeigt Wetter</div>',
      '  </section>',
      '  <section id="dnx-w-pane3d" class="dnx-w-pane">',
      '    <div id="dnx-w-map3d" class="dnx-w-map"></div>',
      '    <div class="dnx-w-info">3D-Erdkugel · Klick zeigt Wetter</div>',
      '  </section>',
      '</div>',
      '<div class="dnx-w-status" id="dnx-w-status">OpenStreetMap · Open-Meteo · RainViewer · CesiumJS</div>'
    ].join("") + ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map(function (x) {
      return '<i class="dnx-w-handle dnx-w-' + x + '" data-r="' + x + '"></i>';
    }).join("");
    document.body.appendChild(win);
    bind();
    restoreBox();
    applyMode();
    setTimeout(initMaps, 100);
  }

  function open() {
    build();
    win.style.display = "block";
    win.classList.add("active");
    setTimeout(resizeMaps, 200);
  }

  function bind() {
    win.addEventListener("click", function (e) {
      var m = e.target && e.target.dataset ? e.target.dataset.mode : null;
      var a = e.target && e.target.dataset ? e.target.dataset.a : null;
      if (m) {
        state.mode = m;
        save();
        applyMode();
      }
      if (a === "close") win.style.display = "none";
      if (a === "max") {
        win.classList.toggle("max");
        setTimeout(resizeMaps, 200);
      }
      if (a === "reset") {
        state.pos = null;
        save();
        win.classList.remove("max");
        win.style.cssText = "display:block";
        setTimeout(resizeMaps, 200);
      }
      if (a === "home") {
        state.label = "Deutschland";
        go(DEF_LAT, DEF_LON, DEF_ZOOM);
      }
      if (a === "reload") {
        loadRadar();
        weather(state.lat, state.lon, state.label);
      }
      if (a === "search") search();
    });

    var inp = win.querySelector("#dnx-w-search");
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        search();
      }
    });

    var rad = win.querySelector("#dnx-w-radar");
    rad.checked = !!state.radar;
    rad.onchange = function (e) {
      state.radar = !!e.target.checked;
      save();
      setRadar();
    };

    var baseSel = win.querySelector("#dnx-w-base");
    baseSel.value = state.base;
    baseSel.onchange = function (e) {
      var k = e.target.value;
      if (!BASEMAPS[k]) return;
      state.base = k;
      save();
      setBaseMap();
    };

    drag();
    handles();
    win.addEventListener("pointerdown", function () { win.classList.add("active"); });
    window.addEventListener("pointerdown", function (e) {
      if (!win.contains(e.target)) win.classList.remove("active");
    });
  }

  function restoreBox() {
    if (!state.pos) return;
    Object.assign(win.style, {
      left: state.pos.l + "px",
      top: state.pos.t + "px",
      width: state.pos.w + "px",
      height: state.pos.h + "px"
    });
  }

  function storeBox() {
    var r = win.getBoundingClientRect();
    state.pos = { l: r.left, t: r.top, w: r.width, h: r.height };
    save();
  }

  function drag() {
    var h = win.querySelector(".dnx-w-head");
    var on = false, sx, sy, l, t;
    h.addEventListener("pointerdown", function (e) {
      if (e.target.tagName === "BUTTON") return;
      on = true;
      sx = e.clientX;
      sy = e.clientY;
      l = win.offsetLeft;
      t = win.offsetTop;
      h.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    h.addEventListener("pointermove", function (e) {
      if (!on || win.classList.contains("max")) return;
      win.style.left = Math.max(0, Math.min(innerWidth - 100, l + e.clientX - sx)) + "px";
      win.style.top = Math.max(0, Math.min(innerHeight - 44, t + e.clientY - sy)) + "px";
    });
    h.addEventListener("pointerup", function () {
      if (!on) return;
      on = false;
      storeBox();
    });
  }

  function handles() {
    win.querySelectorAll("[data-r]").forEach(function (h) {
      var on = false, sx, sy, r;
      h.addEventListener("pointerdown", function (e) {
        on = true;
        sx = e.clientX;
        sy = e.clientY;
        r = win.getBoundingClientRect();
        h.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      });
      h.addEventListener("pointermove", function (e) {
        if (!on) return;
        var dx = e.clientX - sx, dy = e.clientY - sy, d = h.dataset.r;
        var L = r.left, T = r.top, W = r.width, H = r.height;
        if (d.indexOf("e") >= 0) W = Math.max(760, W + dx);
        if (d.indexOf("s") >= 0) H = Math.max(500, H + dy);
        if (d.indexOf("w") >= 0) { W = Math.max(760, W - dx); L = r.right - W; }
        if (d.indexOf("n") >= 0) { H = Math.max(500, H - dy); T = r.bottom - H; }
        Object.assign(win.style, {
          left: L + "px",
          top: T + "px",
          width: Math.min(innerWidth - L, W) + "px",
          height: Math.min(innerHeight - T, H) + "px"
        });
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeMaps, 50);
      });
      h.addEventListener("pointerup", function () {
        if (!on) return;
        on = false;
        storeBox();
        resizeMaps();
      });
    });
  }

  function applyMode() {
    if (!win) return;
    var b = win.querySelector(".dnx-w-body");
    var p2 = win.querySelector("#dnx-w-pane2d");
    var p3 = win.querySelector("#dnx-w-pane3d");
    p2.classList.toggle("hidden", state.mode === "3d");
    p3.classList.toggle("hidden", state.mode === "2d");
    b.classList.toggle("one", state.mode !== "both");
    win.querySelectorAll("[data-mode]").forEach(function (x) {
      x.classList.toggle("on", x.dataset.mode === state.mode);
    });
    setTimeout(resizeMaps, 100);
  }

  function makeCesiumProvider(bm) {
    return new Cesium.UrlTemplateImageryProvider({
      url: bm.url,
      credit: bm.credit,
      maximumLevel: bm.max
    });
  }

  function setBaseMap() {
    var bm = BASEMAPS[state.base] || BASEMAPS.osm;
    if (map) {
      if (base2d) { map.removeLayer(base2d); base2d = null; }
      base2d = L.tileLayer(bm.url, { maxZoom: bm.max, attribution: bm.credit }).addTo(map);
      if (base2d.bringToBack) base2d.bringToBack();
    }
    if (viewer && !viewer.isDestroyed()) {
      var insertIdx = 0;
      if (base3d) {
        try { viewer.imageryLayers.remove(base3d, true); } catch (e) {}
        base3d = null;
      }
      base3d = viewer.imageryLayers.addImageryProvider(makeCesiumProvider(bm), insertIdx);
      reqRender();
    }
    updateStatus();
  }

  function updatePin(lat, lon) {
    if (map) {
      if (!marker2d) {
        marker2d = L.circleMarker([lat, lon], {
          radius: 7,
          color: "#052a18",
          weight: 2,
          fillColor: "#28ff72",
          fillOpacity: 0.95
        }).addTo(map);
      } else {
        marker2d.setLatLng([lat, lon]);
      }
    }
    if (viewer && !viewer.isDestroyed()) {
      var pos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
      if (!pin3d) {
        pin3d = viewer.entities.add({
          position: pos,
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString("#28ff72"),
            outlineColor: Cesium.Color.fromCssColorString("#052a18"),
            outlineWidth: 2
          }
        });
      } else {
        pin3d.position = pos;
      }
      reqRender();
    }
  }

  function initMaps() {
    if (typeof L === "undefined" || typeof Cesium === "undefined") {
      show("Bibliotheken fehlen");
      return;
    }
    var bm = BASEMAPS[state.base] || BASEMAPS.osm;
    map = L.map("dnx-w-map2d").setView([state.lat, state.lon], state.zoom);
    base2d = L.tileLayer(bm.url, { maxZoom: bm.max, attribution: bm.credit }).addTo(map);
    map.on("click", function (e) {
      state.lat = e.latlng.lat;
      state.lon = e.latlng.lng;
      state.label = state.lat.toFixed(2) + "° N, " + state.lon.toFixed(2) + "° E";
      save();
      updatePin(state.lat, state.lon);
      weather(state.lat, state.lon, state.label);
    });

    Cesium.Ion.defaultAccessToken = "";
    var osmProv = makeCesiumProvider(bm);
    var vOpts = {
      baseLayerPicker: false,
      geocoder: false,
      timeline: false,
      animation: false,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      terrainProvider: new Cesium.EllipsoidTerrainProvider()
    };
    if (typeof Cesium.ImageryLayer === "function") {
      vOpts.baseLayer = new Cesium.ImageryLayer(osmProv);
    } else {
      vOpts.imageryProvider = osmProv;
    }
    viewer = new Cesium.Viewer("dnx-w-map3d", vOpts);
    base3d = viewer.imageryLayers.length ? viewer.imageryLayers.get(0) : null;

    try {
      viewer.scene.globe.enableLighting = false;
      viewer.scene.highDynamicRange = false;
      if (viewer.scene.shadowMap) viewer.scene.shadowMap.enabled = false;
      if (viewer.scene.globe.atmosphereLightIntensity !== undefined) {
        viewer.scene.globe.atmosphereLightIntensity = 10;
      }
    } catch (e) {}

    try {
      if (viewer.homeButton && viewer.homeButton.viewModel) {
        viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (info) {
          info.cancel = true;
          state.label = "Deutschland";
          go(DEF_LAT, DEF_LON, DEF_ZOOM);
        });
      }
    } catch (e) {}

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(state.lon, state.lat, 1850000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-70), roll: 0 }
    });
    viewer.screenSpaceEventHandler.setInputAction(function (m) {
      var c = viewer.camera.pickEllipsoid(m.position, viewer.scene.globe.ellipsoid);
      if (c) {
        var g = Cesium.Cartographic.fromCartesian(c);
        state.lat = Cesium.Math.toDegrees(g.latitude);
        state.lon = Cesium.Math.toDegrees(g.longitude);
        state.label = state.lat.toFixed(2) + "° N, " + state.lon.toFixed(2) + "° E";
        save();
        updatePin(state.lat, state.lon);
        weather(state.lat, state.lon, state.label);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    try {
      viewer.scene.globe.tileLoadProgressEvent.addEventListener(function () {
        reqRender();
      });
    } catch (e) {}

    updatePin(state.lat, state.lon);
    loadRadar();
    weather(state.lat, state.lon, state.label);
    updateStatus();
    reqRender();
  }

  function resizeMaps() {
    try { if (map) map.invalidateSize(); } catch (e) {}
    try {
      if (viewer && !viewer.isDestroyed()) {
        viewer.resize();
        reqRender();
      }
    } catch (e) {}
  }

  function go(lat, lon, z, label) {
    state.lat = lat;
    state.lon = lon;
    state.zoom = z || DEF_ZOOM;
    if (label) state.label = label;
    save();
    if (map) map.setView([lat, lon], state.zoom);
    if (viewer && !viewer.isDestroyed()) {
      var height = state.zoom >= 9 ? 650000 : 1850000;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        duration: 0.9
      });
      reqRender();
    }
    updatePin(lat, lon);
    weather(lat, lon, state.label);
  }

  async function search() {
    var q = win.querySelector("#dnx-w-search").value.trim();
    if (!q) return;
    try {
      var r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q), {
        headers: { "Accept-Language": "de" }
      });
      var d = await r.json();
      if (d && d[0]) {
        var shortName = String(d[0].display_name || q).split(",")[0].trim() || q;
        go(+d[0].lat, +d[0].lon, 9, shortName);
      } else {
        show("Ort nicht gefunden");
      }
    } catch (e) {
      show("Ortssuche fehlgeschlagen");
    }
  }

  async function weather(lat, lon, label) {
    try {
      var u = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto";
      var r = await fetch(u);
      var d = await r.json();
      var c = d.current || {};
      var cond = WMO[c.weather_code] ? (" · " + WMO[c.weather_code]) : "";
      var prefix = label ? (label + " · ") : "";
      var txt = prefix + "🌡 " + (c.temperature_2m != null ? c.temperature_2m : "—") +
        " °C · Gefühl " + (c.apparent_temperature != null ? c.apparent_temperature : "—") +
        " °C" + cond +
        " · 💧 " + (c.relative_humidity_2m != null ? c.relative_humidity_2m : "—") +
        " % · 🌧 " + (c.precipitation != null ? c.precipitation : "—") +
        " mm · ☁ " + (c.cloud_cover != null ? c.cloud_cover : "—") +
        " % · 💨 " + (c.wind_speed_10m != null ? c.wind_speed_10m : "—") + " km/h";
      show(txt);
      win.querySelectorAll(".dnx-w-info").forEach(function (x) { x.textContent = txt; });
    } catch (e) {
      show("Wetterdaten nicht erreichbar");
    }
  }

  function show(t) {
    var el = win && win.querySelector("#dnx-w-now");
    if (el) el.textContent = t;
  }

  function updateStatus() {
    var el = win && win.querySelector("#dnx-w-status");
    if (!el) return;
    var bm = BASEMAPS[state.base] || BASEMAPS.osm;
    var rad = (state.radar && radarInfo.timeStr) ? (" · Radar " + radarInfo.timeStr) : "";
    el.textContent = bm.name + " · Open-Meteo · RainViewer" + rad + " · CesiumJS";
  }

  async function loadRadar() {
    try {
      var r = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      var d = await r.json();
      var frames = (d.radar && d.radar.past) || [];
      var f = frames[frames.length - 1];
      if (!f) return;
      radarInfo.url = (d.host || "https://tilecache.rainviewer.com") + f.path + "/256/{z}/{x}/{y}/2/1_1.png";
      window.__dnxRadarUrl = radarInfo.url;
      if (f.time) {
        var dt = new Date(f.time * 1000);
        radarInfo.timeStr = String(dt.getUTCHours()).padStart(2, "0") + ":" + String(dt.getUTCMinutes()).padStart(2, "0") + " UTC";
      }
      setRadar();
      updateStatus();
    } catch (e) {
      show("Radar nicht erreichbar");
    }
  }

  function setRadar() {
    if (!map || !viewer || viewer.isDestroyed()) return;
    if (radar2d) { map.removeLayer(radar2d); radar2d = null; }
    if (radar3d) { try { viewer.imageryLayers.remove(radar3d, true); } catch (e) {} radar3d = null; }
    if (!state.radar || !radarInfo.url) {
      reqRender();
      updateStatus();
      return;
    }
    radar2d = L.tileLayer(radarInfo.url, { opacity: 0.65, zIndex: 20, maxNativeZoom: 7, maxZoom: 19, attribution: "RainViewer" }).addTo(map);
    radar3d = viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: radarInfo.url,
      credit: "RainViewer",
      maximumLevel: 7
    }));
    radar3d.alpha = 0.65;
    reqRender();
    updateStatus();
  }

  window.DNXWeather2D3D = {
    open: open,
    go: go,
    setBase: function (k) {
      if (!BASEMAPS[k]) return;
      state.base = k;
      save();
      var sel = win && win.querySelector("#dnx-w-base");
      if (sel) sel.value = k;
      setBaseMap();
    },
    setMode: function (m) {
      if (m !== "2d" && m !== "3d" && m !== "both") return;
      state.mode = m;
      save();
      applyMode();
    },
    setRadar: function (on) {
      state.radar = !!on;
      save();
      var cb = win && win.querySelector("#dnx-w-radar");
      if (cb) cb.checked = state.radar;
      setRadar();
    },
    getState: function () { return Object.assign({}, state); },
    getViewer: function () { return viewer; },
    getMap: function () { return map; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", launch, { once: true });
  } else {
    launch();
  }
  window.addEventListener("load", function () { setTimeout(launch, 500); });
})();
