/* Info Liquidation Recycle: behaviour shared by every page.
   Top bar and menus, reveal on scroll, green ink, the pickup form, the contact form. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var T = window.ILR_T || {};
  var tr = function (k, d) { return T[k] != null ? T[k] : d; };
  window.ILR = { reduce: reduce, fine: fine, clamp01: clamp01, t: tr };

  /* ------------------------------------------------------------ bar -- */
  var bar = document.getElementById('chrome');
  var svc = document.getElementById('svc');
  var burger = document.getElementById('burger'), drawer = document.getElementById('drawer');
  if (svc) {
    var svcBtn = svc.querySelector('button'), svcTimer;
    var setSvc = function (open) { svc.classList.toggle('open', open); svcBtn.setAttribute('aria-expanded', String(open)); };
    svcBtn.addEventListener('click', function () { setSvc(!svc.classList.contains('open')); });
    svc.addEventListener('mouseenter', function () { clearTimeout(svcTimer); if (fine) setSvc(true); });
    svc.addEventListener('mouseleave', function () { svcTimer = setTimeout(function () { setSvc(false); }, 180); });
    svc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setSvc(false); svcBtn.focus(); } });
    svc.addEventListener('focusout', function (e) { if (!svc.contains(e.relatedTarget)) setSvc(false); });
    document.addEventListener('click', function (e) { if (!svc.contains(e.target)) setSvc(false); });
  }
  if (burger && drawer) {
    var setDrawer = function (open) {
      drawer.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? tr('close', 'Fermer le menu') : tr('open', 'Ouvrir le menu'));
    };
    burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); burger.focus(); } });
  }
  if (bar) {
    var onScroll = function () { bar.classList.toggle('scrolled', scrollY > 24); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* --------------------------------------------- reveal on scroll -- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      [].forEach.call(reveals, function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var d = parseInt(en.target.getAttribute('data-reveal'), 10) || 0;
          setTimeout(function () { en.target.classList.add('in'); }, d);
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      [].forEach.call(reveals, function (el) { io.observe(el); });
    }
  }

  /* -------------------------------------------- green ink on scroll -- */
  var inks = [].slice.call(document.querySelectorAll('.ink')).map(function (el) {
    var words = el.textContent.split(/(\s+)/), spans = [];
    el.textContent = '';
    words.forEach(function (w) {
      if (!w) return;
      if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(w)); return; }
      var s = document.createElement('span'); s.className = 'iw'; s.textContent = w;
      var f = document.createElement('span'); f.className = 'iw__f'; f.setAttribute('aria-hidden', 'true'); f.textContent = w;
      s.appendChild(f); el.appendChild(s); spans.push(s);
    });
    return { el: el, spans: spans, last: -1 };
  });
  window.ILR.ink = function (vh) {
    for (var i = 0; i < inks.length; i++) {
      var k = inks[i], p;
      if (reduce) p = 1;
      else { var r = k.el.getBoundingClientRect(); p = clamp01((vh * 0.88 - r.top) / (vh * 0.34)); }
      if (Math.abs(p - k.last) < 0.002) continue;
      k.last = p;
      for (var j = 0, n = k.spans.length; j < n; j++) k.spans[j].style.setProperty('--f', clamp01(p * n - j).toFixed(3));
    }
  };
  if (inks.length && !document.body.hasAttribute('data-own-loop')) {
    var inkLoop = function () { window.ILR.ink(innerHeight); };
    addEventListener('scroll', inkLoop, { passive: true }); addEventListener('resize', inkLoop); inkLoop();
  }

  /* ------------------------------------------------ the pickup form -- */
  var form = document.getElementById('pickup');
  if (form) {
    var qs = [].slice.call(form.querySelectorAll('.q'));
    var xrows = document.getElementById('xrows'), xadd = document.getElementById('xadd');
    var totN = document.getElementById('tot-n'), totbox = document.getElementById('totbox'), okpill = document.getElementById('okpill');
    var meter = document.getElementById('meter'), qerr = document.getElementById('qerr');
    var pill = document.getElementById('progress-pill'), pillN = document.getElementById('pill-n'), pillM = document.getElementById('pill-m');
    var MIN = 10, MAXX = 10;
    qs.forEach(function (q) {
      var k = q.getAttribute('data-k'), name = q.querySelector('span').textContent;
      var s = document.createElement('div'); s.className = 'stp';
      s.innerHTML = '<button type="button" data-d="-1" aria-label="' + tr('dec', 'Diminuer') + ' : ' + name + '">−</button>' +
        '<input type="number" inputmode="numeric" min="0" max="9999" value="0" name="q_' + k + '" aria-label="' + name + '">' +
        '<button type="button" data-d="1" aria-label="' + tr('inc', 'Augmenter') + ' : ' + name + '">+</button>';
      q.appendChild(s);
      s.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var inp = s.querySelector('input');
        inp.value = Math.max(0, Math.min(9999, (parseInt(inp.value, 10) || 0) + +b.getAttribute('data-d')));
        update();
      });
      s.querySelector('input').addEventListener('input', update);
    });
    var addExtra = function (name, qty) {
      if (xrows.children.length >= MAXX) return null;
      var row = document.createElement('div'); row.className = 'xrow';
      row.innerHTML = '<div class="f"><input type="text" name="x_name" placeholder="' + tr('equipPh', 'Équipement (ex. fax, câbles…)') + '" aria-label="' + tr('equip', 'Équipement') + '"></div>' +
        '<div class="stp"><button type="button" data-d="-1" aria-label="' + tr('dec', 'Diminuer') + '">−</button><input type="number" inputmode="numeric" min="0" max="9999" value="' + (qty || 1) + '" name="x_qty" aria-label="' + tr('qty', 'Quantité') + '"><button type="button" data-d="1" aria-label="' + tr('inc', 'Augmenter') + '">+</button></div>' +
        '<button type="button" class="xrm" aria-label="' + tr('remove', 'Retirer cet équipement') + '">×</button>';
      row.querySelector('input[type=text]').value = name || '';
      row.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('xrm')) { row.remove(); update(); return; }
        var inp = row.querySelector('input[type=number]');
        inp.value = Math.max(0, Math.min(9999, (parseInt(inp.value, 10) || 0) + +b.getAttribute('data-d'))); update();
      });
      row.querySelector('input[type=number]').addEventListener('input', update);
      xrows.appendChild(row); update();
      return row;
    };
    xadd.addEventListener('click', function () { var r = addExtra('', 1); if (r) r.querySelector('input[type=text]').focus(); });
    var total = function () {
      var s = 0;
      [].forEach.call(form.querySelectorAll('.stp input'), function (i) { s += Math.max(0, parseInt(i.value, 10) || 0); });
      return s;
    };
    var update = function () {
      var n = total();
      qs.forEach(function (q) { q.classList.toggle('has', (parseInt(q.querySelector('input').value, 10) || 0) > 0); });
      totN.textContent = n;
      var ok = n >= MIN;
      totbox.classList.toggle('ok', ok);
      okpill.textContent = ok ? tr('ok', 'Admissible, sans frais') : tr('leftPre', 'Encore ') + (MIN - n) + tr('leftPost', '');
      meter.style.setProperty('--m', Math.min(1, n / MIN).toFixed(3));
      if (pillM) pillM.style.setProperty('--m', Math.min(1, n / MIN).toFixed(3));
      if (pillN) pillN.textContent = n + ' / ' + MIN + ' ' + tr('items', 'items');
      if (ok) qerr.classList.remove('on');
      xadd.disabled = xrows.children.length >= MAXX;
      return n;
    };
    if (pill) {
      var pillState = function () {
        var r = form.getBoundingClientRect();
        pill.classList.toggle('on', r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.9);
      };
      addEventListener('scroll', pillState, { passive: true }); pillState();
    }
    // objects on the home page drop straight into this form
    window.ilrAdd = function (cat) {
      if (cat.indexOf('x:') === 0) {
        var label = cat.slice(2), found = null;
        [].forEach.call(xrows.children, function (r) { if (r.querySelector('input[type=text]').value === label) found = r; });
        if (found) { var i = found.querySelector('input[type=number]'); i.value = (parseInt(i.value, 10) || 0) + 1; }
        else addExtra(label, 1);
      } else {
        var inp = form.querySelector('[name="q_' + cat + '"]');
        if (inp) inp.value = (parseInt(inp.value, 10) || 0) + 1;
      }
      return update();
    };
    update();
    var setErr = function (name, bad) { var f = form.querySelector('[data-f="' + name + '"]'); if (f) f.classList.toggle('err', bad); return bad; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };
      var bad = false;
      bad = setErr('title', !form.querySelector('[name=title]:checked')) || bad;
      bad = setErr('firstName', !v('firstName')) || bad;
      bad = setErr('lastName', !v('lastName')) || bad;
      bad = setErr('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) || bad;
      bad = setErr('phone', v('phone').replace(/\D/g, '').length < 10) || bad;
      bad = setErr('address', !v('address')) || bad;
      bad = setErr('city', !v('city')) || bad;
      bad = setErr('postalCode', !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(v('postalCode'))) || bad;
      bad = setErr('cert', !form.querySelector('[name=certificate]:checked')) || bad;
      var few = total() < MIN; qerr.classList.toggle('on', few); bad = few || bad;
      document.getElementById('formerr').classList.toggle('on', bad);
      document.getElementById('forminfo').classList.toggle('on', !bad);
      if (bad) { var first = form.querySelector('.f.err, .qerr.on'); if (first) first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
      else document.getElementById('forminfo').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    form.addEventListener('input', function (e) { var f = e.target.closest('.f.err'); if (f) f.classList.remove('err'); });
    form.addEventListener('change', function (e) { var f = e.target.closest('.err'); if (f) f.classList.remove('err'); });
  }

  /* ---------------------------------------------- the contact form -- */
  var cform = document.getElementById('contactform');
  if (cform) {
    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { return String(cform.elements[n].value || '').trim(); };
      var bad = false, set = function (n, b) { cform.querySelector('[data-f="' + n + '"]').classList.toggle('err', b); bad = b || bad; };
      set('name', !v('name')); set('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))); set('message', !v('message'));
      document.getElementById('c-err').classList.toggle('on', bad);
      document.getElementById('c-info').classList.toggle('on', !bad);
    });
    cform.addEventListener('input', function (e) { var f = e.target.closest('.f.err'); if (f) f.classList.remove('err'); });
  }
})();
