/* Webi — premium interactions
   Lenis owns scroll, GSAP + ScrollTrigger own scroll-based motion,
   SplitType handles line reveals. Everything degrades gracefully:
   with no JS (or reduced motion) the page is simply fully visible. */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motionOK = hasGsap && !reducedMotion;
  var lenis = null;

  /* ------------------------------------------------------------------
     Smooth momentum scroll (Lenis) driven by the GSAP ticker
     ------------------------------------------------------------------ */
  if (motionOK && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Anchor links — route through Lenis when available */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) {
        e.preventDefault();
        if (lenis) { lenis.scrollTo(0); } else { window.scrollTo({ top: 0 }); }
        return;
      }
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -70, duration: 1.1 });
      } else {
        target.scrollIntoView(reducedMotion ? {} : { behavior: 'smooth' });
      }
    });
  });

  /* ------------------------------------------------------------------
     Nav — shrink on scroll, hide on scroll-down, return on scroll-up
     ------------------------------------------------------------------ */
  var nav = document.getElementById('site-nav');
  var lastY = 0;
  var onScrollY = function (y) {
    nav.classList.toggle('is-scrolled', y > 40);
    if (y > 480 && y > lastY + 6) { nav.classList.add('is-hidden'); }
    else if (y < lastY - 6 || y <= 480) { nav.classList.remove('is-hidden'); }
    lastY = y;
  };
  if (nav) {
    if (lenis) {
      lenis.on('scroll', function (e) { onScrollY(e.scroll); });
    } else {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { onScrollY(window.scrollY); ticking = false; });
      }, { passive: true });
    }
    onScrollY(window.scrollY);
  }

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

  /* ------------------------------------------------------------------
     Entrance + scroll reveals (fire once, ease-out, transform+opacity)
     ------------------------------------------------------------------ */
  if (motionOK) {
    var EASE = 'power3.out';

    /* Hero headline — split into lines once fonts are ready */
    var splitTargets = document.querySelectorAll('[data-split]');
    var heroFades = document.querySelectorAll('[data-hero-fade]');
    gsap.set(heroFades, { autoAlpha: 0, y: 24 });

    var runHero = function () {
      var heroH1 = document.querySelector('.hero [data-split]');
      var delay = 0.1;
      if (heroH1 && typeof window.SplitType !== 'undefined') {
        var split = new SplitType(heroH1, { types: 'lines', lineClass: 'line' });
        heroH1.classList.add('split-ready');
        split.lines.forEach(function (line) {
          var inner = document.createElement('span');
          inner.style.display = 'inline-block';
          while (line.firstChild) inner.appendChild(line.firstChild);
          line.appendChild(inner);
          line.style.overflow = 'hidden';
          line.style.display = 'block';
        });
        gsap.from(heroH1.querySelectorAll('.line > span'), {
          yPercent: 112, duration: 0.9, ease: EASE, stagger: 0.12, delay: delay
        });
        delay += 0.45;
      }
      gsap.to(heroFades, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.1, delay: delay });
    };

    /* CTA band headline — split lines, revealed on enter */
    var runCtaSplit = function () {
      var ctaTitle = document.querySelector('#cta-band [data-split]');
      if (!ctaTitle || typeof window.SplitType === 'undefined') return;
      var split = new SplitType(ctaTitle, { types: 'lines', lineClass: 'line' });
      ctaTitle.classList.add('split-ready');
      gsap.from(split.lines, {
        autoAlpha: 0, y: 30, duration: 0.8, ease: EASE, stagger: 0.1,
        scrollTrigger: { trigger: ctaTitle, start: 'top 82%', once: true }
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        runHero(); runCtaSplit();
        ScrollTrigger.refresh();
      });
    } else {
      runHero(); runCtaSplit();
    }

    /* Generic reveals — single elements and staggered groups */
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var group = el.closest('[data-reveal-group]');
      var indexInGroup = 0;
      if (group) {
        indexInGroup = Array.prototype.indexOf.call(group.querySelectorAll('[data-reveal]'), el);
      }
      gsap.set(el, { autoAlpha: 0, y: 28 });
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: function () {
          gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE, delay: indexInGroup * 0.08 });
        }
      });
    });

    /* Hero visual parallax — desktop only, scrubbed */
    if (window.innerWidth > 768) {
      var parallaxImg = document.querySelector('[data-parallax]');
      if (parallaxImg) {
        gsap.fromTo(parallaxImg, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: '.hero-visual', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    }

    /* Stats — count up once, ~1.5s ease-out */
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var target = parseInt(el.dataset.count, 10);
      var obj = { val: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(obj, {
            val: target, duration: 1.5, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.val); }
          });
        }
      });
    });

    /* Process — highlight active step, update sticky number */
    var numEl = document.getElementById('process-num');
    var nameEl = document.getElementById('process-name');
    gsap.utils.toArray('.process-step').forEach(function (step) {
      var setActive = function () {
        document.querySelectorAll('.process-step').forEach(function (s) { s.classList.remove('is-active'); });
        step.classList.add('is-active');
        if (numEl) numEl.textContent = step.dataset.step;
        if (nameEl) nameEl.textContent = step.dataset.stepName;
      };
      ScrollTrigger.create({
        trigger: step, start: 'top 55%', end: 'bottom 55%',
        onEnter: setActive, onEnterBack: setActive
      });
    });
  } else {
    /* No motion: ensure a sensible static state */
    var firstStep = document.querySelector('.process-step');
    if (firstStep) firstStep.classList.add('is-active');
  }

  /* ------------------------------------------------------------------
     Custom cursor dot — pointer:fine, motion allowed
     ------------------------------------------------------------------ */
  var cursor = document.getElementById('cursor-dot');
  if (cursor && finePointer && motionOK) {
    var label = cursor.querySelector('.cursor-label');
    var cx = -100, cy = -100, dx = -100, dy = -100, shown = false;
    document.addEventListener('mousemove', function (e) {
      cx = e.clientX; cy = e.clientY;
      if (!shown) { cursor.style.opacity = '0.85'; shown = true; }
    }, { passive: true });
    gsap.ticker.add(function () {
      dx += (cx - dx) * 0.22; dy += (cy - dy) * 0.22;
      cursor.style.transform = 'translate(' + (dx - cursor.offsetWidth / 2) + 'px,' + (dy - cursor.offsetHeight / 2) + 'px)';
    });
    var interactive = 'a, button, .faq-q, input, select, textarea';
    document.addEventListener('mouseover', function (e) {
      var labelled = e.target.closest('[data-cursor]');
      if (labelled) {
        cursor.classList.add('is-label');
        cursor.classList.remove('is-active');
        label.textContent = labelled.dataset.cursor;
      } else if (e.target.closest(interactive)) {
        cursor.classList.add('is-active');
        cursor.classList.remove('is-label');
        label.textContent = '';
      } else {
        cursor.classList.remove('is-active', 'is-label');
        label.textContent = '';
      }
    }, { passive: true });
  }

  /* Magnetic CTAs — subtle pull toward the cursor */
  if (finePointer && motionOK) {
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      var strength = 9;
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var relX = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var relY = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        gsap.to(btn, { x: relX * strength, y: relY * strength, duration: 0.3, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.45, ease: 'power3.out' });
      });
    });
  }

  /* ------------------------------------------------------------------
     Testimonials slider — auto-advance, pause on hover, dots + arrows
     ------------------------------------------------------------------ */
  var track = document.getElementById('testimonial-track');
  if (track) {
    var slides = track.children;
    var dotsWrap = document.getElementById('slider-dots');
    var current = 0, timer = null;
    var dots = [];
    for (var i = 0; i < slides.length; i++) {
      var dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      (function (idx) {
        dot.addEventListener('click', function () { goTo(idx); restart(); });
      })(i);
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }
    var goTo = function (idx) {
      current = (idx + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      dots.forEach(function (d, j) { d.classList.toggle('is-active', j === current); });
    };
    var restart = function () {
      if (timer) clearInterval(timer);
      if (!reducedMotion) timer = setInterval(function () { goTo(current + 1); }, 6000);
    };
    document.getElementById('slider-prev').addEventListener('click', function () { goTo(current - 1); restart(); });
    document.getElementById('slider-next').addEventListener('click', function () { goTo(current + 1); restart(); });
    var slider = track.closest('.testimonial-slider');
    slider.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
    slider.addEventListener('mouseleave', restart);
    slider.addEventListener('focusin', function () { if (timer) clearInterval(timer); });
    slider.addEventListener('focusout', restart);
    restart();
  }

  /* ------------------------------------------------------------------
     FAQ accordion — measured-height animation
     ------------------------------------------------------------------ */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-a').style.height = '0px';
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        panel.style.height = panel.scrollHeight + 'px';
      }
    });
    panel.addEventListener('transitionend', function () {
      if (item.classList.contains('open')) panel.style.height = 'auto';
    });
  });

  /* ------------------------------------------------------------------
     Contact form — validation + AJAX submit to FormSubmit
     ------------------------------------------------------------------ */
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
      submitBtn.firstChild.textContent = 'Sending… ';

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
        submitBtn.firstChild.textContent = 'Send Inquiry ';
      });
    });
  }
})();
