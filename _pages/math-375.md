---
layout: single
title: "MATH/CS 375 — Introduction to Numerical Computing"
permalink: /teaching/math-375/
author_profile: true
---

**University of New Mexico**

An introduction to numerical methods and scientific computing, with computational experiments in MATLAB.

## Curriculum and lecture slides

Topics are listed in the order they are taught. Each topic includes its lectures, a short description, and space for one representative illustration.

<nav class="course-unit-nav" aria-label="Jump to a course topic">
  {% for unit in site.data.math375.units %}
  <a href="#topic-{{ unit.number }}">{{ unit.number }}. {{ unit.short_title | escape }}</a>
  {% endfor %}
</nav>

{% for unit in site.data.math375.units %}
<section class="course-topic" id="topic-{{ unit.number }}" aria-labelledby="topic-{{ unit.number }}-title">
  <div class="course-topic__header">
    <div class="course-topic__intro">
      <h3 class="course-topic__title" id="topic-{{ unit.number }}-title">{{ unit.number }}. {{ unit.title | escape }}</h3>
      <p class="course-topic__summary">{{ unit.summary | escape }}</p>
    </div>

    <figure class="course-topic__figure">
      {% if unit.image %}
      <img src="{{ unit.image | relative_url }}" alt="{{ unit.image_alt | default: unit.title | escape }}" loading="lazy">
      {% else %}
      <div class="course-topic__placeholder" role="note" aria-label="Illustration space reserved for {{ unit.title | escape }}">
        <span>Topic illustration</span>
        <small>To be added</small>
      </div>
      {% endif %}
    </figure>
  </div>

  <div class="lecture-list">
    {% for lecture in unit.lectures %}
    <article class="lecture-row">
      <div class="lecture-row__content">
        <div class="lecture-row__number">Lecture {{ lecture.number | escape }}</div>
        <h4 class="lecture-row__title">{{ lecture.title | escape }}</h4>
        {% if lecture.description %}
        <p class="lecture-row__description">{{ lecture.description | escape }}</p>
        {% endif %}
      </div>
      <div class="lecture-row__actions">
        <a href="{{ lecture.pdf | relative_url }}" aria-label="View PDF slides for Lecture {{ lecture.number | escape }}: {{ lecture.title | escape }}">View slides <span aria-hidden="true">↗</span></a>
      </div>
    </article>
    {% endfor %}
  </div>
</section>
{% endfor %}

[Back to Teaching]({{ '/teaching/' | relative_url }})
