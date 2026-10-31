---
layout: single
title: "Mathematicians Through Time"
permalink: /timeline/
author_profile: true
---

Mathematical ideas have histories, and the names attached to theorems and algorithms belonged to real people. This growing timeline collects some of the mathematicians whose work appears in calculus, differential equations, and numerical computing.

<div class="math-history-overview" role="region" tabindex="0" aria-label="Scrollable timeline of mathematicians, 1600 to 1950">
  <div class="math-history-track">
    <div class="math-history-axis" aria-hidden="true"></div>
    {% assign ticks = "1600,1650,1700,1750,1800,1850,1900,1950" | split: "," %}
    {% for tick in ticks %}
      {% assign offset = tick | minus: 1580 | times: 5 %}
      <span class="math-history-tick" style="left: {{ offset }}px;" aria-hidden="true">{{ tick }}</span>
    {% endfor %}
    {% for person in site.data.mathematicians.mathematicians %}
    {% unless person.hidden %}
      {% assign x = person.birth | minus: 1580 | times: 5 %}
      {% assign y = person.lane | times: 78 | plus: 125 %}
      <a class="math-history-marker" style="left: {{ x }}px; top: {{ y }}px;" href="#historical-{{ person.id }}" aria-label="{{ person.name | escape }}, born {{ person.birth }}; read about {{ person.topic | escape }}">
        <span class="math-history-marker__year">{{ person.birth }}</span>
        <span class="math-history-marker__name">{{ person.name | escape }}</span>
      </a>
    {% endunless %}
    {% endfor %}
  </div>
</div>
<p class="math-history-hint">← Scroll to explore → &nbsp; · &nbsp; The positions mark birth years; dates below show full lifespans.</p>

## People and ideas

{% for person in site.data.mathematicians.mathematicians %}
    {% unless person.hidden %}
<details class="math-history-person" id="historical-{{ person.id }}">
  <summary class="math-history-person__summary">
    <span class="math-history-person__dates">{{ person.birth }}–{{ person.death }}</span>
    <span class="math-history-person__name">{{ person.name | escape }}</span>
    <span class="math-history-person__topic">{{ person.topic | escape }}</span>
  </summary>
  <div class="math-history-person__body">
    <p>{{ person.summary | escape }}</p>
    <div class="math-history-person__fact">
      <strong>Historical note</strong>
      <p>{{ person.fact | escape }}</p>
      <span class="math-history-person__course">{{ person.course | escape }}</span>
    </div>
    {% if person.links %}
    <div class="math-history-person__links">
      <strong>Related topics</strong>
      <ul>
        {% for link in person.links %}
        <li><a href="{{ link.url | escape }}" target="_blank" rel="noopener noreferrer">{{ link.label | escape }} ↗</a></li>
        {% endfor %}
      </ul>
    </div>
    {% endif %}
    <p class="math-history-person__reference"><a href="{{ person.source }}" target="_blank" rel="noopener noreferrer">Further reading: MacTutor History of Mathematics ↗</a></p>
  </div>
</details>
{% endunless %}
{% endfor %}

<p class="math-history-note">Historical contributions are often shared across many people and eras; the historical notes are starting points for classroom stories, not claims of sole invention. For deeper biographical background, see the linked <a href="https://mathshistory.st-andrews.ac.uk/">MacTutor History of Mathematics Archive</a>. The interactive <a href="https://mathigon.org/timeline">Mathigon Timeline of Mathematics</a> also inspired this page.</p>

<script>
(function () {
  function openLinkedBiography() {
    var id = window.location.hash.slice(1);
    if (!id || !id.startsWith('historical-')) return;
    var panel = document.getElementById(id);
    if (panel && panel.tagName.toLowerCase() === 'details') panel.open = true;
  }
  window.addEventListener('hashchange', openLinkedBiography);
  openLinkedBiography();
}());
</script>
