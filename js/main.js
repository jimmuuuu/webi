/* Webi — site interactions */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Mobile nav toggle */
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Hero typing effect */
  var typingEl = document.getElementById('typing-word');
  if (typingEl && !reducedMotion) {
    var words = ['Work.', 'Convert.', 'Perform.', 'Stand Out.'];
    var wi = 0, ci = words[0].length, deleting = false;
    var caret = document.createElement('style');
    caret.textContent = '#typing-word{animation:cb .75s step-end infinite;}@keyframes cb{0%,100%{border-color:#e5111b}50%{border-color:transparent}}';
    document.head.appendChild(caret);
    var type = function () {
      var cur = words[wi];
      if (!deleting) {
        typingEl.textContent = cur.slice(0, ci + 1);
        ci++;
        if (ci === cur.length) { deleting = true; setTimeout(type, 1800); return; }
      } else {
        typingEl.textContent = cur.slice(0, ci - 1);
        ci--;
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
      }
      setTimeout(type, deleting ? 55 : 95);
    };
    setTimeout(function () { deleting = true; type(); }, 1600);
  }

  /* Animated stat counters */
  if ('IntersectionObserver' in window && !reducedMotion) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.dataset.target, 10);
        var prefix = el.dataset.prefix || '';
        var suffix = el.dataset.suffix || '';
        var start = performance.now();
        var update = function (now) {
          var p = Math.min((now - start) / 1600, 1);
          var ease = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(ease * target) + suffix;
          if (p < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.stat-num[data-target]').forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  /* Scroll-in reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* FAQ accordion */
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.parentElement;
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function (i) {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* Button ripple */
  document.querySelectorAll('.btn-gradient, .form-submit, .pricing-btn-filled').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var rect = this.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var r = document.createElement('span');
      r.className = 'ripple';
      r.style.width = r.style.height = size + 'px';
      r.style.left = (e.clientX - rect.left - size / 2) + 'px';
      r.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    });
  });

  /* Contact form — validation + AJAX submit to FormSubmit */
  var form = document.getElementById('contact-form');
  if (form) {
    var statusBox = document.getElementById('form-status');
    var submitBtn = form.querySelector('.form-submit');

    var setError = function (input, message) {
      var group = input.closest('.form-group');
      var errorEl = group && group.querySelector('.form-error');
      if (message) {
        input.classList.add('invalid');
        if (group) group.classList.add('has-error');
        if (errorEl) errorEl.textContent = message;
      } else {
        input.classList.remove('invalid');
        if (group) group.classList.remove('has-error');
      }
    };

    var validate = function () {
      var ok = true;
      var name = form.elements.name;
      var email = form.elements.email;
      var message = form.elements.message;

      if (!name.value.trim()) { setError(name, 'Please enter your name.'); ok = false; } else { setError(name, null); }

      var emailVal = email.value.trim();
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        setError(email, 'Please enter a valid email address.'); ok = false;
      } else { setError(email, null); }

      if (!message.value.trim()) { setError(message, 'Tell us a little about your project.'); ok = false; } else { setError(message, null); }

      return ok;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusBox.className = 'form-status';
      statusBox.textContent = '';

      /* Honeypot: bots fill this hidden field; humans never see it */
      if (form.elements._honey && form.elements._honey.value) return;

      if (!validate()) {
        var firstInvalid = form.querySelector('.invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      var data = new FormData(form);
      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      }).then(function () {
        form.reset();
        statusBox.className = 'form-status success';
        statusBox.textContent = "✓ Thanks — your message is on its way. We'll get back to you within 24 hours.";
        statusBox.focus();
      }).catch(function () {
        statusBox.className = 'form-status error';
        statusBox.textContent = 'Something went wrong sending your message. Please email us directly at webidesignedit@gmail.com.';
      }).finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Let's Build Something →";
      });
    });
  }
})();
