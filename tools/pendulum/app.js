'use strict';

/* ------------------------------------------------------------------ *
 * Setup and state
 * ------------------------------------------------------------------ */
const $ = id => document.getElementById(id);
const ids = ['omega', 'gamma', 'theta0', 'thetaDot0', 'duration'];

let simulation;       // { p, data, step } from the last successful apply()
let time = 0;         // current simulation time (s)
let playing = false;
let last = 0;         // timestamp of the previous animation frame
let phaseView;        // phase-plane chart geometry, used for click-to-set-initial-condition

/* ------------------------------------------------------------------ *
 * Numerics
 * Pendulum: theta'' + gamma * theta' + omega^2 * sin(theta) = 0.
 * The first-order state is v = [theta, thetaDot]; omega is the natural
 * angular frequency, not the angular-velocity state.
 * ------------------------------------------------------------------ */

// One classical Runge-Kutta step
function rk4(v, dt, p) {
  const F = ([x, y]) => [y, -p.gamma * y - p.omega ** 2 * Math.sin(x)];
  const add = (a, b, s) => a.map((q, i) => q + s * b[i]);
  const a = F(v);
  const b = F(add(v, a, dt / 2));
  const c = F(add(v, b, dt / 2));
  const d = F(add(v, c, dt));
  return v.map((q, i) => q + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
}

// Integrate the whole motion up front; rows are [t, theta, omega]
function solve(p) {
  const rate = Math.max(p.omega, p.gamma);
  const dt = Math.min(.01, .1 / Math.max(1, rate));
  const n = Math.ceil(p.duration / dt);

  if (n > 300000) {
    throw Error('These parameters require too many integration steps. Reduce γ, ω, or the simulation duration.');
  }

  const step = p.duration / n;
  const data = [[0, p.theta0, p.thetaDot0]];
  let v = [p.theta0, p.thetaDot0];

  for (let i = 1; i <= n; i++) {
    v = rk4(v, step, p);
    if (!v.every(Number.isFinite)) throw Error('Unable to integrate this parameter combination.');
    data.push([i * step, ...v]);
  }
  return { p, data, step };
}

// State at the current time, linearly interpolated: [t, theta, omega]
function current() {
  const { data, step } = simulation;
  const i = Math.min(data.length - 2, Math.floor(time / step));
  const f = Math.min(1, (time - data[i][0]) / step);
  return [time, ...[1, 2].map(k => data[i][k] + f * (data[i + 1][k] - data[i][k]))];
}

/* ------------------------------------------------------------------ *
 * Read and validate the form
 * ------------------------------------------------------------------ */
function pause() {
  playing = false;
  $('play').textContent = 'Play';
}

function apply() {
  try {
    const p = Object.fromEntries(ids.map(id => [id, Number($(id).value)]));

    for (const id of ids) {
      const el = $(id);
      if (
        el.value.trim() === '' ||
        !Number.isFinite(p[id]) ||
        p[id] < Number(el.min) ||
        p[id] > Number(el.max)
      ) {
        throw Error('Enter a valid value for ' + id + '.');
      }
    }

    const next = solve(p);
    simulation = next;
    pause();
    time = 0;
    $('seek').max = p.duration;
    $('error').textContent = '';

    // Damping regime of the linearization about the downward equilibrium
    const ratio = p.gamma / (2 * p.omega);
    $('regime').textContent =
      ratio === 0 ? 'Undamped'
      : Math.abs(ratio - 1) < 1e-7 ? 'Critical damping (linearized)'
      : ratio < 1 ? 'Underdamped (linearized)'
      : 'Overdamped (linearized)';

    draw();
  } catch (e) {
    $('error').textContent = e.message;
  }
}

/* ------------------------------------------------------------------ *
 * Drawing helpers
 * ------------------------------------------------------------------ */

// Size a canvas for the device pixel ratio and return its 2D context
function surface(id) {
  const canvas = $(id);
  const r = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: r.width, H: r.height };
}

