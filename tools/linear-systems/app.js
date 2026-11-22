/* ------------------------------------------------------------------ *
 * Setup and state
 * ------------------------------------------------------------------ */
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

let seeds = [];   // initial conditions added by clicking
let box;          // plot geometry from the last draw(), used for click handling
const ids = ['a', 'b', 'c', 'd'];

// Matrix entries from the form; blank fields become NaN
function matrix() {
  return ids.map(id => $(id).value.trim() === '' ? NaN : Number($(id).value));
}

/* ------------------------------------------------------------------ *
 * Classification of the equilibrium at the origin
 * ------------------------------------------------------------------ */
function info([a, b, c, d]) {
  const t = a + d;                          // trace
  const det = a * d - b * c;                // determinant
  const disc = (a - d) ** 2 + 4 * b * c;    // discriminant of the characteristic polynomial
  const eps = 1e-9 * Math.max(1, a * a, b * b, c * c, d * d);
  let kind;

  if (Math.abs(det) < eps) {
    // A nonzero singular 2x2 matrix has a line of equilibrium points.
    kind = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) < 1e-10
      ? 'Entire plane of equilibria'
      : 'Line of equilibria';
  } else if (det < 0) {
    kind = 'Saddle';
  } else if (disc < -eps) {
    kind = Math.abs(t) < 1e-9 ? 'Center' : t < 0 ? 'Stable spiral' : 'Unstable spiral';
  } else if (Math.abs(disc) <= eps) {
    // Repeated eigenvalue: a scalar matrix is a star; otherwise defective.
    kind = Math.abs(a - d) < Math.sqrt(eps) && Math.abs(b) < Math.sqrt(eps) && Math.abs(c) < Math.sqrt(eps)
      ? 'Star'
      : 'Degenerate node';
  } else {
    kind = t < 0 ? 'Stable node' : 'Unstable node';
  }

  const fmt = x => Math.abs(x) < 1e-10 ? '0' : Number(x.toPrecision(4)).toString();
  return { t, det, disc, kind, fmt };
}

/* ------------------------------------------------------------------ *
 * Main draw: grid, eigendirections, direction field, trajectories
 * ------------------------------------------------------------------ */
