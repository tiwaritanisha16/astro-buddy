/* Astro Buddy Numerology AI - front-end behaviour. No API keys here; everything secret stays on the server. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ---------- mobile menu ----------
  var burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });
  }

  // ---------- scroll reveal ----------
  var items = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('visible'); }); }

  // ---------- hero heading: typed once, then stays ----------
  var typed = $('#typed');
  if (typed && !reduce) {
    var full = typed.getAttribute('data-text') || typed.textContent, i = 0;
    typed.setAttribute('aria-label', full);
    typed.textContent = '';
    typed.classList.add('typed-cursor');
    (function tick() {
      i++; typed.textContent = full.slice(0, i);
      if (i < full.length) { setTimeout(tick, 48); }
      else { setTimeout(function () { typed.classList.remove('typed-cursor'); }, 1800); }
    })();
  }

  // ---------- back-to-top ----------
  var top = $('#toTop');
  if (top) {
    window.addEventListener('scroll', function () { top.classList.toggle('show', window.scrollY > 600); }, { passive: true });
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  }

  // ---------- copy buttons ----------
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy'), label = btn.textContent;
      function done(ok) { btn.textContent = ok ? 'Copied ✓' : 'Copy not supported'; setTimeout(function () { btn.textContent = label; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); }
      else { done(false); }
    });
  });
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  // ---------- Razorpay button (payment page) ----------
  var rzpBtn = $('#rzpBtn');
  if (rzpBtn) {
    var payError = $('#payError');
    var showPayError = function (msg) { payError.textContent = msg; payError.hidden = false; };
    rzpBtn.addEventListener('click', function () {
      payError.hidden = true; rzpBtn.disabled = true;
      fetch(rzpBtn.dataset.create, { method: 'POST' }).then(function (r) { return r.json(); }).then(function (order) {
        if (order.error) { throw new Error(order.error); }
        var rzp = new Razorpay({
          key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
          name: 'Astro Buddy', description: 'Complete Personal Reading', prefill: { name: order.name },
          theme: { color: '#2a52be' },
          handler: function (response) {
            fetch(rzpBtn.dataset.verify, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(response) })
              .then(function (r) { return r.json(); })
              .then(function (res) { if (res.redirect) { window.location = res.redirect; } else { showPayError(res.error || 'Payment could not be verified.'); } })
              .catch(function () { showPayError('Network problem while verifying payment.'); });
          },
          modal: { ondismiss: function () { rzpBtn.disabled = false; } }
        });
        rzp.open();
      }).catch(function (err) { showPayError(err.message || 'Could not start the payment.'); rzpBtn.disabled = false; });
    });
  }

  // ---------- reading form ----------
  var form = $('#readingForm');
  if (!form) { return; }
  var MAX_MB = parseInt(form.getAttribute('data-max-mb') || '5', 10);
  var ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'webp'];
  var errBox = $('#formErrors'), consent = $('#photo_consent'), consentWrap = $('#consentWrap');
  var gm = $('.g-m'), gf = $('.g-f');

  function showErrors(list) {
    errBox.innerHTML = '<strong>Please fix the following:</strong><ul>' + list.map(function (m) { return '<li>' + m.replace(/</g, '&lt;') + '</li>'; }).join('') + '</ul>';
    errBox.hidden = false; errBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }
  if (errBox && !errBox.hidden) { errBox.scrollIntoView({ block: 'center' }); }

  // gender -> highlight the matching hand guidance (the full guidance is always visible)
  var handNote = $('#handNote');
  var NOTES = { Male: 'You selected Male: please use your RIGHT hand.', Female: 'You selected Female: please use your LEFT hand.', Other: 'For this choice, please upload one clear hand photo (either hand is fine).' };
  function updateGender() {
    var c = form.querySelector('input[name="gender"]:checked');
    gm.classList.toggle('on', !!c && c.value === 'Male'); gf.classList.toggle('on', !!c && c.value === 'Female');
    handNote.textContent = c ? NOTES[c.value] : 'Choose your gender above to see which hand to use.';
  }
  $$('input[name="gender"]', form).forEach(function (r) { r.addEventListener('change', updateGender); });
  updateGender();

  function fileError(file, label) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ALLOWED_EXT.indexOf(ext) === -1) { return 'The ' + label + ' photo must be a PNG, JPG, JPEG or WEBP image.'; }
    if (file.size > MAX_MB * 1024 * 1024) { return 'The ' + label + ' photo is larger than ' + MAX_MB + ' MB.'; }
    if (file.size === 0) { return 'The ' + label + ' photo appears to be empty.'; }
    return '';
  }
  function anyPhoto() { return !!(($('#face_image').files || [])[0] || ($('#palm_image').files || [])[0]); }
  function refreshConsent() { consentWrap.classList.toggle('need', anyPhoto() && !consent.checked); $('#consentHint').hidden = !anyPhoto(); }

  function setupUpload(inputId, previewId, zoneId, removeId, label) {
    var input = $('#' + inputId), img = $('#' + previewId), zone = $('#' + zoneId), rm = $('#' + removeId), url = null;
    function show() {
      var file = input.files && input.files[0];
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (!file) { img.hidden = true; zone.classList.remove('has-image'); rm.hidden = true; refreshConsent(); return; }
      var err = fileError(file, label);
      if (err) { input.value = ''; img.hidden = true; zone.classList.remove('has-image'); rm.hidden = true; showErrors([err]); refreshConsent(); return; }
      url = URL.createObjectURL(file); img.src = url; img.hidden = false; zone.classList.add('has-image'); rm.hidden = false; refreshConsent();
    }
    input.addEventListener('change', show);
    rm.addEventListener('click', function () { input.value = ''; show(); });
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); }); });
    zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; show(); } });
    zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  }
  setupUpload('face_image', 'facePreview', 'faceZone', 'faceRemove', 'face');
  setupUpload('palm_image', 'palmPreview', 'palmZone', 'palmRemove', 'palm');
  consent.addEventListener('change', refreshConsent); refreshConsent();

  // progress indicator: 1 about you, 2 categories, 3 photos (optional)
  var bars = $$('#progress span');
  function updateProgress() {
    var a = $('#name').value.trim() && form.querySelector('input[name="gender"]:checked') && $('#dob').value;
    var b = form.querySelector('input[name="categories"]:checked');
    bars[0].classList.toggle('done', !!a); bars[1].classList.toggle('done', !!b); bars[2].classList.toggle('done', !!(a && b));
  }
  form.addEventListener('input', updateProgress); form.addEventListener('change', updateProgress); updateProgress();

  form.addEventListener('submit', function (e) {
    var errors = [];
    $$('.invalid', form).forEach(function (el) { el.classList.remove('invalid'); el.removeAttribute('aria-invalid'); });
    function bad(el, msg) { errors.push(msg); if (el) { el.classList.add('invalid'); el.setAttribute('aria-invalid', 'true'); } }

    var name = $('#name'); if (!name.value.trim()) { bad(name, 'Please enter your full name.'); }
    if (!form.querySelector('input[name="gender"]:checked')) { bad(null, 'Please select your gender.'); }
    var dob = $('#dob');
    if (!dob.value) { bad(dob, 'Please enter your date of birth.'); }
    else if (new Date(dob.value) > new Date() || dob.value < '1900-01-01') { bad(dob, 'Please enter a realistic date of birth.'); }
    if (!form.querySelector('input[name="categories"]:checked')) { bad(null, 'Please choose at least one reading category.'); }
    [['face_image', 'faceZone', 'face'], ['palm_image', 'palmZone', 'palm']].forEach(function (c) {
      var f = $('#' + c[0]).files[0]; if (f) { var fe = fileError(f, c[2]); if (fe) { bad($('#' + c[1]), fe); } }
    });
    if (anyPhoto() && !consent.checked) { bad(consent, 'To use a photo, please tick the Gemini AI consent box - or remove the photo, which is optional.'); }

    if (errors.length) { e.preventDefault(); showErrors(errors); return; }
    errBox.hidden = true;
    // honest loading message: only claim AI work when a photo will really be sent to the AI
    var ov = $('#loadingOverlay');
    $('#loadingText').textContent = anyPhoto()
      ? 'Your photo is being analysed by Google Gemini AI. This can take up to a minute.'
      : 'Calculating your numbers and preparing your preview. This takes a moment.';
    $('#loadingTitle').textContent = anyPhoto() ? 'Contacting the AI astrologer…' : 'Preparing your reading…';
    ov.hidden = false; $('#submitBtn').disabled = true;
  });

  window.addEventListener('pageshow', function () {
    var o = $('#loadingOverlay'); if (o) { o.hidden = true; }
    var b = $('#submitBtn'); if (b) { b.disabled = false; }
  });
})();
