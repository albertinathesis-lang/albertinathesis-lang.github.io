/* =========================================================================
   people.js — builds the People grid and wires it to the site's canvas.

   The section is rendered by Nuxt (the "testimonials" slice: a quote
   carousel over the same eleven names). Its markup cannot be edited in
   place — hydration re-renders the slice from the payload — so the grid is
   built here AFTER hydration and appended to the section, where Vue leaves
   it alone. The carousel is hidden, not removed, so the payload stays the
   source of truth for the words.

   The portrait hover is the Executive Team effect, for real: each <img> is
   registered with the site's own dither canvas (the Nuxt `$canvas` plugin,
   reached through the Vue app on #__nuxt), which paints the picture as a
   two-tone dither and, on hover, resolves it to the photo — exactly the
   plane the exec cards use. The arrow button scales in with the same
   easing and timing as the exec cards' GSAP timeline, done in CSS.
   ========================================================================= */

(function () {
  'use strict';

  /* Two groups, each under its own header. Wording follows
   * tools/apply_copy.py (PEOPLE); the first four are the Executive Team row,
   * everyone else sits under Advisory Board. Photos: exec-01..03 are the
   * real portraits; the rest are placeholders until photos arrive, and a
   * real photo replaces the placeholder file, nothing else. */
  var LI = 'https://www.linkedin.com/in/';
  var GROUPS = [
    { label: 'Executive Team', tag: '[AAL.3]', people: [
      ['Fedra Fateh', 'CEO', 'exec-01-fedra-fateh.jpg', LI + 'fedra-fateh-69838534/'],
      ['Vahid Rastgou', 'Managing & Artistic Director', 'exec-02-vahid-rastgou.jpg', LI + 'vahid-rastgou-666b391b7/'],
      ['Tom Collins', 'Program Director', 'exec-03-tom-collins.jpg', LI + 'tom-collins-340a8520b/'],
      ['Reza Farhadifar', 'Scientific Advisor', 'people-04-reza-farhadifar.jpg', LI + 'reza-farhadifar-41271a31/']
    ] },
    { label: 'Advisory Board', tag: '[AAL.4]', people: [
      ['Nathalie Magniez', 'Technologist, STMicroelectronics', 'people-14-nathalie-magniez.jpg', LI + 'nathaliemagniez/'],
      ['Laura Tiuca', 'Senior legal executive, AI governance', 'people-15-laura-tiuca.jpg', LI + 'laura-tiuca-79929a2/'],
      ['Richard Reitknecht', 'Investor and arts patron', 'people-08-richard-reitknecht.jpg', LI + 'richard-reitknecht-7423b91/'],
      ['Jack Silver', 'Investor and arts patron', 'people-07-jack-silver.jpg', LI + 'jack-silver-29954564/'],
      ['Marc de Bourcy', 'Diplomat and cultural advisor', 'people-11-marc-de-bourcy.jpg', LI + 'marc-de-bourcy-28b528/'],
      ['Ken Tabachnick', 'Arts executive', 'people-09-ken-tabachnick.jpg', LI + 'ken-tabachnick-96671311/'],
      ['Rika Nakazawa', 'Technologist and author', 'people-05-rika-nakazawa.jpg', LI + 'rikanakazawa/'],
      ['Eric Wright', 'Arts executive', 'people-10-eric-wright.jpg', LI + 'eric-d-wright7/'],
      ['Lorenzo Da Pra Galanti', 'International corporate attorney', 'people-06-lorenzo-da-pra-galanti.jpg', LI + 'lorenzo-da-pra-galanti-b019655/'],
      ['Dieter Fuchs', 'Political scientist and author', 'people-13-dieter-fuchs.jpg', 'https://www.researchgate.net/profile/Dieter-Fuchs']   // no LinkedIn; ResearchGate
    ] }
  ];
  var MEDIA = '/assets/media/';        // absolute, like the exec cards (see README deploy notes)
  var PER_ROW = 4;
  var STAGGER = 150;                   // ms between cards in a row (exec: 300 per card)

  function nuxtApp() {
    var root = document.getElementById('__nuxt');
    return root && root.__vue_app__ && root.__vue_app__.$nuxt;
  }

  /* The canvas is ready when hydration is over and the exec planes exist —
   * that is the same signal DitherImage waits for (CANVAS_READY). */
  function canvasWhenReady() {
    var n = nuxtApp();
    if (!n || n.isHydrating !== false) return null;
    var c = n.$canvas;
    if (!c || !c.getMediaManager) return null;
    var mm = c.getMediaManager();
    return mm && mm.getAllMedia().length ? c : null;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(p, i) {
    var c = el('div', 'dwpeople__card');
    var meta = el('div', 'dwpeople__meta');
    meta.appendChild(el('span', null, String(i + 1).padStart(2, '0')));   // 01..14 across both groups
    c.appendChild(meta);

    var pic = el('div', 'dwpeople__pic');
    pic.setAttribute('data-dither-image', '');
    var img = document.createElement('img');
    img.width = 1155; img.height = 780;
    img.alt = p[0];
    img.src = MEDIA + p[2];
    img.setAttribute('data-src', MEDIA + p[2]);
    pic.appendChild(img);

    var btn = el('div', 'dwpeople__btn');
    btn.innerHTML = '<svg aria-hidden="true"><use xlink:href="/sprites/sprite-ui.svg#top-right-arrow"></use></svg>';
    pic.appendChild(btn);
    if (p[3]) {
      var a = document.createElement('a');
      a.className = 'dwpeople__link';
      a.href = p[3]; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', p[0] + (p[3].indexOf('linkedin.com') > -1 ? ' on LinkedIn' : ' profile'));
      pic.appendChild(a);
    }
    c.appendChild(pic);

    c.appendChild(el('h3', 'dwpeople__name', p[0]));
    c.appendChild(el('div', 'dwpeople__role', p[1]));
    return c;
  }

  function build(canvas) {
    var sec = document.querySelector('section[data-slice-type="testimonials"]');
    if (!sec || sec.querySelector('.dwpeople')) return;

    // the big three-card Executive Team section is replaced by the grid;
    // its #people anchor (the nav's PEOPLE link) moves to this section
    var big = document.querySelector('section[data-slice-type="projects"]');
    if (big) { big.classList.add('dwpeople-hidden'); big.removeAttribute('id'); }
    sec.id = 'people';

    var quote = sec.querySelector('.js-quote-block');
    var carousel = quote && quote.closest('.my-grid');
    if (carousel) carousel.classList.add('dwpeople-hidden');

    // the section header is the site's own "PEOPLE / [AAL.3]" row; it reads
    // Executive Team now, and a copy of it heads the Advisory Board
    var head = sec.querySelector('.my-grid');
    var pristine = head.cloneNode(true);          // copied BEFORE any edit
    var cards = [], heads = [], n = 0;
    GROUPS.forEach(function (g, gi) {
      var h = gi === 0 ? head : pristine.cloneNode(true);
      // The site's own label span is bound to a scroll-in scramble that
      // restores its original string ("People") from a closure, so it is
      // hidden rather than rewritten, and our label sits beside it. The
      // tag on the right has no such binding and is simply relabelled.
      var label = h.querySelector('span'), tag = h.querySelector('[aria-hidden]');
      if (label) {
        label.classList.add('dwpeople-hidden');
        var mine = el('span', 'dwpeople__label', g.label);
        mine.__orig = g.label;
        label.parentNode.insertBefore(mine, label.nextSibling);
        heads.push(mine);
      }
      if (tag) { tag.textContent = g.tag; tag.setAttribute('data-original-text', g.tag); }
      if (gi > 0) { h.classList.add('dwpeople__head'); sec.appendChild(h); }
      var grid = el('div', 'dwpeople');
      g.people.forEach(function (p) {
        var c = card(p, n++);
        cards.push(c); grid.appendChild(c);
      });
      sec.appendChild(grid);
    });

    // the page just grew under everything below: Lenis and the site's
    // canvas planes (the timeline pictures) both work from cached bounds.
    // Re-measure both directly — a synthetic window resize event reaches
    // neither.
    var l = window.__lenis; if (l) l.resize();
    var mm = canvas.getMediaManager();
    if (mm && mm.onResize) mm.onResize();
    // and the site's scroll-triggered reveals (footer, timeline) keep the
    // positions they measured before the page grew — re-measure them too,
    // once layout has settled
    var st = nuxtApp() && nuxtApp().$ScrollTrigger;
    if (st && st.refresh) setTimeout(function () { st.refresh(); }, 300);

    var planes = cards.map(function (c, i) {
      var img = c.querySelector('img');
      var m = canvas.addImage(img, 'dw-people-' + i, {});
      if (!m) return null;
      // hidden until its reveal, exactly as DitherImage does it
      var ready = m.textureReady && m.textureReady.then ? m.textureReady : Promise.resolve();
      ready.then(function () { m.prepareOnEnter(); });
      return m;
    });

    // reveal on scroll — ScrollTrigger's "top 85%", staggered along the row
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var i = cards.indexOf(en.target);
        setTimeout(function () {
          en.target.classList.add('is-in');
          if (planes[i]) planes[i].onEnter();
        }, (Array.prototype.indexOf.call(en.target.parentNode.children, en.target) % PER_ROW) * STAGGER);
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    cards.forEach(function (c) { io.observe(c); });

    // the headers scramble in like the site's own labels (nav.js's effect)
    var hio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        hio.unobserve(en.target);
        var nav = window.__aalnav;
        if (nav && nav.scramble) nav.scramble(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    heads.forEach(function (h) { h.classList.add('is-in'); hio.observe(h); });

    // hover: photo resolves from the dither, arrow button scales in
    cards.forEach(function (c, i) {
      var pic = c.querySelector('.dwpeople__pic');
      pic.addEventListener('mouseenter', function () {
        c.classList.add('is-hover');
        if (planes[i]) planes[i].showOriginal();
      });
      pic.addEventListener('mouseleave', function () {
        c.classList.remove('is-hover');
        if (planes[i]) planes[i].showDither();
      });
    });

    window.__aalpeople = { cards: cards, planes: planes };
  }

  function init() {
    var tries = 0;
    var t = setInterval(function () {
      var c = canvasWhenReady();
      if (c) { clearInterval(t); build(c); }
      else if (++tries > 300) clearInterval(t);      // 60s: give up quietly
    }, 200);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