function draw() {
  // ---- Read and validate the matrix and sliders ----
  const A = matrix();
  if (A.some(x => !Number.isFinite(x) || Math.abs(x) > 1e6)) {
    $('error').textContent = 'Enter four finite matrix entries between −1,000,000 and 1,000,000.';
    return;
  }
  $('error').textContent = '';

  const [a, b, c, d] = A;
  const L = +$('L').value;     // window half-width
  const h = +$('h').value;     // grid spacing
  $('lv').textContent = L;
  $('hv').textContent = h;

  // ---- Canvas setup ----
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const dpr = devicePixelRatio || 1;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Pixels per unit, and the pixel position of the origin
  const s = (Math.min(W, H) - 56) / (2 * L);
  const cx = W / 2;
  const cy = H / 2;
  box = { s, cx, cy, L };

  // Math coordinates -> canvas pixels
  const p = (x, y) => [cx + x * s, cy - y * s];

  function line(x, y, X, Y, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...p(x, y));
    ctx.lineTo(...p(X, Y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  // Arrow from (x, y) to (x + u, y + v)
  function arrow(x, y, u, v, color, width = 1.5) {
    const [px, py] = p(x, y);
    const [qx, qy] = p(x + u, y + v);
    const ang = Math.atan2(qy - py, qx - px);
    const len = Math.hypot(qx - px, qy - py);
    if (len < 0.1) return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(qx, qy);
    ctx.stroke();

    const z = Math.min(5, len * .4);
    ctx.beginPath();
    ctx.moveTo(qx, qy);
    ctx.lineTo(qx - z * Math.cos(ang - .5), qy - z * Math.sin(ang - .5));
    ctx.lineTo(qx - z * Math.cos(ang + .5), qy - z * Math.sin(ang + .5));
    ctx.fill();
  }

  // ---- Grid, axes, and labels ----
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#819187';
  for (let j = -L; j <= L; j++) {
    line(j, -L, j, L, '#edf0ea');
    line(-L, j, L, j, '#edf0ea');
    if (j) {
      ctx.fillText(j, cx + j * s - 4, cy + 16);
      ctx.fillText(j, cx + 7, cy - j * s + 4);
    }
  }
  line(-L, 0, L, 0, '#a5b5a9');
  line(0, -L, 0, L, '#a5b5a9');

  ctx.fillStyle = '#38574a';
  ctx.font = 'italic 16px Georgia';
  ctx.fillText('x', cx + L * s + 12, cy + 5);
  ctx.fillText('y', cx + 8, cy - L * s - 12);

  // ---- Classification and eigenvalue readout ----
  const meta = info(A);
  $('kind').textContent = meta.kind;

  const eig = meta.disc >= 0
    ? [(meta.t + Math.sqrt(meta.disc)) / 2, (meta.t - Math.sqrt(meta.disc)) / 2]
    : null;
  $('eig').textContent = eig
    ? 'λ₁ = ' + meta.fmt(eig[0]) + '     λ₂ = ' + meta.fmt(eig[1])
    : 'λ = ' + meta.fmt(meta.t / 2) + ' ± ' + meta.fmt(Math.sqrt(-meta.disc) / 2) + 'i';

  // Everything below is clipped to the plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - L * s, cy - L * s, 2 * L * s, 2 * L * s);
  ctx.clip();

  // ---- Real eigendirections (dashed lines) ----
  if ($('eigen').checked && eig) {
    for (const lam of eig) {
      // Pick the better-conditioned of the two eigenvector formulas
      let v = Math.abs(b) + Math.abs(lam - a) > Math.abs(lam - d) + Math.abs(c)
        ? [b, lam - a]
        : [lam - d, c];
      const norm = Math.hypot(...v);
      if (norm > 1e-12) {
        v = v.map(x => x / norm);
        ctx.setLineDash([6, 5]);
        line(-v[0] * L * 3, -v[1] * L * 3, v[0] * L * 3, v[1] * L * 3, '#99af72', 1.5);
        ctx.setLineDash([]);
      }
    }
  }

  // ---- Direction field ----
  // Largest vector length on the grid (used to scale arrows when not normalized)
  let maxM = 0;
  for (let x = -L; x <= L + 1e-8; x += h) {
    for (let y = -L; y <= L + 1e-8; y += h) {
      maxM = Math.max(maxM, Math.hypot(a * x + b * y, c * x + d * y));
    }
  }

  for (let x = -L; x <= L + 1e-8; x += h) {
    for (let y = -L; y <= L + 1e-8; y += h) {
      const u = a * x + b * y;
      const v = c * x + d * y;
      const m = Math.hypot(u, v);
      if (m > 1e-12) {
        const scale = .6 * h / ($('normalized').checked ? m : maxM);
        arrow(x, y, u * scale, v * scale, '#6a91a4');
      }
    }
  }

  // ---- Trajectories (fixed-step RK4 for x' = Ax) ----
  const f = ([x, y]) => [a * x + b * y, c * x + d * y];
  const add = (v, k, factor) => v.map((q, i) => q + factor * k[i]);
  const dt = .025 / Math.max(1, Math.abs(a) + Math.abs(b), Math.abs(c) + Math.abs(d));

  function step(v, t) {
    const k1 = f(v);
    const k2 = f(add(v, k1, t / 2));
    const k3 = f(add(v, k2, t / 2));
    const k4 = f(add(v, k3, t));
    return v.map((q, i) => q + t * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }

  for (const seed of seeds) {
    for (const sign of [-1, 1]) {            // backward, then forward in time
      let v = [...seed];
      ctx.beginPath();
      ctx.moveTo(...p(...v));
      ctx.strokeStyle = '#c17443';
      ctx.lineWidth = 2;

      for (let i = 0; i < 5000; i++) {
        const next = step(v, dt * sign);
        if (!next.every(Number.isFinite) || Math.max(...next.map(Math.abs)) > L * 1.1) break;
        ctx.lineTo(...p(...next));
        if (Math.hypot(next[0] - v[0], next[1] - v[1]) < 1e-8) break;
        v = next;
      }
      ctx.stroke();
    }

    // Dot at the initial condition
    ctx.fillStyle = '#c17443';
    ctx.beginPath();
    ctx.arc(...p(...seed), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Forward-time arrowhead, 30 steps along the trajectory
    let v = seed;
    for (let i = 0; i < 30; i++) v = step(v, dt);
    const vel = f(v);
    const n = Math.hypot(...vel);
    if (n > 1e-8) arrow(...v, vel[0] / n * 10 / s, vel[1] / n * 10 / s, '#c17443', 2);
  }

  ctx.restore();

  // Origin marker
  ctx.fillStyle = '#365b4b';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
  ctx.fill();
}

/* ------------------------------------------------------------------ *
 * Event wiring
 * ------------------------------------------------------------------ */
for (const id of [...ids, 'h', 'L', 'normalized', 'eigen']) {
  $(id).addEventListener('input', draw);
}

$('preset').onchange = () => {
  const vals = $('preset').value.split(',');
  ids.forEach((id, i) => { $(id).value = vals[i]; });
  seeds = [];
  draw();
};

$('clear').onclick = () => {
  seeds = [];
  draw();
};

// Click the plot to add an initial condition
canvas.onclick = e => {
  if (!box) return;
  const r = canvas.getBoundingClientRect();
  const { cx, cy, s, L } = box;
  const x = (e.clientX - r.left - cx) / s;
  const y = -(e.clientY - r.top - cy) / s;

  if (Math.abs(x) <= L && Math.abs(y) <= L) {
    seeds.push([x, y]);
    draw();
  }
};

new ResizeObserver(draw).observe(canvas);
draw();
