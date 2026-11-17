/*
 * World Magnetic Model 2025 (WMM2025), valid 2025.0 to 2030.0.
 * Coefficients: NOAA NCEI / British Geological Survey, public domain.
 * Source file: WMM.COF from https://www.ncei.noaa.gov/products/world-magnetic-model
 * Port of the spherical-harmonic synthesis in NOAA's geomag.c.
 */
window.WMM = (() => {
  "use strict";
  const EPOCH = 2025.0;
  const MODEL = "WMM-2025";
  // n, m, g(n,m), h(n,m), dg/dt, dh/dt  (nT, nT/year)
  const COEFFS = [
    [1,0,-29351.8,0.0,12.0,0.0],
    [1,1,-1410.8,4545.4,9.7,-21.5],
    [2,0,-2556.6,0.0,-11.6,0.0],
    [2,1,2951.1,-3133.6,-5.2,-27.7],
    [2,2,1649.3,-815.1,-8.0,-12.1],
    [3,0,1361.0,0.0,-1.3,0.0],
    [3,1,-2404.1,-56.6,-4.2,4.0],
    [3,2,1243.8,237.5,0.4,-0.3],
    [3,3,453.6,-549.5,-15.6,-4.1],
    [4,0,895.0,0.0,-1.6,0.0],
    [4,1,799.5,278.6,-2.4,-1.1],
    [4,2,55.7,-133.9,-6.0,4.1],
    [4,3,-281.1,212.0,5.6,1.6],
    [4,4,12.1,-375.6,-7.0,-4.4],
    [5,0,-233.2,0.0,0.6,0.0],
    [5,1,368.9,45.4,1.4,-0.5],
    [5,2,187.2,220.2,0.0,2.2],
    [5,3,-138.7,-122.9,0.6,0.4],
    [5,4,-142.0,43.0,2.2,1.7],
    [5,5,20.9,106.1,0.9,1.9],
    [6,0,64.4,0.0,-0.2,0.0],
    [6,1,63.8,-18.4,-0.4,0.3],
    [6,2,76.9,16.8,0.9,-1.6],
    [6,3,-115.7,48.8,1.2,-0.4],
    [6,4,-40.9,-59.8,-0.9,0.9],
    [6,5,14.9,10.9,0.3,0.7],
    [6,6,-60.7,72.7,0.9,0.9],
    [7,0,79.5,0.0,-0.0,0.0],
    [7,1,-77.0,-48.9,-0.1,0.6],
    [7,2,-8.8,-14.4,-0.1,0.5],
    [7,3,59.3,-1.0,0.5,-0.8],
    [7,4,15.8,23.4,-0.1,0.0],
    [7,5,2.5,-7.4,-0.8,-1.0],
    [7,6,-11.1,-25.1,-0.8,0.6],
    [7,7,14.2,-2.3,0.8,-0.2],
    [8,0,23.2,0.0,-0.1,0.0],
    [8,1,10.8,7.1,0.2,-0.2],
    [8,2,-17.5,-12.6,0.0,0.5],
    [8,3,2.0,11.4,0.5,-0.4],
    [8,4,-21.7,-9.7,-0.1,0.4],
    [8,5,16.9,12.7,0.3,-0.5],
    [8,6,15.0,0.7,0.2,-0.6],
    [8,7,-16.8,-5.2,-0.0,0.3],
    [8,8,0.9,3.9,0.2,0.2],
    [9,0,4.6,0.0,-0.0,0.0],
    [9,1,7.8,-24.8,-0.1,-0.3],
    [9,2,3.0,12.2,0.1,0.3],
    [9,3,-0.2,8.3,0.3,-0.3],
    [9,4,-2.5,-3.3,-0.3,0.3],
    [9,5,-13.1,-5.2,0.0,0.2],
    [9,6,2.4,7.2,0.3,-0.1],
    [9,7,8.6,-0.6,-0.1,-0.2],
    [9,8,-8.7,0.8,0.1,0.4],
    [9,9,-12.9,10.0,-0.1,0.1],
    [10,0,-1.3,0.0,0.1,0.0],
    [10,1,-6.4,3.3,0.0,0.0],
    [10,2,0.2,0.0,0.1,-0.0],
    [10,3,2.0,2.4,0.1,-0.2],
    [10,4,-1.0,5.3,-0.0,0.1],
    [10,5,-0.6,-9.1,-0.3,-0.1],
    [10,6,-0.9,0.4,0.0,0.1],
    [10,7,1.5,-4.2,-0.1,0.0],
    [10,8,0.9,-3.8,-0.1,-0.1],
    [10,9,-2.7,0.9,-0.0,0.2],
    [10,10,-3.9,-9.1,-0.0,-0.0],
    [11,0,2.9,0.0,0.0,0.0],
    [11,1,-1.5,0.0,-0.0,-0.0],
    [11,2,-2.5,2.9,0.0,0.1],
    [11,3,2.4,-0.6,0.0,-0.0],
    [11,4,-0.6,0.2,0.0,0.1],
    [11,5,-0.1,0.5,-0.1,-0.0],
    [11,6,-0.6,-0.3,0.0,-0.0],
    [11,7,-0.1,-1.2,-0.0,0.1],
    [11,8,1.1,-1.7,-0.1,-0.0],
    [11,9,-1.0,-2.9,-0.1,0.0],
    [11,10,-0.2,-1.8,-0.1,0.0],
    [11,11,2.6,-2.3,-0.1,0.0],
    [12,0,-2.0,0.0,0.0,0.0],
    [12,1,-0.2,-1.3,0.0,-0.0],
    [12,2,0.3,0.7,-0.0,0.0],
    [12,3,1.2,1.0,-0.0,-0.1],
    [12,4,-1.3,-1.4,-0.0,0.1],
    [12,5,0.6,-0.0,-0.0,-0.0],
    [12,6,0.6,0.6,0.1,-0.0],
    [12,7,0.5,-0.1,-0.0,-0.0],
    [12,8,-0.1,0.8,0.0,0.0],
    [12,9,-0.4,0.1,0.0,-0.0],
    [12,10,-0.2,-1.0,-0.1,-0.0],
    [12,11,-1.3,0.1,-0.0,0.0],
    [12,12,-0.7,0.2,-0.1,-0.1]
  ];

  const MAXORD = 12;
  const A = 6378.137, B = 6356.7523142, RE = 6371.2; // WGS-84 ellipsoid, km
  const A2 = A * A, B2 = B * B, C2 = A2 - B2, A4 = A2 * A2, B4 = B2 * B2, C4 = A4 - B4;
  const N = MAXORD + 1;
  const grid = () => Array.from({ length: N }, () => new Float64Array(N));

  // Schmidt semi-normalized, time-varying coefficient tables (built once)
  const c = grid(), cd = grid(), k = grid();
  const snorm = new Float64Array(N * N);
  const fn = new Float64Array(N), fm = new Float64Array(N);
  COEFFS.forEach(([n, m, g, h, dg, dh]) => {
    c[m][n] = g; cd[m][n] = dg;
    if (m !== 0) { c[n][m - 1] = h; cd[n][m - 1] = dh; }
  });
  snorm[0] = 1;
  for (let n = 1; n <= MAXORD; n++) {
    snorm[n] = snorm[n - 1] * (2 * n - 1) / n;
    let j = 2;
    for (let m = 0; m <= n; m++) {
      k[m][n] = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
      if (m > 0) {
        const flnmj = ((n - m + 1) * j) / (n + m);
        snorm[n + m * N] = snorm[n + (m - 1) * N] * Math.sqrt(flnmj);
        j = 1;
        c[n][m - 1] *= snorm[n + m * N];
        cd[n][m - 1] *= snorm[n + m * N];
      }
      c[m][n] *= snorm[n + m * N];
      cd[m][n] *= snorm[n + m * N];
    }
    fn[n] = n + 1;
    fm[n] = n;
  }
  k[1][1] = 0;

  /**
   * Magnetic declination (variation) in degrees. East positive, west negative.
   * lat, lon: geodetic degrees (west longitude negative). altKm: height above the ellipsoid. year: decimal year.
   */
  function declination(lat, lon, altKm, year) {
    const dt = year - EPOCH;
    const rlat = lat * Math.PI / 180, rlon = lon * Math.PI / 180;
    const srlon = Math.sin(rlon), crlon = Math.cos(rlon);
    const srlat = Math.sin(rlat), crlat = Math.cos(rlat);
    const srlat2 = srlat * srlat, crlat2 = crlat * crlat;

    // geodetic to spherical coordinates
    const q = Math.sqrt(A2 - C2 * srlat2);
    const q1 = altKm * q;
    const q2 = ((q1 + A2) / (q1 + B2)) ** 2;
    const ct = srlat / Math.sqrt(q2 * crlat2 + srlat2);
    const st = Math.sqrt(1 - ct * ct);
    const r = Math.sqrt(altKm * altKm + 2 * q1 + (A4 - C4 * srlat2) / (q * q));
    const d = Math.sqrt(A2 * crlat2 + B2 * srlat2);
    const ca = (altKm + d) / r;
    const sa = C2 * crlat * srlat / (r * d);

    const sp = new Float64Array(N), cp = new Float64Array(N);
    sp[0] = 0; cp[0] = 1; sp[1] = srlon; cp[1] = crlon;
    for (let m = 2; m <= MAXORD; m++) {
      sp[m] = sp[1] * cp[m - 1] + cp[1] * sp[m - 1];
      cp[m] = cp[1] * cp[m - 1] - sp[1] * sp[m - 1];
    }

    const p = new Float64Array(N * N); p[0] = 1;
    const dp = grid();
    const pp = new Float64Array(N); pp[0] = 1;
    const aor = RE / r;
    let ar = aor * aor, br = 0, bt = 0, bp = 0, bpp = 0;

    for (let n = 1; n <= MAXORD; n++) {
      ar *= aor;
      for (let m = 0; m <= n; m++) {
        if (n === m) {
          p[n + m * N] = st * p[n - 1 + (m - 1) * N];
          dp[m][n] = st * dp[m - 1][n - 1] + ct * p[n - 1 + (m - 1) * N];
        } else if (n === 1 && m === 0) {
          p[n + m * N] = ct * p[n - 1 + m * N];
          dp[m][n] = ct * dp[m][n - 1] - st * p[n - 1 + m * N];
        } else {
          if (m > n - 2) { p[n - 2 + m * N] = 0; dp[m][n - 2] = 0; }
          p[n + m * N] = ct * p[n - 1 + m * N] - k[m][n] * p[n - 2 + m * N];
          dp[m][n] = ct * dp[m][n - 1] - st * p[n - 1 + m * N] - k[m][n] * dp[m][n - 2];
        }
        const tcmn = c[m][n] + dt * cd[m][n];
        const tcnm = m !== 0 ? c[n][m - 1] + dt * cd[n][m - 1] : 0;
        const par = ar * p[n + m * N];
        const temp1 = m === 0 ? tcmn * cp[m] : tcmn * cp[m] + tcnm * sp[m];
        const temp2 = m === 0 ? tcmn * sp[m] : tcmn * sp[m] - tcnm * cp[m];
        bt -= ar * temp1 * dp[m][n];
        bp += fm[m] * temp2 * par;
        br += fn[n] * temp1 * par;
        if (st === 0 && m === 1) { // geographic pole
          pp[n] = n === 1 ? pp[n - 1] : ct * pp[n - 1] - k[m][n] * pp[n - 2];
          bpp += ar * pp[n] * temp2;
        }
      }
    }
    bp = st === 0 ? bpp : bp / st;

    const bx = -bt * ca - br * sa; // north
    const by = bp;                 // east
    return Math.atan2(by, bx) * 180 / Math.PI;
  }

  /** Decimal year for a JS Date (UTC). */
  function decimalYear(date) {
    const y = date.getUTCFullYear();
    const start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
    return y + (date.getTime() - start) / (end - start);
  }

  return { declination, decimalYear, MODEL, EPOCH, VALID_UNTIL: EPOCH + 5 };
})();
