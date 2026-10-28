---
layout: single
title: "MATH/CS 375 — Introduction to Numerical Computing"
permalink: /teaching/math-375/
author_profile: true
---

**University of New Mexico**

An introduction to numerical methods and scientific computing, with computational experiments in MATLAB.

## Curriculum and lecture slides

Browse the lectures by topic. Each card includes a short description and a link to the slides; illustrations can be added individually as the materials evolve.

<nav class="course-unit-nav" aria-label="Jump to a course unit">
  {% for unit in site.data.math375.units %}
  <a href="#unit-{{ unit.number }}">{{ unit.number }}. {{ unit.short_title | escape }}</a>
  {% endfor %}
</nav>

{% for unit in site.data.math375.units %}
<section class="course-unit" id="unit-{{ unit.number }}" aria-labelledby="unit-{{ unit.number }}-title">
  <h3 id="unit-{{ unit.number }}-title" class="course-unit__title">{{ unit.number }}. {{ unit.title | escape }}</h3>
  <div class="lecture-grid">
    {% for lecture in unit.lectures %}
    <article class="lecture-card">
      {% if lecture.image %}
      <figure class="lecture-card__figure">
        <img src="{{ lecture.image | relative_url }}" alt="{{ lecture.image_alt | default: lecture.title | escape }}" loading="lazy">
      </figure>
      {% endif %}
      <div class="lecture-card__body">
        <div class="lecture-card__number">Lecture {{ lecture.number | escape }}</div>
        <h4 class="lecture-card__title">{{ lecture.title | escape }}</h4>
        {% if lecture.description %}
        <p class="lecture-card__description">{{ lecture.description | escape }}</p>
        {% endif %}
        <div class="lecture-card__actions">
          <a class="lecture-card__pdf" href="{{ lecture.pdf | relative_url }}" aria-label="View PDF slides for Lecture {{ lecture.number | escape }}: {{ lecture.title | escape }}">View slides <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </article>
    {% endfor %}
  </div>
</section>
{% endfor %}

[Back to Teaching]({{ '/teaching/' | relative_url }})
