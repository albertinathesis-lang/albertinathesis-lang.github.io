/* =========================================================================
   nav.js — hover scramble, and light/dark flipping for the fixed nav.

   The scramble is the reference's `typeChars` effect, reimplemented:
   GSAP's ScrambleTextPlugin is a Club GreenSock plugin and is not in the
   free distribution this build ships.

   Writes textContent only, never attributes, and always restores the exact
   original string — including when the pointer leaves mid-run.
   ========================================================================= */

(function () {
  'use strict';

  const CHARS = '0123456789&x';
  const DURATION = 620;
  const TICK = 45;
  const pick = () => CHARS[(Math.random() * CHARS.length) | 0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stop(el) {
    if (el.__raf) cancelAnimationFrame(el.__raf);
    el.__raf = null;
    el.__run = (el.__run || 0) + 1;        // invalidate any queued frame
    if (el.__orig != null) el.textContent = el.__orig;
    el.removeAttribute('data-scrambling');
    el.style.removeProperty('--sw');
  }

  function scramble(el) {
    stop(el);                               // never trust a latched flag
    const original = el.__orig;
    const n = original.length;
    if (!n) return;

    // freeze the resting width, and flush layout, BEFORE any glyph changes —
    // otherwise the lock and the first swap land in the same frame and the
    // new string is laid out against the old box for one frame
    el.style.setProperty('--sw', el.getBoundingClientRect().width + 'px');
    el.setAttribute('data-scrambling', '');
    void el.offsetWidth;

    // fixed-length buffer: the output cannot be any length but n, whatever
    // happens with timing or overlapping runs
    const buf = original.split('');
    const myRun = (el.__run = (el.__run || 0) + 1);
    const t0 = performance.now();
    let lastRoll = 0;

    (function frame(now) {
      if (el.__run !== myRun) return;
      const p = Math.min(1, (now - t0) / DURATION);
      const done = Math.floor(p * n);
      const roll = now - lastRoll >= TICK;
      if (roll) lastRoll = now;
      for (let i = 0; i < n; i++) {
        if (i < done) buf[i] = original[i];
        else if (roll) buf[i] = original[i] === ' ' ? ' ' : pick();
      }
      el.textContent = buf.join('');
      if (p < 1) el.__raf = requestAnimationFrame(frame);
      else stop(el);
    })(performance.now());
  }

  function init() {
    const nav = document.querySelector('.aalnav');
    if (!nav) return;

    if (!reduce) {
      nav.querySelectorAll('.aalnav__link').forEach(el => {
        el.__orig = el.textContent;
        el.addEventListener('mouseenter', () => scramble(el));
        el.addEventListener('mouseleave', () => stop(el));
        el.addEventListener('focus', () => scramble(el));
        el.addEventListener('blur', () => stop(el));
      });
    }

    /* Colour is driven by the SCENE'S PHASE, not by sampling the backdrop.
     * The nav only exists over the hero now, and what is behind it there is
     * the scene iframe — sampling always found the hero's own dark backing
     * and kept the text white even over the pale gallery wall. hero.js
     * forwards iframePhase: phase 1 (cloud, dark sky) stays mercury; phases
     * 2 and 3 (pulled back / at the frame, grey wall) flip to blue. */

    /* ---- in-page navigation --------------------------------------------
     * Every nav item scrolls to its section INSIDE this page — nothing
     * navigates away. A plain hash link cannot do this here: while the
     * hero scene is playing the page is locked, and afterwards scrolling
     * belongs to Lenis, which a native anchor jump desyncs (the next wheel
     * gesture would rubber-band). So clicks are intercepted and the scroll
     * is driven through Lenis itself.
     *
     * If the target section is collapsed (height 0 — the removed Programs
     * block), the scroll lands on the next visible section instead. */
    nav.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      let el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      while (el && el.offsetHeight === 0 && el.nextElementSibling)
        el = el.nextElementSibling;

      /* A click during the scene NO LONGER skips it. The scene is driven
       * through its remaining phases — the same wheel input the user would
       * give, so the same camera moves play at their own pace — and only
       * when the frame completes (the scene posts iframeScrolledToEnd and
       * the page releases itself) does the glide to the target begin.
       * Repeated nudges are safe: the scene ignores wheel input while a
       * phase transition is running. A second click simply retargets. */
      const dw = window.__dwhero;
      if (dw && !dw.state.released) {
        pendingTarget = el;
        dw.start();                    // covers a click on the Explore screen
        if (!sceneDriver) {
          sceneDriver = setInterval(() => {
            if (dw.state.released) {
              clearInterval(sceneDriver); sceneDriver = null;
              const t = pendingTarget; pendingTarget = null;
              if (t) glideTo(t);
            } else dw.forward(120);
          }, 700);
        }
        return;
      }

      glideTo(el);
    });

    let pendingTarget = null, sceneDriver = null;

    function glideTo(el) {
      const y = el.getBoundingClientRect().top + window.scrollY;
      const l = window.__lenis;
      // Lenis clamps every target to its cached limit, and that cache can
      // date from the scroll-locked phase (body height 100% -> limit 0,
      // every scroll target clamped to the top). Re-measure first.
      //
      // The duration scales with distance. A fixed short glide teleported
      // past the middle sections faster than their scroll-driven reveals
      // could fire — the page arrived "directly", the skipped sections
      // never played their animations, and scrolling back up found them in
      // that unplayed state. Travelling at a bounded speed keeps the whole
      // journey inside the site's natural movement: every section scrolls
      // past for real and every reveal fires in order.
      if (l) {
        l.resize();
        const dist = Math.abs(y - window.scrollY);
        const duration = Math.min(4.5, Math.max(1.6, dist / 900));
        l.scrollTo(y, { duration });
      }
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }

    /* Timeline milestone cards keep hover (it reveals their image) but do
     * not navigate — their href is cancelled here rather than by killing
     * pointer-events, which would kill the hover reveal too. */
    document.addEventListener('click', function (e) {
      var card = e.target.closest(
        'section[data-slice-type="latest_news"] a[href="#timeline"]');
      if (card) e.preventDefault();
    });

    /* ---- executive pictures -> LinkedIn --------------------------------
     * The cards live inside the Nuxt render, so markup cannot be edited in
     * place — a delegated click on the section survives every re-render.
     * Card order is fixed: 01 Fedra, 02 Vahid, 03 Tom. */
    var EXEC_LINKS = [
      'https://www.linkedin.com/in/fedrafateh',
      'https://www.linkedin.com/in/vahid-rastgou-666b391b7/',
      'https://www.linkedin.com/in/tomcollinslux'
    ];
    document.addEventListener('click', function (e) {
      var pic = e.target.closest(
        'section[data-slice-type="projects"] [data-dither-image]');
      if (!pic) return;
      var sec = pic.closest('section[data-slice-type="projects"]');
      var pics = [].slice.call(
        sec.querySelectorAll('[data-dither-image]'));
      var i = pics.indexOf(pic);
      if (i >= 0 && EXEC_LINKS[i])
        window.open(EXEC_LINKS[i], '_blank', 'noopener');
    });

    /* ---- legal pages ----------------------------------------------------
     * Privacy Policy and Terms are static pages of their own, outside the
     * Nuxt app. The footer links to them are router links, which would try
     * to resolve the path inside the app (and fail). Caught in the capture
     * phase, ahead of the router, and turned into a real navigation. */
    var LEGAL = { '/privacy-policy': '/privacy-policy/', '/terms-and-conditions': '/terms-and-conditions/' };
    document.addEventListener('click', function (e) {
      // the click may land on the link, or on the wrapper span the site's
      // reveal puts around it (the link's own box does not take the hit)
      var t = e.target;
      var a = (t.closest && t.closest('a[href]')) ||
              (t.querySelector && t.querySelector('a[href="/privacy-policy"], a[href="/terms-and-conditions"]'));
      if (!a) return;
      var to = LEGAL[a.getAttribute('href')];
      if (!to) return;
      e.preventDefault(); e.stopPropagation();
      window.location.href = to;
    }, true);

    /* ---- outbound links -----------------------------------------------
     * Every link that opens a new tab gets rel="noopener noreferrer" at the
     * moment it is used, whichever layer rendered it (the clone's Vue
     * markup, the payload, or ours). noopener stops the opened page from
     * reaching back to this one; noreferrer keeps the visitor's path here
     * out of the other site's logs. Runs on pointerdown so middle-click and
     * cmd-click are covered as well as click. */
    function harden(e) {
      var a = e.target.closest && e.target.closest('a[target="_blank"], a[href^="http"]');
      if (!a) return;
      if (a.target === '_blank' || a.host !== location.host)
        a.rel = 'noopener noreferrer';
    }
    document.addEventListener('pointerdown', harden, true);
    document.addEventListener('click', harden, true);

    window.__aalnav = { scramble, stop };
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
