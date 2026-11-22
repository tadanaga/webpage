'use strict';

/* ------------------------------------------------------------------ *
 * Expression parser
 * A small arithmetic parser: expressions are never executed as JavaScript.
 * Grammar: sum -> product -> unary -> power -> atom
 * ------------------------------------------------------------------ */
function expression(source) {
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[a-zA-Z]+|[^\s]/g) || [];
  let i = 0;

  const funcs = Object.fromEntries(
    ['sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'abs', 'sinh', 'cosh', 'tanh']
      .map(n => [n, Math[n]])
  );

  function atom() {
    const t = tokens[i++];

    if (t === '(') {
      const v = sum();
      if (tokens[i++] !== ')') throw Error('Missing closing parenthesis.');
      return v;
    }
    if (t === 'x' || t === 'y') {
      return (x, y) => (t === 'x' ? x : y);
    }
    if (t === 'pi' || t === 'e') {
      return () => (t === 'pi' ? Math.PI : Math.E);
    }
    if (Object.hasOwn(funcs, t)) {
      if (tokens[i++] !== '(') throw Error('Functions need parentheses.');
      const a = sum();
      if (tokens[i++] !== ')') throw Error('Missing closing parenthesis.');
      return (x, y) => funcs[t](a(x, y));
    }
    if (t && /^(?:\d|\.\d)/.test(t)) {
      return () => Number(t);
    }
    throw Error('Use numbers, x, y, supported functions, and arithmetic operators.');
  }

  function power() {
    const a = atom();
    if (tokens[i] === '^') {
      i++;
      const b = unary();
      return (x, y) => a(x, y) ** b(x, y);
    }
    return a;
  }

  function unary() {
    if (tokens[i] === '+' || tokens[i] === '-') {
      const s = tokens[i++] === '-' ? -1 : 1;
      const a = unary();
      return (x, y) => s * a(x, y);
    }
    return power();
  }

  function product() {
    let a = unary();
    while (tokens[i] === '*' || tokens[i] === '/') {
      const op = tokens[i++];
      const l = a;
      const b = unary();
      a = (x, y) => (op === '*' ? l(x, y) * b(x, y) : l(x, y) / b(x, y));
    }
    return a;
  }

  function sum() {
    let a = product();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++];
      const l = a;
      const b = product();
      a = (x, y) => (op === '+' ? l(x, y) + b(x, y) : l(x, y) - b(x, y));
    }
    return a;
  }

  if (source.length > 200) throw Error('Use an expression of at most 200 characters.');
  const result = sum();
  if (i !== tokens.length) {
    throw Error('Unexpected input. Write multiplication explicitly, for example x*(y-4).');
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * Numerics: one classical Runge-Kutta step for v' = F(v)
 * ------------------------------------------------------------------ */
function rk4(F, v, dt) {
  const add = (a, b, t) => a.map((q, i) => q + t * b[i]);
  const a = F(...v);
  const b = F(...add(v, a, dt / 2));
  const c = F(...add(v, b, dt / 2));
  const d = F(...add(v, c, dt));
  return v.map((q, i) => q + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
}

/* ------------------------------------------------------------------ *
 * Setup and state
 * ------------------------------------------------------------------ */
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

let state;        // { F, bounds, h, duration } from the last successful apply()
let view;         // pixel/coordinate mapping from the last draw()
let seeds = [];   // initial conditions added by clicking

// Each preset: [f, g, xmin, xmax, ymin, ymax, h, piticks]
const presets = [
  ['-3*x+y+2',   '-4*x+2*y+2', '-3',   '5',    '-3',   '5', 0.5,  false],
  ['x-y',        '2*y*(y-1)',  '-3.5', '4.5',  '-3.5', '4.5', 0.5, false],
  ['1-x-y',      'x^2-1',      '-4',   '4',    '-2',   '6', 0.4,  false],
  ['x*(3-x)-2*x*y', 'y*(2-y)-x*y', '-0.5', '5', '-0.5', '4', 0.25, false],
  ['4*x-2*x*y', '-3*y+x*y',   '-0.5', '5',    '-0.5', '4', 0.25, false],
  ['y',          '-4*sin(x)', '-3*pi','3*pi', '-5',   '5', 0.5,  true], 
];
const ids = ['f', 'g', 'xmin', 'xmax', 'ymin', 'ymax', 'h'];

/* ------------------------------------------------------------------ *
 * Read and validate the form
 * ------------------------------------------------------------------ */
function apply() {
  try {
    const f = expression($('f').value);
    const g = expression($('g').value);
    const bounds = ['xmin', 'xmax', 'ymin', 'ymax']
      .map(id => expression($(id).value)(NaN, NaN));
    const [a, b, c, d] = bounds;
    const h = Number($('h').value);
    const duration = Number($('duration').value);

    if (
      !bounds.every(Number.isFinite) ||
      !(b > a && d > c) ||
      Math.max(...bounds.map(Math.abs)) > 1e5
    ) {
      throw Error('Enter finite bounds between −100000 and 100000, with each minimum below its maximum.');
    }
    if (!(h > 0) || Math.ceil((b - a) / h + 1) * Math.ceil((d - c) / h + 1) > 12000) {
      throw Error('Increase grid spacing: the plot supports up to 12000 arrows.');
    }
    if (!(duration >= 1 && duration <= 100)) {
      throw Error('Choose a trajectory time from 1 to 100.');
    }

    state = { F: (x, y) => [f(x, y), g(x, y)], bounds, h, duration };
    seeds = [];
    $('error').textContent = '';
    draw();
  } catch (e) {
    $('error').textContent = e.message;
  }
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
function draw() {
  if (!state) return;

  const { F, bounds: [a, b, c, d], h, duration } = state;
  const r = canvas.getBoundingClientRect();
  const W = r.width;
  const H = r.height;
  const dpr = devicePixelRatio || 1;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Pixels per unit, and the top-left corner of the plot area
  const s = Math.min((W - 85) / (b - a), (H - 65) / (d - c));
  const left = (W - s * (b - a)) / 2;
  const top = (H - s * (d - c)) / 2;
  view = { s, left, top, a, b, c, d };

  // Math coordinates -> canvas pixels
  const p = (x, y) => [left + (x - a) * s, top + (d - y) * s];
  const finite = v => v.every(Number.isFinite);
  const inside = v => finite(v) && v[0] >= a && v[0] <= b && v[1] >= c && v[1] <= d;

  function line(u, v, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...p(...u));
    ctx.lineTo(...p(...v));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  // Arrow centered at (x, y) with direction (u, v)
  function arrow(x, y, u, v, color) {
    const start = p(x - u / 2, y - v / 2);
    const end = p(x + u / 2, y + v / 2);
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    const z = Math.min(5, Math.hypot(u, v) * s * 0.35);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(...start);
    ctx.lineTo(...end);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...end);
    ctx.lineTo(end[0] - z * Math.cos(angle - 0.5), end[1] - z * Math.sin(angle - 0.5));
    ctx.lineTo(end[0] - z * Math.cos(angle + 0.5), end[1] - z * Math.sin(angle + 0.5));
    ctx.fill();
  }

  // ---- Grid, axes, and tick labels ----
  const nice = range => {
    const z = range / 8;
    const k = 10 ** Math.floor(Math.log10(z));
    return [1, 2, 5, 10].find(n => n * k >= z) * k;
  };

  ctx.font = '11px system-ui';
  ctx.fillStyle = '#62776a';

  const dx = $('piticks').checked
    ? Math.PI * Math.max(1, Math.ceil((b - a) / (12 * Math.PI)))
    : nice(b - a);
  const dy = nice(d - c);

  for (let x = Math.ceil(a / dx) * dx; x <= b + 1e-8; x += dx) {
    line([x, c], [x, d], '#e9eee8');
    const n = Math.round(x / Math.PI);
    const label = $('piticks').checked
      ? (n === 0 ? '0' : n === 1 ? 'π' : n === -1 ? '−π' : n + 'π')
      : Number(x.toPrecision(4));
    ctx.fillText(label, p(x, c)[0] - 7, top + (d - c) * s + 18);
  }

  for (let y = Math.ceil(c / dy) * dy; y <= d + 1e-8; y += dy) {
    line([a, y], [b, y], '#e9eee8');
    ctx.fillText(Number(y.toPrecision(4)), left - 32, p(a, y)[1] + 4);
  }

  if (a <= 0 && b >= 0) line([0, c], [0, d], '#9aae9f');
  if (c <= 0 && d >= 0) line([a, 0], [b, 0], '#9aae9f');
  ctx.fillText('x', left + (b - a) * s + 15, top + (d - c) * s);
  ctx.fillText('y', left - 12, top - 10);

  // Everything below is clipped to the plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, (b - a) * s, (d - c) * s);
  ctx.clip();

  // ---- Direction field ----
  const samples = [];
  let skipped = 0;

  for (let ix = 0; ix <= Math.floor((b - a) / h + 1e-9); ix++) {
    for (let iy = 0; iy <= Math.floor((d - c) / h + 1e-9); iy++) {
      const x = a + ix * h;
      const y = c + iy * h;
      const v = F(x, y);
      const m = Math.hypot(...v);
      if (finite(v) && Number.isFinite(m)) samples.push([x, y, ...v, m]);
      else skipped++;
    }
  }

  const speeds = samples.map(q => q[4]);
  const lo = speeds.length ? Math.min(...speeds) : 0;
  const hi = speeds.length ? Math.max(...speeds) : 0;

  // Speed -> color (matches the legend gradient)
  const stops = [[67, 59, 135], [40, 125, 142], [52, 182, 121], [244, 221, 81]];
  function color(t) {
    const z = Math.max(0, Math.min(1, t)) * 3;
    const i = Math.min(2, Math.floor(z));
    const f = z - i;
    return 'rgb(' + stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f)).join(',') + ')';
  }

  for (const [x, y, u, v, m] of samples) {
    if (m > 1e-12) {
      arrow(x, y, u / m * h * 0.7, v / m * h * 0.7, color(hi > lo ? (m - lo) / (hi - lo) : 0.5));
    }
  }
  $('slow').textContent = Number(lo.toPrecision(3));
  $('fast').textContent = Number(hi.toPrecision(3));

  // ---- Nullclines ----
  // Marching triangles avoids ambiguous saddle cells in the nullcline contours.
  if ($('nullclines').checked) {
    const n = 100;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = a + i * (b - a) / n;
        const y = c + j * (d - c) / n;
        const X = x + (b - a) / n;
        const Y = y + (d - c) / n;
        const points = [[x, y], [X, y], [X, Y], [x, Y]];
        const vals = points.map(q => F(...q));

        for (let k = 0; k < 2; k++) {              // k = 0: f = 0, k = 1: g = 0
          for (const tri of [[0, 1, 2], [0, 2, 3]]) {
            const hits = [];
            for (let e = 0; e < 3; e++) {
              const u = tri[e];
              const v = tri[(e + 1) % 3];
              const fu = vals[u][k];
              const fv = vals[v][k];
              const crosses = (fu <= 0 && fv > 0) || (fu > 0 && fv <= 0);
              if (Number.isFinite(fu) && Number.isFinite(fv) && crosses) {
                const t = fu / (fu - fv);
                hits.push(points[u].map((q, l) => q + t * (points[v][l] - q)));
              }
            }
            if (hits.length === 2) {
              line(hits[0], hits[1], k ? '#287b45' : '#aa4380', 1.8);
            }
          }
        }
      }
    }
  }

  // ---- Trajectories (adaptive RK4 with step doubling) ----
  let limited = 0;

  for (const seed of seeds) {
    for (const sign of [-1, 1]) {            // backward, then forward in time
      let v = seed.slice();
      let time = 0;
      let dt = 0.01;
      let steps = 0;

      ctx.beginPath();
      ctx.moveTo(...p(...v));

      while (time < duration && steps++ < 15000) {
        const speed = Math.hypot(...F(...v));
        if (!Number.isFinite(speed) || speed < 1e-10) break;

        dt = Math.min(dt * 1.5, 0.05, 0.2 / s / speed, duration - time);

        const full = rk4(F, v, sign * dt);
        const half = rk4(F, rk4(F, v, sign * dt / 2), sign * dt / 2);
        if (!finite(full) || !finite(half)) break;

        const error = Math.hypot(full[0] - half[0], full[1] - half[1]);
        const tol = 1e-8 * (1 + Math.hypot(...v));
        if (error > tol) {
          dt *= 0.5;
          if (dt < 1e-10) break;
          continue;
        }

        if (!inside(half)) break;
        ctx.lineTo(...p(...half));

        // Orange arrowhead every 100 steps along the forward branch
        if (sign > 0 && steps % 100 === 0) {
          ctx.strokeStyle = '#c17443';
          ctx.lineWidth = 2;
          ctx.stroke();
          const vel = F(...half);
          const m = Math.hypot(...vel);
          if (m > 0) arrow(...half, vel[0] / m * 10 / s, vel[1] / m * 10 / s, '#c17443');
          ctx.beginPath();
          ctx.moveTo(...p(...half));
        }

        v = half;
        time += dt;
      }

      if (steps >= 15000) limited++;
      ctx.strokeStyle = '#c17443';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Dot at the initial condition
    ctx.beginPath();
    ctx.arc(...p(...seed), 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#c17443';
    ctx.fill();
  }

  ctx.restore();

  $('status').textContent =
    seeds.length + ' initial condition' + (seeds.length === 1 ? '' : 's') + '.' +
    (skipped ? ' Undefined field values omitted at ' + skipped + ' grid points.' : '') +
    (limited ? ' Some curves reached the integration step limit.' : '');
}

/* ------------------------------------------------------------------ *
 * Event wiring
 * ------------------------------------------------------------------ */
$('controls').onsubmit = e => {
  e.preventDefault();
  apply();
};

$('preset').onchange = () => {
  const values = presets[Number($('preset').value)];
  if (!values) return;
  ids.forEach((id, i) => { $(id).value = values[i]; });
  $('piticks').checked = values[7];
  $('kind').textContent = $('preset').selectedOptions[0].textContent;
  apply();
};

// Editing any field switches the preset menu to "Custom system"
for (const id of ids) {
  $(id).oninput = () => {
    $('preset').value = 'custom';
    $('kind').textContent = 'Custom system';
  };
}

for (const id of ['piticks', 'nullclines']) {
  $(id).onchange = draw;
}

$('clear').onclick = () => {
  seeds = [];
  draw();
};

// Click the plot to add an initial condition
canvas.onclick = e => {
  if (!view) return;
  const r = canvas.getBoundingClientRect();
  const { s, left, top, a, b, c, d } = view;
  const x = a + (e.clientX - r.left - left) / s;
  const y = d - (e.clientY - r.top - top) / s;

  if (x >= a && x <= b && y >= c && y <= d) {
    if (seeds.length >= 30) {
      $('error').textContent = 'Clear trajectories before adding more than 30 initial conditions.';
      return;
    }
    seeds.push([x, y]);
    draw();
  }
};

new ResizeObserver(draw).observe(canvas);
apply();