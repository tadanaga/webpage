---
layout: single
title: "Research"
description: "Research in numerical methods for PDEs, finite element domain decomposition, Helmholtz scattering, and nonlinear equations."
permalink: /portfolio/
author_profile: true
---

My research interests include numerical analysis, scientific computing, and numerical methods for partial differential equations. I am particularly interested in domain decomposition methods and their implementation.

## Domain decomposition for wave scattering

Simulating waves scattered by obstacles can require solving very large systems of equations. My research investigates **non-overlapping finite element domain decomposition methods** for the exterior Helmholtz equation. By dividing the computational domain into subdomains, these methods allow much of the numerical work to be performed locally while exchanging information through their interfaces.

An important difficulty arises at **cross-points**, where several subdomains meet. The way these shared degrees of freedom are handled, together with the transmission conditions between subdomains, strongly influences how quickly an iterative solver converges. My work examines Padé-based and integral-equation transmission operators, as well as absorbing boundary treatments such as perfectly matched layers and adaptive radiation conditions.

### Continuity extension at cross-points

In my current work, I investigate **continuity extension**: treating selected interface nodes near the original coupled endpoints as additional globally shared degrees of freedom. The parameter \(\delta\) counts how many interior nodes are selected from each end of an interface. Larger values typically improve convergence in our experiments, but also enlarge the globally coupled part of the system.

<div class="research-feature" id="continuity-extension-demo">
  <div class="research-feature__eyebrow">Interactive geometry</div>
  <h4 class="research-feature__title">What changes when continuity is extended?</h4>
  <p class="research-feature__intro">Move the slider to compare the original coupling with an extended set of shared interface nodes. The shaded regions represent subdomains of a schematic annular partition.</p>
  <div class="ce-compare">
    <figure class="ce-panel">
      <figcaption>Original treatment · \(\delta=0\)</figcaption>
      <svg id="ce-baseline" viewBox="0 0 320 320" role="img" aria-label="Annular subdomain schematic, showing coupled endpoint nodes only"></svg>
    </figure>
    <figure class="ce-panel">
      <figcaption>Continuity extension · \(\delta=\)<output for="ce-delta" id="ce-delta-value">1</output></figcaption>
      <svg id="ce-adjusted" viewBox="0 0 320 320" role="img" aria-label="Annular subdomain schematic with an adjustable number of additional strongly coupled interface nodes"></svg>
    </figure>
  </div>
  <div class="ce-control">
    <label for="ce-delta">Extension: \(\delta\)</label>
    <input id="ce-delta" type="range" min="0" max="3" step="1" value="1" aria-label="Number of extra strongly coupled nodes at each interface endpoint">
  </div>
  <div class="ce-legend" aria-label="Diagram legend">
    <span><i class="ce-legend--fixed" aria-hidden="true"></i> Original coupled endpoints</span>
    <span><i class="ce-legend--added" aria-hidden="true"></i> Added shared nodes</span>
    <span><i class="ce-legend--other" aria-hidden="true"></i> Other interface nodes</span>
  </div>
  <p class="research-feature__status" id="ce-explanation" aria-live="polite">On each interface, the first interior node next to each endpoint is added to the shared set.</p>
  <p class="research-feature__caption">Schematic only: the displayed nodes illustrate the coupling rule, not a particular finite element mesh or a numerical simulation. The full method can choose different extension lengths on different interfaces.</p>
</div>

### What does it do to convergence?

The following data come from a **Groscas numerical experiment** in my ongoing Helmholtz research. The figure shows recorded ORTHODIR iteration counts for three transmission operators as the extension parameter varies from 0 to 19.

<div class="research-results-summary" aria-label="Iterations at delta zero and nineteen">
  <div class="research-result-stat"><strong>61 → 31</strong><span>EMDA iterations</span></div>
  <div class="research-result-stat"><strong>55 → 15</strong><span>Padé iterations</span></div>
  <div class="research-result-stat"><strong>37 → 9</strong><span>IE2 iterations</span></div>
</div>

```plotly
{"data":[{"type":"scatter","mode":"lines+markers","name":"EMDA","x":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],"y":[61,60,58,56,53,51,48,46,44,43,42,40,38,37,36,35,34,33,31,31],"line":{"color":"#267a86","width":2.6},"marker":{"size":5},"hovertemplate":"δ=%{x}<br>Iterations=%{y}<extra>EMDA</extra>"},{"type":"scatter","mode":"lines+markers","name":"Padé","x":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],"y":[55,50,50,48,45,42,38,34,29,28,27,25,23,21,21,20,18,17,16,15],"line":{"color":"#c18a37","width":2.6},"marker":{"size":5},"hovertemplate":"δ=%{x}<br>Iterations=%{y}<extra>Padé</extra>"},{"type":"scatter","mode":"lines+markers","name":"IE2","x":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],"y":[37,40,36,31,31,28,25,22,19,18,17,15,14,13,12,11,10,9,9,9],"line":{"color":"#8a69b0","width":2.6},"marker":{"size":5},"hovertemplate":"δ=%{x}<br>Iterations=%{y}<extra>IE2</extra>"}],"layout":{"title":{"text":"Recorded ORTHODIR iterations · Groscas benchmark","font":{"size":16}},"autosize":true,"height":405,"margin":{"l":58,"r":22,"t":58,"b":65},"xaxis":{"title":"Continuity extension δ","dtick":2,"range":[-0.5,19.5],"zeroline":false},"yaxis":{"title":"Iterations to converge","rangemode":"tozero","zeroline":false},"legend":{"orientation":"h","x":0.5,"xanchor":"center","y":1.04,"yanchor":"bottom"},"hovermode":"x unified"}}
```

In this experiment, increasing the continuity extension generally reduces the number of iterations for all three operators. This is **not** a measurement of total runtime: fewer iterations must be weighed against the additional cost of globally coupling more unknowns, particularly when distributing the computation across more subdomains.

<details class="research-extra">
  <summary>Numerical and mathematical details</summary>
  <p>The model uses the two-dimensional time-harmonic Helmholtz equation, \(\Delta u + k^2 u=0\), with an outgoing-wave condition in the exterior. The non-overlapping finite element formulation couples local subdomain problems through artificial interfaces and preserves shared nodal values at the selected coupled endpoints and extension points.</p>
  <p>For this Groscas test, the wavenumber is \(k=5\pi/2\). The Padé operator uses four terms (\(N_p=4\)), and the integral-equation operator IE2 uses \(\varepsilon=0.5\). The plotted values are solver iteration counts recorded in the ongoing manuscript, not timings or error estimates.</p>
</details>

This work builds on my doctoral research on non-overlapping Helmholtz methods. A related published contribution is [*Non-Overlapping Domain Decomposition Methods with Cross-Points and Padé Approximants for the Helmholtz Equation*](https://doi.org/10.1007/978-3-030-95025-5_12).

<script defer src="{{ '/assets/js/research-helmholtz.js' | relative_url }}"></script>

## Nonlinear elliptic equations

My doctoral research also included domain decomposition methods for the fully nonlinear Monge–Ampère equation, including numerical methods for constructing and solving discretized nonlinear problems.

## Earlier projects

- **Granular impact and computational topology:** Studying evolving force networks in granular materials using tools from topology.
- **Flow estimation:** Using simulations and Kalman filtering to investigate the estimation of flow parameters.

## Publications and code

- [Publications]({{ '/publications/' | relative_url }})
- [Curriculum vitae (PDF)]({{ '/files/takahashi_cv.pdf' | relative_url }})
- [GitHub](https://github.com/tadanaga)
