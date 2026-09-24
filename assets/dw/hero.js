/* =========================================================================
   hero.js — the opening sequence.

   Follows the Deep White original:

     progress   the scene posts threejs-scene-progress {progress} while it
                loads; that is blended with the host page's own load event,
                exactly as the original blended iframe and parent progress,
                so the counter cannot reach 100% before either is ready
     ready      at 100% the preloader fades and Explore starts pulsing
     explore    Explore fades itself and the caption, then tells the scene to
                begin — the scene keeps its own wheel handling disabled until
                it receives start-scene-animation
     phases     the scene runs cloud -> pull back -> frame on wheel input
     release    at iframeScrolledToEnd the page scroll is handed back

   The caption is faded by the explore step, not by scroll. That is the bug
   this replaces: it used to sit there through the whole scene because
   nothing ever removed it.
   ========================================================================= */

(function () {
  'use strict';


  function init() {
    const hero = document.getElementById('dwhero');
    const scene = document.getElementById('dwhero-scene');
    const pre = document.getElementById('dwpre');
    const pct = document.getElementById('dwpre-pct');
    const bar = document.getElementById('dwpre-bar');
    const explore = document.getElementById('dwhero-explore');
    if (!hero || !scene) return;

    const root = document.documentElement;
    let sceneProgress = 0, pageProgress = 0, shown = 0;
    let ready = false, started = false, released = false;

    /* The page must ALWAYS open on the hero. Two native browser behaviours
     * were scrolling it away on their own, seconds after load — which read
     * as "a timer skips the animation and the frame":
     *   - scroll restoration: on reload Chrome re-applies the previous
     *     scroll position once layout settles, however deep it was
     *   - anchor scrolling: a #hash left in the URL by an earlier nav click
     *     is scrolled to at load, with retries as content lands
     * Both are disabled here; in-page navigation still works, it just no
     * longer writes state the next load would obey. */
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
      // Nuxt's router flips this back to 'auto' during hydration. What
      // matters is the value at the moment the page is LEFT — that is what
      // the next load obeys — so the last word is taken on the way out.
      window.addEventListener('load',
        () => { history.scrollRestoration = 'manual'; });
      window.addEventListener('beforeunload',
        () => { history.scrollRestoration = 'manual'; });
    }
    if (location.hash)
      history.replaceState(null, '', location.pathname + location.search);

    root.classList.add('dwhero-lock');

    /* Scroll is held by STOPPING LENIS, not by fighting it.
     *
     * This page's scrolling is driven entirely by Lenis (exposed as
     * window.__lenis by tools/expose_lenis.py). Every earlier attempt to
     * hold the page without it went wrong in a characteristic way:
     * overflow:hidden is ignored because Lenis writes scrollTop itself; a
     * native scrollTo desyncs its internal position and the next wheel
     * gesture rubber-bands mid-hero; a scroll-event pin is a tug of war
     * that reads as distortion.
     *
     * Lenis stopped swallows ALL wheel input cleanly — that is the same
     * mechanism the site itself uses during page transitions.
     *
     * The re-stop interval matters: the site's own boot emits scroll:unlock
     * about two seconds in, and its header component calls lenis.start() on
     * that event. Without the guard, that start would re-enable scrolling
     * mid-scene. stop() on a stopped instance is a no-op, so this is cheap. */
    let lenisGuard = null;
    function startGuard() {
      if (lenisGuard) return;
      lenisGuard = setInterval(() => {
        const l = window.__lenis;
        if (!l) return;
        if (released) { clearInterval(lenisGuard); lenisGuard = null; return; }
        if (!l.isStopped) l.stop();
        if (scrollY !== 0) {
          l.scrollTo(0, { immediate: true, force: true });
          window.scrollTo(0, 0);   // belt and braces against native scrolls
        }
      }, 200);
    }
    startGuard();

    function paint() {
      // blend the two sources, and never let the number go backwards — the
      // scene reports per-asset and can dip as new batches are queued
      const total = Math.round(sceneProgress * 0.5 + pageProgress * 0.5);
      shown = Math.max(shown, Math.min(total, 100));
      if (pct) pct.textContent = shown + '%';
      if (bar) bar.style.width = shown + '%';
      if (shown >= 100 && !ready) becomeReady();
    }

    function becomeReady() {
      ready = true;
      hero.classList.add('is-ready');
      if (pre) {
        pre.classList.add('is-done');
        setTimeout(() => pre.classList.add('is-gone'), 1600);
      }
    }

    function start() {
      if (started) return;
      started = true;
      hero.classList.add('is-exploring');
      // let the caption and prompt finish fading before the scene begins, so
      // the two do not overlap
      setTimeout(() => {
        hero.classList.add('is-started');
        scene.contentWindow.postMessage({ type: 'start-scene-animation' }, '*');
      }, 800);
    }

    function release(reason) {
      if (released) return;
      released = true;
      root.classList.remove('dwhero-lock');
      // stop the iframe swallowing the wheel, or scrolling back up over the
      // hero does nothing at all
      hero.classList.add('is-released');
      // Hand the wheel back through Lenis itself — started at rest, from a
      // position it agrees with, so nothing rubber-bands. No auto-scroll:
      // the user's own gesture takes the page down.
      const l = window.__lenis;
      if (l) {
        l.scrollTo(0, { immediate: true, force: true });
        l.start();
        // the lock held body at viewport height, so Lenis's cached limit is
        // 0 — re-measure now that the page has its real height back
        l.resize();
      }
      console.log('[dwhero] released:', reason);
    }

    window.addEventListener('message', e => {
      const d = e.data || {};
      if (d.type === 'threejs-scene-progress') {
        sceneProgress = d.progress ?? 0; paint();
      } else if (d.type === 'threejs-scene-loaded') {
        sceneProgress = 100; paint();
      } else if (d.type === 'iframeScrolledToEnd') {
        release('scene reached the frame');
      }
    });

    if (document.readyState === 'complete') { pageProgress = 100; paint(); }
    else window.addEventListener('load', () => { pageProgress = 100; paint(); });

    if (explore) explore.addEventListener('click', start);

    /* ---- scrolling back INTO the scene ---------------------------------
     * The scene supports walking its phases backwards (frame -> pull back
     * -> cloud); what was missing is any way to hand it the wheel again.
     * At the top of the page, an upward gesture re-locks scrolling and
     * returns the wheel to the scene. When the scene reaches the frame
     * again it re-posts iframeScrolledToEnd and the page is released again
     * — the loop works in both directions indefinitely. */
    function reEngage(deltaY) {
      released = false;
      // stop Lenis HERE, synchronously — the guard interval is only a
      // backstop against the site's own start() calls, and browser timer
      // throttling can delay it by whole seconds
      const l = window.__lenis;
      if (l) { l.stop(); l.scrollTo(0, { immediate: true, force: true }); }
      root.classList.add('dwhero-lock');
      hero.classList.remove('is-released');   // iframe takes the pointer again
      startGuard();
      forward(deltaY);
      console.log('[dwhero] re-engaged the scene');
    }

    // Wheel events over the parent's own fixed elements (nav, captions)
    // never reach the iframe's document. Forwarding them keeps the scene
    // responsive wherever the pointer happens to be. No double-fire risk:
    // wheels that DO land on the iframe stay inside its document.
    function forward(deltaY) {
      const w = scene.contentWindow;
      if (w) w.dispatchEvent(new w.WheelEvent('wheel', { deltaY }));
    }

    window.addEventListener('wheel', e => {
      if (!started) return;
      if (!released) { forward(e.deltaY); return; }
      if (scrollY < 2 && e.deltaY < 0) reEngage(e.deltaY);
    }, { passive: true });

    // No timers and no shortcuts. The 20s counter fallback and the Escape
    // skip are both gone on request: the loading screen completes only on
    // real progress, and the ONLY way past the scene is playing it — wheel
    // to the frame. Nothing else releases the page.

    window.__dwhero = { start, release, forward, get state() {
      return { shown, ready, started, released }; } };
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
