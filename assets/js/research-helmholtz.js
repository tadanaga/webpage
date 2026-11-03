/* Interactive schematic of continuity extension near coupled interface endpoints.
 * The drawing is explanatory only; it is not a discretized solver or the
 * Groscas benchmark geometry.  No external dependencies.
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  const center = 160;
  const radii = [48, 94, 136];
  const intermediate = 7;

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const key in attributes) {
      node.setAttribute(key, attributes[key]);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function point(radius, theta) {
    return [center + radius * Math.cos(theta),
            center + radius * Math.sin(theta)];
  }

  function sector(inner, outer, start, end) {
    const [x0, y0] = point(outer, start);
    const [x1, y1] = point(outer, end);
    const [x2, y2] = point(inner, end);
    const [x3, y3] = point(inner, start);
    return `M ${x0} ${y0} A ${outer} ${outer} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 0 0 ${x3} ${y3} Z`;
  }

  function addNode(svg, x, y, category) {
    element("circle", {
      cx: x.toFixed(3), cy: y.toFixed(3),
      r: category === "endpoint" ? "4.1" : "3.0",
      class: "ce-node ce-node--" + category
    }, svg);
  }

  function draw(svg, delta) {
    if (!svg) return;
    svg.replaceChildren();
    svg.setAttribute("viewBox", "0 0 320 320");

    // Shade alternating subdomains, then draw interfaces on top.
    for (let level = 0; level < 2; level++) {
      for (let wedge = 0; wedge < 4; wedge++) {
        element("path", {
          d: sector(radii[level], radii[level + 1],
                    angles[wedge], angles[wedge] + Math.PI / 2),
          class: (wedge + level) % 2 === 0
            ? "ce-region ce-region--one" : "ce-region ce-region--two"
        }, svg);
      }
    }

    // Physical boundaries and artificial transmission interfaces.
    for (const radius of radii) {
      element("circle", {
        cx: center, cy: center, r: radius,
        class: radius === radii[1] ? "ce-interface" : "ce-boundary"
      }, svg);
    }
    for (const angle of angles) {
      const [x0, y0] = point(radii[0], angle);
      const [x1, y1] = point(radii[2], angle);
      element("line", {
        x1: x0, y1: y0, x2: x1, y2: y1,
        class: "ce-interface"
      }, svg);
    }
    const middle = element("text", {
      x: center, y: center + 4, class: "ce-obstacle-label",
      "text-anchor": "middle"
    }, svg);
    middle.textContent = "obstacle";

    // Nodes on 8 radial segments, then on 4 circular interface arcs.
    function interfaceNodes(start, end, evaluate) {
      for (let j = 1; j <= intermediate; j++) {
        const t = j / (intermediate + 1);
        const [x, y] = evaluate(start, end, t);
        const coupled = j <= delta || j > intermediate - delta;
        addNode(svg, x, y, coupled ? "extended" : "ordinary");
      }
    }

    for (const angle of angles) {
      for (let level = 0; level < 2; level++) {
        interfaceNodes(radii[level], radii[level + 1],
          (a, b, t) => point(a + (b - a) * t, angle));
      }
    }
    for (let wedge = 0; wedge < 4; wedge++) {
      interfaceNodes(angles[wedge], angles[wedge] + Math.PI / 2,
        (a, b, t) => point(radii[1], a + (b - a) * t));
    }

    // Original coupled endpoints remain fixed across slider settings.
    for (const angle of angles) {
      for (const radius of radii) {
        addNode(svg, ...point(radius, angle), "endpoint");
      }
    }
  }

  function initialize() {
    const widget = document.getElementById("continuity-extension-demo");
    if (!widget) return;
    const baseline = widget.querySelector("#ce-baseline");
    const changed = widget.querySelector("#ce-adjusted");
    const slider = widget.querySelector("#ce-delta");
    const output = widget.querySelector("#ce-delta-value");
    const sentence = widget.querySelector("#ce-explanation");
    if (!baseline || !changed || !slider || !output || !sentence) return;
    draw(baseline, 0);

    function refresh() {
      const delta = Math.min(3, Math.max(0, Number(slider.value) || 0));
      output.textContent = String(delta);
      draw(changed, delta);
      sentence.textContent = delta === 0
        ? "The baseline shares the original endpoint values; interior interface nodes are not part of the extended coupled set."
        : "On each interface segment, the first " + delta
          + " interior node" + (delta === 1 ? "" : "s")
          + " next to each coupled endpoint "
          + (delta === 1 ? "is" : "are")
          + " added to the shared set.";
    }

    slider.addEventListener("input", refresh);
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
}());
