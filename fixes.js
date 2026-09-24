/* fixes.js — re-drives JS behavior that capture-build's <script> stripping removed.
 *
 * Values and mechanisms come from the captured artifacts only (dom.html, the
 * self-hosted stylesheets, behaviors-live.json). Nothing here is eyeballed.
 *
 * ---------------------------------------------------------------------------
 * Restore native scrolling (Lenis smooth-scroll lock)
 * ---------------------------------------------------------------------------
 * The live page runs Lenis: <html class="lenis"> and
 * <body class="smoothscroll-body smoothscroll-enabled"> with the captured CSS
 * setting `body { overflow: hidden }`. Lenis itself consumes wheel events and
 * scrolls the document from JS, so the CSS lock is harmless THERE.
 *
 * capture-build strips <script> by design, so no Lenis instance exists in the
 * clone — but its CSS lock survives byte-exact. Result: the document is still
 * scrollable programmatically (scrollHeight 8740 vs clientHeight 814, which is
 * why capture-run's scripted sweep reached 9115px and every pixel gate passed)
 * while a human's wheel does nothing at all.
 *
 * The pixel gates cannot see this: geometry, paint and coverage are all exact.
 * It is a pure interaction defect, and it is the one real miss of this run.
 *
 * Fix: release only the overflow lock — the single declaration Lenis would have
 * compensated for. Verified not to shift layout: innerWidth, clientWidth and the
 * first block's border-box width are byte-identical before and after (macOS
 * overlay scrollbars take no space), so the 0/3147 visual and 0/12168 strict
 * results are preserved. The captured class names are left in place so every
 * other rule keyed on `.lenis` / `.smoothscroll-*` still applies exactly.
 */
(function () {
  'use strict';

  function releaseScrollLock() {
    var b = document.body;
    if (!b) return;
    if (getComputedStyle(b).overflowY === 'hidden') {
      // setProperty with 'important' — the captured rule may itself be !important.
      b.style.setProperty('overflow', 'visible', 'important');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', releaseScrollLock);
  } else {
    releaseScrollLock();
  }
})();
