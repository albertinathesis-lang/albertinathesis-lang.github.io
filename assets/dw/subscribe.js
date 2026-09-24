/* =========================================================================
   subscribe.js — makes the Stay In Touch box work on a static site.

   The site's newsletter component (footer and menu) validates the address,
   shows a spinner and a message, and POSTs {email} to /api/newsletter — a
   Nuxt server route the static build does not have. This answers that call
   instead: window.fetch is wrapped before the app loads, and a request to
   /api/newsletter is turned into a write to the subscribers table.

   Configure STORE below (Supabase REST: project URL + publishable key, with
   an insert-only policy on the table). Until it is configured, the address
   is handed to the lab's mailbox through the visitor's mail client, so the
   box never dead-ends.
   ========================================================================= */

(function () {
  'use strict';

  var STORE = {
    url: '',          // e.g. https://xxxx.supabase.co
    key: '',          // the project's publishable (anon) key
    table: 'subscribers',
    fallbackTo: 'director@nftorino.com'
  };

  function ok(body) {
    return new Response(JSON.stringify(body || { ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  function fail(message, status) {
    return new Response(JSON.stringify({ message: message }),
      { status: status || 500, headers: { 'Content-Type': 'application/json' } });
  }

  function emailOf(init) {
    try {
      var b = init && init.body;
      if (typeof b === 'string') b = JSON.parse(b);
      return b && String(b.email || '').trim();
    } catch (e) { return ''; }
  }

  async function subscribe(email) {
    if (!email) return fail('Please enter your email', 400);
    if (STORE.url && STORE.key) {
      var r = await realFetch(STORE.url.replace(/\/$/, '') + '/rest/v1/' + STORE.table, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': STORE.key,
          'Authorization': 'Bearer ' + STORE.key,
          'Prefer': 'return=minimal,resolution=ignore-duplicates'
        },
        body: JSON.stringify({ email: email, source: location.hostname || 'local' })
      });
      if (r.ok || r.status === 409) return ok();
      return fail('Something went wrong. Please try again.', r.status);
    }
    // not configured yet: hand the address to the mailbox via the mail client
    var href = 'mailto:' + STORE.fallbackTo +
      '?subject=' + encodeURIComponent('Stay in touch') +
      '&body=' + encodeURIComponent('Please add me to the AI Art Lab list: ' + email);
    window.location.href = href;
    return ok();
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/\/api\/newsletter(\?|$)/.test(url)) return subscribe(emailOf(init));
    return realFetch(input, init);
  };

  window.__aalSubscribe = { STORE: STORE, subscribe: subscribe };
})();