// Draw grid, axes, and labels; leaves the context clipped to the plot area
// (callers must call ctx.restore() when done). Returns the chart geometry.
function chart(id, bounds, xLabel, yLabel, pi = false) {
  const { ctx, W, H } = surface(id);
  const [a, b, c, d] = bounds;
  const left = 48, top = 20, w = W - 65, h = H - 60;
  const p = (x, y) => [left + (x - a) / (b - a) * w, top + (d - y) / (d - c) * h];

  ctx.font = '11px system-ui';
  ctx.fillStyle = '#62776a';

  function line(x, y, X, Y, color) {
    ctx.beginPath();
    ctx.moveTo(...p(x, y));
    ctx.lineTo(...p(X, Y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const nice = z => {
    const k = 10 ** Math.floor(Math.log10(z));
    return [1, 2, 5, 10].find(n => n * k >= z) * k;
  };
  const dx = pi
    ? Math.PI * Math.max(1, Math.ceil((b - a) / (8 * Math.PI)))
    : nice((b - a) / 6);
  const dy = nice((d - c) / 6);

  for (let x = Math.ceil(a / dx) * dx; x <= b + 1e-9; x += dx) {
    line(x, c, x, d, '#edf0ea');
    const n = Math.round(x / Math.PI);
    ctx.fillText(
      pi ? (n === 0 ? '0' : n === 1 ? 'π' : n === -1 ? '−π' : n + 'π') : Number(x.toPrecision(3)),
      p(x, c)[0] - 8,
      top + h + 17
    );
  }

  for (let y = Math.ceil(c / dy) * dy; y <= d + 1e-9; y += dy) {
    line(a, y, b, y, '#edf0ea');
    ctx.fillText(Number(y.toPrecision(3)), 3, p(a, y)[1] + 4);
  }

  if (c <= 0 && d >= 0) line(a, 0, b, 0, '#9cafaa');
  if (a <= 0 && b >= 0) line(0, c, 0, d, '#9cafaa');
  ctx.fillText(xLabel, left + w - 24, H - 4);
  ctx.fillText(yLabel, 5, 12);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, w, h);
  ctx.clip();

  return { ctx, p, left, top, w, h, bounds };
}

// Filled or hollow dot at data coordinates (x, y)
function dot(q, x, y, color, r = 4, fill = true) {
  q.ctx.beginPath();
  q.ctx.arc(...q.p(x, y), r, 0, 2 * Math.PI);
  q.ctx.fillStyle = color;
  q.ctx.strokeStyle = color;
  q.ctx.lineWidth = 1.5;
  if (fill) q.ctx.fill();
  else q.ctx.stroke();
}

// Plot column iy against column ix of the solution; honors "reveal as it moves"
function curve(q, ix, iy, color) {
  const data = simulation.data;
  const end = $('reveal').checked
    ? Math.min(data.length - 1, Math.floor(time / simulation.step))
    : data.length - 1;

  q.ctx.beginPath();
  q.ctx.moveTo(...q.p(data[0][ix], data[0][iy]));
  for (let i = 1; i <= end; i++) {
    q.ctx.lineTo(...q.p(data[i][ix], data[i][iy]));
  }
  if ($('reveal').checked) {
    const now = current();
    q.ctx.lineTo(...q.p(now[ix], now[iy]));
  }
  q.ctx.strokeStyle = color;
  q.ctx.lineWidth = 2;
  q.ctx.stroke();
}

/* ------------------------------------------------------------------ *
 * Main draw: phase plane, angle vs. time, pendulum, readouts
 * ------------------------------------------------------------------ */
function draw() {
  if (!simulation) return;

  const { p, data } = simulation;
  const now = current();

  // Axis ranges: at least [-3π, 3π] x [-8, 8], widened to fit the solution
  let xmin = -3 * Math.PI, xmax = 3 * Math.PI, vmax = 8;
  let amin = Infinity, amax = -Infinity;
  for (const row of data) {
    xmin = Math.min(xmin, row[1] - .3);
    xmax = Math.max(xmax, row[1] + .3);
    vmax = Math.max(vmax, Math.abs(row[2]) * 1.1);
    amin = Math.min(amin, row[1]);
    amax = Math.max(amax, row[1]);
  }

  // ---- Phase plane ----
  const q = chart('phase', [xmin, xmax, -vmax, vmax], 'θ', 'θ′', true);
  phaseView = { ...q };

  if ($('field').checked) {
    const dx = Math.PI * Math.max(1, Math.ceil((xmax - xmin) / (30 * Math.PI)));
    const spacing = dx / 3;

    for (let x = Math.ceil(xmin / spacing) * spacing; x <= xmax; x += spacing) {
      for (let j = -8; j <= 8; j++) {
        const y = j * vmax / 8;
        const u = y;
        const v = -p.gamma * y - p.omega ** 2 * Math.sin(x);

        // Direction in pixel space (screen y points down)
        const U = u * q.w / (xmax - xmin);
        const V = -v * q.h / (2 * vmax);
        const n = Math.hypot(U, V);
        if (n < 1e-9) continue;

        const [px, py] = q.p(x, y);
        const len = Math.min(q.w / 40, q.h / 26);
        const ux = U / n, uy = V / n;
        const ex = px + ux * len / 2, ey = py + uy * len / 2;

        q.ctx.strokeStyle = '#bdc7c1';
        q.ctx.lineWidth = 1;
        q.ctx.beginPath();
        q.ctx.moveTo(px - ux * len / 2, py - uy * len / 2);
        q.ctx.lineTo(ex, ey);
        q.ctx.moveTo(ex - ux * 4 - uy * 2, ey - uy * 4 + ux * 2);
        q.ctx.lineTo(ex, ey);
        q.ctx.lineTo(ex - ux * 4 + uy * 2, ey - uy * 4 - ux * 2);
        q.ctx.stroke();
      }
    }
  }

  curve(q, 1, 2, '#397fab');

  // Equilibria at theta = k*pi: filled green (downward, k even), hollow red (upright, k odd)
  for (let k = Math.ceil(xmin / Math.PI); k <= Math.floor(xmax / Math.PI); k++) {
    dot(q, k * Math.PI, 0, k % 2 ? '#b95e50' : '#39725b', 3.5, k % 2 === 0);
  }

  // Current state
  dot(q, now[1], now[2], '#cf793d', 5);
  q.ctx.restore();

  // ---- Angle versus time ----
  const pad = Math.max(.3, (amax - amin) * .08);
  const a = chart('angle', [0, p.duration, amin - pad, amax + pad], 't (s)', 'θ (rad)');
  curve(a, 0, 1, '#aa5260');
  dot(a, time, now[1], '#cf793d', 5);
  a.ctx.restore();

  // ---- Pendulum and readouts ----
  drawPendulum(now[1]);
  $('clock').textContent = 't = ' + time.toFixed(2) + ' s';
  $('seek').value = time;
  $('readout').textContent =
    'θ = ' + now[1].toFixed(3) + ' rad     θ′ = ' + now[2].toFixed(3) + ' rad/s';
}

function drawPendulum(theta) {
  const { ctx, W, H } = surface('pendulum');
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * .36;
  const x = cx + r * Math.sin(theta);
  const y = cy + r * Math.cos(theta);

  // Dashed circle and vertical reference line
  ctx.strokeStyle = '#e3e9e2';
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  ctx.setLineDash([]);

  // Rod shadow
  ctx.strokeStyle = '#d5dcd4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x + 4, y + 5);
  ctx.stroke();

  // Rod
  ctx.strokeStyle = '#34594b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x, y);
  ctx.stroke();

  // Bob
  ctx.fillStyle = '#d9af52';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#896f35';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pivot
  ctx.fillStyle = '#34594b';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.font = '12px system-ui';
}

/* ------------------------------------------------------------------ *
 * Event wiring
 * ------------------------------------------------------------------ */
$('controls').onsubmit = e => {
  e.preventDefault();
  apply();
};

// All examples use ω = 2; varying γ makes the damping comparison clear.
// The last three examples start at the same displacement with zero velocity.
const motionPresets = {
  small: {
    omega: 2, gamma: 0, theta0: Math.PI / 4, thetaDot0: 0, duration: 10,
    description: 'ω = 2, γ = 0; θ(0) = π/4, θ′(0) = 0.'
  },
  separatrix: {
    omega: 2, gamma: 0, theta0: 0, thetaDot0: 4, duration: 10,
    description: 'ω = 2, γ = 0; θ(0) = 0, θ′(0) = 4 (separatrix energy).'
  },
  rotation: {
    omega: 2, gamma: 0, theta0: Math.PI, thetaDot0: 2, duration: 10,
    description: 'ω = 2, γ = 0; θ(0) = π, θ′(0) = 2 (full rotations).'
  },
  underdamped: {
    omega: 2, gamma: 2, theta0: Math.PI / 4, thetaDot0: 0, duration: 10,
    description: 'ω = 2, γ = 2 < 2ω; θ(0) = π/4, θ′(0) = 0.'
  },
  critical: {
    omega: 2, gamma: 4, theta0: Math.PI / 4, thetaDot0: 0, duration: 10,
    description: 'ω = 2, γ = 4 = 2ω; θ(0) = π/4, θ′(0) = 0.'
  },
  overdamped: {
    omega: 2, gamma: 8, theta0: Math.PI / 4, thetaDot0: 0, duration: 10,
    description: 'ω = 2, γ = 8 > 2ω; θ(0) = π/4, θ′(0) = 0.'
  }
};

$('preset').onchange = () => {
  const p = motionPresets[$('preset').value];
  if (!p) return;
  ids.forEach(id => { $(id).value = p[id]; });
  $('preset-description').textContent = p.description;
  apply();
};

// Editing any field switches the preset menu to "Custom parameters" and pauses
ids.forEach(id => {
  $(id).oninput = () => {
    $('preset').value = 'custom';
    $('preset-description').textContent = 'Custom parameters';
    pause();
  };
});

$('play').onclick = () => {
  if (!simulation) return;
  if (playing) {
    pause();
    return;
  }
  if (time >= simulation.p.duration) time = 0;
  playing = true;
  last = performance.now();
  $('play').textContent = 'Pause';
};

$('restart').onclick = () => {
  pause();
  time = 0;
  draw();
};

$('seek').oninput = () => {
  pause();
  time = Number($('seek').value);
  draw();
};

$('reveal').onchange = draw;
$('field').onchange = draw;

// Click the phase plane to set the initial angle and angular velocity
$('phase').onclick = e => {
  if (!phaseView) return;
  const r = $('phase').getBoundingClientRect();
  const { left, top, w, h, bounds: [a, b, c, d] } = phaseView;
  const X = e.clientX - r.left;
  const Y = e.clientY - r.top;

  if (X < left || X > left + w || Y < top || Y > top + h) return;

  const x = a + (X - left) / w * (b - a);
  const y = d - (Y - top) / h * (d - c);

  if (Math.abs(x) > 30 || Math.abs(y) > 30) {
    $('error').textContent = 'Choose an initial angle and velocity between −30 and 30.';
    return;
  }

  $('theta0').value = x.toFixed(5);
  $('thetaDot0').value = y.toFixed(5);
  $('preset').value = 'custom';
  $('preset-description').textContent = 'Custom initial condition';
  apply();
};

// Animation loop (frame time is capped at 0.1 s so a stalled tab doesn't jump)
function frame(stamp) {
  if (playing && simulation) {
    time = Math.min(
      simulation.p.duration,
      time + Math.min(.1, (stamp - last) / 1000) * Number($('speed').value)
    );
    last = stamp;
    draw();
    if (time >= simulation.p.duration) pause();
  }
  requestAnimationFrame(frame);
}

new ResizeObserver(draw).observe($('phase'));
apply();
requestAnimationFrame(frame);