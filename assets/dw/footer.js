/* =========================================================================
   footer.js — three small edits to the footer, made after hydration
   (the footer is rendered by Nuxt from the payload, so markup is not
   edited in place):

     - the LinkedIn link becomes vava.studio
     - the www.vava.studio line under Privacy / Terms (and its mobile twin)
       becomes "Luxembourg" with the flag
     - the Stay In Touch box gets a terminal-style block cursor, drawn right
       after the typed text while the field has focus
   ========================================================================= */

(function () {
  'use strict';

  var FLAG = '<svg viewBox="0 0 6 4" aria-hidden="true">' +
    '<rect width="6" height="4" fill="#00A3E0"/>' +
    '<rect width="6" height="2.667" fill="#FFFFFF"/>' +
    '<rect width="6" height="1.333" fill="#EF3340"/></svg>';

  function hydrated() {
    var root = document.getElementById('__nuxt');
    var n = root && root.__vue_app__ && root.__vue_app__.$nuxt;
    return n && n.isHydrating === false;
  }

  /* Footer words are bound to the site's scroll-in scramble, which writes
   * the original string back into the first child of each item. So nothing
   * is rewritten: the original element is hidden and ours sits beside it. */
  function replace(a, make) {
    a.classList.add('dwpeople-hidden');
    var next = a.nextElementSibling;
    if (next && next.hasAttribute('data-dw')) return;     // already in place
    var el = make();
    el.setAttribute('data-dw', '');
    a.parentNode.insertBefore(el, a.nextSibling);
  }

  function links(footer) {
    footer.querySelectorAll('a[href*="linkedin.com"]').forEach(function (a) {
      replace(a, function () {
        var b = document.createElement('a');
        b.href = 'https://www.vava.studio'; b.target = '_blank'; b.rel = 'noopener';
        b.textContent = 'vava.studio';
        return b;
      });
    });
    footer.querySelectorAll('a[href*="vava.studio"]:not([data-dw])').forEach(function (a) {
      replace(a, function () {
        var s = document.createElement('span');
        s.className = 'dwlux';
        s.innerHTML = FLAG + '<span>Luxembourg</span>';
        return s;
      });
    });
  }

  /* block cursor: measure the typed text with the input's own font */
  function caret(form) {
    var input = form.querySelector('input[type="email"]');
    var label = input && input.closest('label');
    if (!input || !label || label.querySelector('.dwcaret')) return;
    var block = document.createElement('span');
    block.className = 'dwcaret';
    label.appendChild(block);
    var ctx = document.createElement('canvas').getContext('2d');
    function place() {
      var cs = getComputedStyle(input);
      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var w = ctx.measureText(input.value).width;
      block.style.left = (input.offsetLeft + parseFloat(cs.paddingLeft || 0) + w + 1) + 'px';
      block.style.fontSize = cs.fontSize;
    }
    function on() { place(); block.classList.add('is-on'); }
    function off() { block.classList.remove('is-on'); }
    input.addEventListener('focus', on);
    input.addEventListener('input', on);
    input.addEventListener('blur', off);
  }

  function apply() {
    var footer = document.querySelector('footer');
    if (!footer) return false;
    links(footer);
    footer.querySelectorAll('form[aria-label="Newsletter subscription"]').forEach(caret);
    return true;
  }

  /* Vue may re-render parts of the footer after hydration (mismatch
   * patches), which drops anything added to them. Every change to the
   * footer re-applies; each step is idempotent. */
  function watch() {
    var footer = document.querySelector('footer');
    if (!footer) return;
    var pending = null;
    new MutationObserver(function () {
      clearTimeout(pending);
      pending = setTimeout(apply, 50);
    }).observe(footer, { childList: true, subtree: true });
  }

  function init() {
    var tries = 0;
    var t = setInterval(function () {
      if (hydrated() && apply()) {
        clearInterval(t); watch();
        var n = document.getElementById('__nuxt').__vue_app__.$nuxt;
        if (n.$ScrollTrigger) setTimeout(function () { n.$ScrollTrigger.refresh(); }, 400);
      }
      else if (++tries > 300) clearInterval(t);
    }, 200);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
