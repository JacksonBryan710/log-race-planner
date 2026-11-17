(() => {
  "use strict";

  const COURSE = window.LOG_RACE_COURSE;
  const R_NM = 3440.065;          // mean Earth radius in nautical miles
  const MPH_PER_KT = 1.150779;
  const STORE_KEY = "log-race-planner-v1";
  const SVG_NS = "http://www.w3.org/2000/svg";

  // ---------- math ----------
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const norm360 = (d) => ((d % 360) + 360) % 360;
  const ddmToDec = ([deg, min]) => deg + min / 60;

  /** Rhumb-line (constant compass heading) distance in nm and true course in degrees. */
  function rhumb(a, b) {
    const p1 = toRad(a.lat), p2 = toRad(b.lat);
    const dp = p2 - p1;
    const dl = toRad(b.lon - a.lon);
    const ds = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
    const q = Math.abs(ds) > 1e-12 ? dp / ds : Math.cos(p1);
    return {
      nm: Math.sqrt(dp * dp + q * q * dl * dl) * R_NM,
      trueCourse: norm360(toDeg(Math.atan2(dl, ds)))
    };
  }

  // ---------- formatting ----------
  const fmtCourse = (d) => String(Math.round(d) % 360).padStart(3, "0") + "°";
  const fmtNm = (n) => n.toFixed(2);
  function fmtMinSec(min) {
    const s = Math.round(min * 60);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function decToDdm(dec) {
    const a = Math.abs(dec);
    let d = Math.floor(a);
    let m = Math.round((a - d) * 60 * 100) / 100;
    if (m >= 60) { d += 1; m = 0; }
    return { d, m };
  }
  const fmtLat = (lat) => { const { d, m } = decToDdm(lat); return `${lat >= 0 ? "N" : "S"}${d}° ${m.toFixed(2)}′`; };
  const fmtLon = (lon) => { const { d, m } = decToDdm(lon); return `${lon < 0 ? "W" : "E"}${d}° ${m.toFixed(2)}′`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- state ----------
  function defaultMarks() {
    const out = {};
    COURSE.marks.forEach((m) => { out[m.id] = { lat: ddmToDec(m.lat), lon: -ddmToDec(m.lon) }; });
    return out;
  }
  const defaults = () => ({
    mph: 20,
    variation: COURSE.defaultVariationW, // degrees, positive = West
    varDir: "W",
    varAuto: true,      // calculate variation from the marks with WMM2025
    startSec: 0,
    roundSec: 0,
    marks: defaultMarks()
  });

  let state = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.marks) state = { ...state, ...saved, marks: { ...state.marks, ...saved.marks } };
  } catch (_) { /* storage unavailable */ }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
  }

  const markInfo = (id) => COURSE.marks.find((m) => m.id === id);
  const raceDate = new Date(COURSE.raceDate || Date.now());

  /** Center of the course marks, used as the point for the magnetic model. */
  function courseCenter() {
    const pts = Object.values(state.marks);
    return {
      lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
      lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length
    };
  }

  /** WMM2025 variation at the course center, positive = West. Null if the model is unavailable. */
  function modelVariationW() {
    if (!window.WMM) return null;
    const { lat, lon } = courseCenter();
    const decl = window.WMM.declination(lat, lon, 0, window.WMM.decimalYear(raceDate));
    return Number.isFinite(decl) ? -decl : null;
  }

  function signedVariationW() {
    if (state.varAuto) {
      const v = modelVariationW();
      if (v !== null) return v;
    }
    return (state.varDir === "E" ? -1 : 1) * (Number(state.variation) || 0);
  }

  // ---------- core computation ----------
  function compute() {
    const mph = Math.max(Number(state.mph) || 0, 0);
    const kt = mph / MPH_PER_KT;
    const varW = signedVariationW();
    const steps = COURSE.course;
    let elapsed = 0, totalNm = 0;
    const legs = steps.slice(1).map((step, i) => {
      const fromStep = steps[i];
      const a = state.marks[fromStep.mark], b = state.marks[step.mark];
      const { nm, trueCourse } = rhumb(a, b);
      const magnetic = norm360(trueCourse + varW);
      let min = kt > 0 ? (nm / kt) * 60 : 0;
      if (i === 0) min += (Number(state.startSec) || 0) / 60;
      if (step.rounding) min += (Number(state.roundSec) || 0) / 60;
      elapsed += min;
      totalNm += nm;
      return {
        n: i + 1, from: fromStep.mark, to: step.mark, rounding: step.rounding || null,
        nm, mi: nm * MPH_PER_KT, trueCourse, magnetic, min, elapsed
      };
    });
    return { mph, kt, varW, legs, totalNm, totalMin: elapsed };
  }

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    mph: $("in-mph"), variation: $("in-var"), varDir: $("in-vardir"),
    startSec: $("in-startsec"), roundSec: $("in-roundsec"),
    kt: $("out-kt"), predicted: $("out-predicted"), exact: $("out-exact"), totalNm: $("out-total-nm"), totalMi: $("out-total-mi"),
    legBody: $("leg-body"), cardBody: $("card-body"), cardMeta: $("card-meta"), cardTotal: $("card-total"),
    plot: $("plot"), coordBody: $("coord-body"),
    reset: $("btn-reset"), copy: $("btn-copy"), print: $("btn-print"), copyStatus: $("copy-status"),
    varLabel: $("var-label"), varAuto: $("in-varauto"), varHint: $("var-hint")
  };

  /** Show the model value in the variation field while auto mode is on. */
  function syncVariationField(varW) {
    el.varAuto.checked = !!state.varAuto;
    el.variation.disabled = el.varDir.disabled = !!state.varAuto;
    if (state.varAuto) {
      el.variation.value = Math.abs(varW).toFixed(1);
      el.varDir.value = varW >= 0 ? "W" : "E";
      const yr = window.WMM ? window.WMM.decimalYear(raceDate) : 0;
      el.varHint.textContent = window.WMM && yr > window.WMM.VALID_UNTIL
        ? "WMM2025 has expired for this date. Enter variation from your chart."
        : `WMM2025 at the course center, ${raceDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      el.varHint.textContent = "Check the compass rose on your chart";
    }
  }

  // ---------- render: numbers ----------
  function renderNumbers(r) {
    el.kt.textContent = r.kt.toFixed(1);
    el.predicted.textContent = r.mph > 0 ? Math.round(r.totalMin) : "—";
    el.exact.textContent = r.mph > 0 ? `${fmtMinSec(r.totalMin)} (${r.totalMin.toFixed(1)} min)` : "Enter a speed";
    el.totalNm.textContent = fmtNm(r.totalNm);
    el.totalMi.textContent = (r.totalNm * MPH_PER_KT).toFixed(2);
    el.varLabel.textContent = `${Math.abs(r.varW).toFixed(1)}° ${r.varW >= 0 ? "W" : "E"}`;

    el.legBody.innerHTML = r.legs.map((l) => {
      const to = markInfo(l.to);
      const round = l.rounding ? `<span class="pill pill-${l.rounding}">${l.rounding === "port" ? "Port" : "Stbd"}</span>` : `<span class="pill pill-line">Line</span>`;
      return `<tr>
        <td class="num">${l.n}</td>
        <td><span class="leg-to">${esc(markInfo(l.from).name)} → ${esc(to.name)}</span> ${round}</td>
        <td class="num strong">${fmtCourse(l.magnetic)}M</td>
        <td class="num muted">${fmtCourse(l.trueCourse)}T</td>
        <td class="num">${fmtNm(l.nm)}</td>
        <td class="num muted">${l.mi.toFixed(2)}</td>
        <td class="num">${r.mph > 0 ? fmtMinSec(l.min) : "—"}</td>
        <td class="num">${r.mph > 0 ? fmtMinSec(l.elapsed) : "—"}</td>
      </tr>`;
    }).join("");

    el.cardMeta.textContent = `${r.mph.toFixed(1)} mph (${r.kt.toFixed(1)} kt) · variation ${Math.abs(r.varW).toFixed(1)}° ${r.varW >= 0 ? "W" : "E"}`;
    el.cardBody.innerHTML = r.legs.map((l) => {
      const to = markInfo(l.to);
      const side = l.rounding ? `leave to ${l.rounding}` : "cross the line";
      return `<li class="card-leg">
        <span class="card-n">${l.n}</span>
        <span class="card-course">${fmtCourse(l.magnetic)}<small>M</small></span>
        <span class="card-to"><b>${esc(to.name)}</b><br><span class="muted">${side} · ${fmtNm(l.nm)} nm</span></span>
        <span class="card-time">${r.mph > 0 ? fmtMinSec(l.elapsed) : "—"}</span>
      </li>`;
    }).join("");
    el.cardTotal.textContent = r.mph > 0 ? `${Math.round(r.totalMin)} min` : "—";
  }

  function cardText(r) {
    const lines = [
      `${COURSE.title.toUpperCase()} · HELM CARD`,
      `${r.mph.toFixed(1)} mph (${r.kt.toFixed(1)} kt) · variation ${Math.abs(r.varW).toFixed(1)}°${r.varW >= 0 ? "W" : "E"}`,
      ""
    ];
    r.legs.forEach((l) => {
      const to = markInfo(l.to).name;
      const side = l.rounding ? `leave to ${l.rounding}` : "finish line";
      lines.push(`Leg ${l.n}: steer ${fmtCourse(l.magnetic)}M to ${to} (${side}) · ${fmtNm(l.nm)} nm · elapsed ${fmtMinSec(l.elapsed)}`);
    });
    lines.push("", `Total ${fmtNm(r.totalNm)} nm · predicted elapsed ${Math.round(r.totalMin)} min (${r.totalMin.toFixed(1)})`);
    return lines.join("\n");
  }

  // ---------- render: plot ----------
  let proj = null;      // frozen during a drag so the chart does not shift under the pointer
  let dragging = null;

  function makeProjection() {
    const pts = Object.values(state.marks);
    let latMin = Math.min(...pts.map((p) => p.lat)), latMax = Math.max(...pts.map((p) => p.lat));
    let lonMin = Math.min(...pts.map((p) => p.lon)), lonMax = Math.max(...pts.map((p) => p.lon));
    const pad = 1.4 / 60; // 1.4 minutes
    latMin -= pad; latMax += pad; lonMin -= pad * 1.6; lonMax += pad * 1.6;
    const kx = Math.cos(toRad((latMin + latMax) / 2));
    // keep the chart from getting too narrow
    const minAspect = 0.62;
    const wDeg = (lonMax - lonMin) * kx, hDeg = latMax - latMin;
    if (wDeg / hDeg < minAspect) {
      const extra = (minAspect * hDeg / kx - (lonMax - lonMin)) / 2;
      lonMin -= extra; lonMax += extra;
    }
    const W = 440;
    const S = W / ((lonMax - lonMin) * kx);
    const H = (latMax - latMin) * S;
    return {
      W, H, S, kx, latMin, latMax, lonMin, lonMax,
      x: (lon) => (lon - lonMin) * kx * S,
      y: (lat) => (latMax - lat) * S,
      lon: (x) => lonMin + x / (kx * S),
      lat: (y) => latMax - y / S
    };
  }

  function renderPlot(r) {
    if (!dragging || !proj) proj = makeProjection();
    const P = proj;
    const svg = el.plot;
    svg.setAttribute("viewBox", `0 0 ${P.W} ${P.H.toFixed(1)}`);
    const parts = [];

    // grid: every minute of longitude, every minute (or 2) of latitude
    parts.push(`<rect class="water" x="0" y="0" width="${P.W}" height="${P.H}"/>`);
    const latStep = (P.latMax - P.latMin) * 60 > 12 ? 2 : 1;
    for (let m = Math.ceil(P.latMin * 60 / latStep) * latStep; m <= P.latMax * 60; m += latStep) {
      const y = P.y(m / 60);
      const { d, m: mm } = decToDdm(m / 60);
      parts.push(`<line class="grid" x1="0" x2="${P.W}" y1="${y}" y2="${y}"/>`);
      if (y < P.H - 20) parts.push(`<text class="grid-label" x="4" y="${y - 3}">${d}°${Math.round(mm)}′N</text>`);
    }
    const minPx = P.S / 60 * P.kx; // screen width of 1′ of longitude
    const lonLabelEvery = Math.ceil(56 / minPx);
    for (let m = Math.ceil(P.lonMin * 60); m <= P.lonMax * 60; m += 1) {
      const x = P.x(m / 60);
      const { d, m: mm } = decToDdm(m / 60);
      parts.push(`<line class="grid" y1="0" y2="${P.H}" x1="${x}" x2="${x}"/>`);
      if (Math.abs(m) % lonLabelEvery === 0) parts.push(`<text class="grid-label" x="${x + 3}" y="${P.H - 5}">${d}°${Math.round(mm)}′W</text>`);
    }

    // legs, offset to starboard of travel so out-and-back legs separate
    const pos = (id) => ({ x: P.x(state.marks[id].lon), y: P.y(state.marks[id].lat) });
    const legKeys = new Set(r.legs.map((l) => `${l.from}>${l.to}`));
    r.legs.forEach((l) => {
      const a = pos(l.from), b = pos(l.to);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len; // left-hand normal in screen space
      const off = legKeys.has(`${l.to}>${l.from}`) ? -5 : 0; // negative = right of travel
      const ax = a.x + nx * off, ay = a.y + ny * off, bx = b.x + nx * off, by = b.y + ny * off;
      // shorten so arrowheads stop at the mark symbol
      const trim = Math.min(11, len / 3);
      const sx = ax + (dx / len) * trim, sy = ay + (dy / len) * trim;
      const ex = bx - (dx / len) * trim, ey = by - (dy / len) * trim;
      parts.push(`<line class="leg" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" marker-end="url(#arrow)"/>`);
      const lo = off ? -18 : -16;
      const mx = (ax + bx) / 2 + nx * lo, my = (ay + by) / 2 + ny * lo;
      const anchor = nx * lo > 4 ? "start" : nx * lo < -4 ? "end" : "middle";
      const tx = mx + (anchor === "start" ? 12 : anchor === "end" ? -12 : 0);
      const ty = my + (anchor === "middle" ? (ny * lo > 0 ? 22 : -14) : 4);
      parts.push(`<g class="leg-tag"><circle cx="${mx}" cy="${my}" r="9"/><text x="${mx}" y="${my + 3.5}" text-anchor="middle">${l.n}</text></g>`);
      // short legs only get the number badge; their courses are in the table
      if (len > 90) parts.push(`<text class="leg-label" x="${tx}" y="${ty}" text-anchor="${anchor}">${fmtCourse(l.magnetic)}M · ${fmtNm(l.nm)}</text>`);
    });

    // marks
    COURSE.marks.forEach((m) => {
      const { x, y } = pos(m.id);
      let sym;
      if (m.kind === "red") sym = `<path class="sym-red" d="M${x} ${y - 9} L${x + 8} ${y + 6} L${x - 8} ${y + 6} Z"/>`;
      else if (m.kind === "green") sym = `<rect class="sym-green" x="${x - 7}" y="${y - 7}" width="14" height="14"/>`;
      else if (m.kind === "buoy") sym = `<circle class="sym-buoy" cx="${x}" cy="${y}" r="7.5"/>`;
      else sym = `<circle class="sym-line" cx="${x}" cy="${y}" r="7.5"/><circle class="sym-line-dot" cx="${x}" cy="${y}" r="2.5"/>`;
      // put the label on the side away from the nearest other mark
      let nearest = null, best = Infinity;
      COURSE.marks.forEach((o) => {
        if (o.id === m.id) return;
        const q = pos(o.id), dd = Math.hypot(q.x - x, q.y - y);
        if (dd < best) { best = dd; nearest = q; }
      });
      let right = !(nearest && best < 80 && nearest.x > x + 4);
      if (x > P.W - 90) right = false;
      if (x < 90) right = true;
      parts.push(`<g class="mark" data-mark="${m.id}" tabindex="0" role="button" aria-label="${esc(m.name)}, drag to move">
        <circle class="hit" cx="${x}" cy="${y}" r="18"/>${sym}
        <text class="mark-label" x="${right ? x + 13 : x - 13}" y="${y - 9}" text-anchor="${right ? "start" : "end"}">${esc(m.name)}</text>
      </g>`);
    });

    // compass rose: true north and magnetic north
    const cx = P.W - 46, cy = 52, rr = 30;
    const magRot = -r.varW; // west variation: magnetic north lies west of true
    parts.push(`<g class="rose">
      <circle cx="${cx}" cy="${cy}" r="${rr}"/>
      <line x1="${cx}" y1="${cy + rr}" x2="${cx}" y2="${cy - rr - 6}" class="rose-true"/>
      <text x="${cx}" y="${cy - rr - 9}" text-anchor="middle" class="rose-t">T</text>
      <g transform="rotate(${magRot} ${cx} ${cy})">
        <path d="M${cx} ${cy - rr + 2} L${cx + 5} ${cy} L${cx} ${cy - 4} L${cx - 5} ${cy} Z" class="rose-mag"/>
      </g>
      <text x="${cx}" y="${cy + rr + 14}" text-anchor="middle" class="rose-v">VAR ${Math.abs(r.varW).toFixed(1)}°${r.varW >= 0 ? "W" : "E"}</text>
    </g>`);

    // scale bar: 1 nautical mile = 1 minute of latitude
    const nmPx = P.S / 60, sbx = P.W - 16 - nmPx, sby = P.H - 26;
    parts.push(`<g class="scale"><line x1="${sbx}" x2="${sbx + nmPx}" y1="${sby}" y2="${sby}"/>
      <line x1="${sbx}" x2="${sbx}" y1="${sby - 4}" y2="${sby + 4}"/><line x1="${sbx + nmPx}" x2="${sbx + nmPx}" y1="${sby - 4}" y2="${sby + 4}"/>
      <text x="${sbx + nmPx / 2}" y="${sby - 7}" text-anchor="middle">1 nm</text></g>`);

    svg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arrow-head"/></marker></defs>` + parts.join("");
  }

  // ---------- coordinate editor ----------
  function buildCoordTable() {
    el.coordBody.innerHTML = COURSE.marks.map((m) => `<tr data-row="${m.id}">
      <th scope="row">${esc(m.name)}<span class="coord-detail">${esc(m.detail)}</span></th>
      <td><div class="ddm"><span>N</span>
        <input id="c-${m.id}-latd" type="number" inputmode="numeric" step="1" min="0" max="89" aria-label="${esc(m.name)} latitude degrees">°
        <input id="c-${m.id}-latm" type="number" inputmode="decimal" step="0.01" min="0" max="59.99" aria-label="${esc(m.name)} latitude minutes">′</div></td>
      <td><div class="ddm"><span>W</span>
        <input id="c-${m.id}-lond" type="number" inputmode="numeric" step="1" min="0" max="179" aria-label="${esc(m.name)} longitude degrees">°
        <input id="c-${m.id}-lonm" type="number" inputmode="decimal" step="0.01" min="0" max="59.99" aria-label="${esc(m.name)} longitude minutes">′</div></td>
      <td><a id="c-${m.id}-map" target="_blank" rel="noopener">Map ↗</a></td>
    </tr>`).join("");

    COURSE.marks.forEach((m) => {
      ["latd", "latm", "lond", "lonm"].forEach((f) => {
        $(`c-${m.id}-${f}`).addEventListener("input", () => {
          const ld = Number($(`c-${m.id}-latd`).value), lm = Number($(`c-${m.id}-latm`).value);
          const od = Number($(`c-${m.id}-lond`).value), om = Number($(`c-${m.id}-lonm`).value);
          if ([ld, lm, od, om].some((v) => !Number.isFinite(v))) return;
          state.marks[m.id] = { lat: ld + lm / 60, lon: -(od + om / 60) };
          update({ coords: false });
        });
      });
    });
  }

  function syncCoordInputs() {
    COURSE.marks.forEach((m) => {
      const p = state.marks[m.id];
      const la = decToDdm(p.lat), lo = decToDdm(p.lon);
      const set = (f, v) => { const i = $(`c-${m.id}-${f}`); if (document.activeElement !== i) i.value = v; };
      set("latd", la.d); set("latm", la.m.toFixed(2)); set("lond", lo.d); set("lonm", lo.m.toFixed(2));
      $(`c-${m.id}-map`).href = `https://www.openstreetmap.org/?mlat=${p.lat.toFixed(5)}&mlon=${p.lon.toFixed(5)}#map=15/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`;
      $(`c-${m.id}-map`).title = `${fmtLat(p.lat)} ${fmtLon(p.lon)}`;
    });
  }

  // ---------- update loop ----------
  function update({ coords = true } = {}) {
    const r = compute();
    syncVariationField(r.varW);
    renderNumbers(r);
    renderPlot(r);
    if (coords) syncCoordInputs();
    else COURSE.marks.forEach((m) => {
      const p = state.marks[m.id];
      $(`c-${m.id}-map`).href = `https://www.openstreetmap.org/?mlat=${p.lat.toFixed(5)}&mlon=${p.lon.toFixed(5)}#map=15/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`;
    });
    save();
    return r;
  }

  function syncInputs() {
    el.mph.value = state.mph;
    el.variation.value = state.variation;
    el.varDir.value = state.varDir;
    el.startSec.value = state.startSec;
    el.roundSec.value = state.roundSec;
  }

  // ---------- events ----------
  [["mph", "mph"], ["variation", "variation"], ["startSec", "startSec"], ["roundSec", "roundSec"]].forEach(([k, key]) => {
    el[k].addEventListener("input", () => { state[key] = el[k].value === "" ? 0 : Number(el[k].value); update(); });
  });
  el.varDir.addEventListener("change", () => { state.varDir = el.varDir.value; update(); });
  el.varAuto.addEventListener("change", () => {
    if (!el.varAuto.checked) {
      // start manual mode from the model value so nothing jumps
      const v = signedVariationW();
      state.variation = Number(Math.abs(v).toFixed(1));
      state.varDir = v >= 0 ? "W" : "E";
    }
    state.varAuto = el.varAuto.checked;
    update();
  });

  el.reset.addEventListener("click", () => {
    state.marks = defaultMarks();
    proj = null;
    update();
  });

  el.copy.addEventListener("click", () => {
    const text = cardText(compute());
    const done = (msg) => { el.copyStatus.textContent = msg; setTimeout(() => { el.copyStatus.textContent = ""; }, 2500); };
    try {
      navigator.clipboard.writeText(text).then(() => done("Copied"), () => fallbackCopy(text, done));
    } catch (_) { fallbackCopy(text, done); }
  });
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.className = "copy-fallback";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { /* ignore */ }
    ta.remove();
    done(ok ? "Copied" : "Copy blocked. Select the card text instead.");
  }

  // Printing works on a normal web page but not inside an embedded frame.
  const embedded = (() => { try { return window.self !== window.top; } catch (_) { return true; } })();
  if (embedded) el.print.hidden = true;
  el.print.addEventListener("click", () => window.print());

  // dragging marks on the plot
  function svgPoint(evt) {
    const pt = el.plot.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(el.plot.getScreenCTM().inverse());
  }
  el.plot.addEventListener("pointerdown", (e) => {
    const g = e.target.closest && e.target.closest("[data-mark]");
    if (!g) return;
    dragging = g.getAttribute("data-mark");
    el.plot.setPointerCapture(e.pointerId);
    el.plot.classList.add("is-dragging");
    e.preventDefault();
  });
  el.plot.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = svgPoint(e);
    const x = Math.min(Math.max(p.x, 0), proj.W), y = Math.min(Math.max(p.y, 0), proj.H);
    state.marks[dragging] = { lat: proj.lat(y), lon: proj.lon(x) };
    update();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = null;
    el.plot.classList.remove("is-dragging");
    proj = null;
    update();
  };
  el.plot.addEventListener("pointerup", endDrag);
  el.plot.addEventListener("pointercancel", endDrag);

  // ---------- boot ----------
  buildCoordTable();
  syncInputs();
  update();

  // expose for testing in the console
  window.LogRacePlanner = { rhumb, compute: () => compute(), cardText: () => cardText(compute()) };
})();
