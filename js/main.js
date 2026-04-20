/* Noventis Design — main.js
   Animations premium : GSAP + ScrollTrigger + Lenis + Splitting.js
   Garde-fous : reduced-motion, fallbacks sans libs. */

(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)').matches;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;
  const Splitting = window.Splitting;

  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* --------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (Lenis && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.4,
    });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    if (ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* --------- Header scrolled state + dynamic height ---------- */
  const header = document.querySelector('[data-header]');
  const updateHeaderHeight = () => {
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-h', `${Math.round(h)}px`);
  };
  const onScroll = () => {
    const y = window.scrollY || window.pageYOffset;
    header && header.classList.toggle('is-scrolled', y > 24);
    updateHeaderHeight();
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateHeaderHeight, { passive: true });

  /* --------- Mobile menu ---------- */
  const burger = document.querySelector('[data-burger]');
  const menu = document.querySelector('[data-menu]');
  if (burger && menu) {
    const closeMenu = () => {
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      burger.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      open ? closeMenu() : openMenu();
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* --------- Anchor smoothing ---------- */
  const getTargetTop = (target) => {
    const headerH = header ? header.getBoundingClientRect().height : 0;
    // Si la section a un .section-head, on cale dessus (évite le vide
    // laissé par le padding-block de la section).
    const anchor = target.querySelector('.section-head') || target;
    const rectTop = anchor.getBoundingClientRect().top + window.scrollY;
    return Math.max(0, rectTop - headerH - 24);
  };
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = getTargetTop(target);
      if (lenis) {
        lenis.scrollTo(top, { duration: 0.8, lock: true, immediate: false });
      } else {
        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    });
  });

  /* --------- Splitting.js + hero reveal ---------- */
  if (Splitting) Splitting();

  if (gsap && !prefersReducedMotion) {
    const chars = document.querySelectorAll('.hero__title .char');
    if (chars.length) {
      gsap.to(chars, {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.018,
        delay: 0.25,
      });
    }
    gsap.to('.hero__foot', {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'expo.out',
      delay: 0.9,
      onStart: () => document.querySelector('.hero__foot')?.classList.add('is-in'),
    });
    gsap.to('.hero__ticker', {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'expo.out',
      delay: 1.2,
      onStart: () => document.querySelector('.hero__ticker')?.classList.add('is-in'),
    });
  } else {
    document.querySelectorAll('.hero__title .char').forEach((c) => {
      c.style.opacity = '1';
      c.style.transform = 'none';
    });
    document.querySelector('.hero__foot')?.classList.add('is-in');
    document.querySelector('.hero__ticker')?.classList.add('is-in');
  }

  /* --------- Reveal on scroll ----------
     Pattern `gsap.from + immediateRender:false` : les éléments restent
     visibles jusqu'à ce que ScrollTrigger se déclenche, anime from hidden
     vers l'état CSS naturel (opacity:1). Résout le souci Playwright/SSR. */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (gsap && ScrollTrigger && !prefersReducedMotion) {
      revealEls.forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 32,
          duration: 0.9,
          ease: 'expo.out',
          immediateRender: false,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onStart: () => el.classList.add('is-in'),
        });
      });
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: '0px 0px -10% 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* --------- Cards : deal animation ----------
     Multi-col (≥720px) : empilement initial (offset 15/10 px, rotations
     -3/-1/0°) puis distribution stagger 0.3s.
     Single-col (<720px) : simple fade+slide stagger pour éviter les cards
     translatées hors viewport. Mesure différée à fonts.ready pour éviter
     un layout shift Space Grotesk vs fallback. */
  const cascadeGroups = document.querySelectorAll('[data-cascade]');
  if (cascadeGroups.length && gsap && ScrollTrigger && !prefersReducedMotion) {
    const initCascade = () => {
      const isMultiCol = window.matchMedia('(min-width: 720px)').matches;
      const dealRotations = [-3, -1, 0];
      const OFFSET_X = 15;
      const OFFSET_Y = 10;

      cascadeGroups.forEach((group) => {
        const items = Array.from(group.children);
        if (!items.length) return;

        if (!isMultiCol) {
          // Mobile single-column : reveal stagger simple
          gsap.from(items, {
            opacity: 0,
            y: 24,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.12,
            immediateRender: false,
            scrollTrigger: { trigger: group, start: 'top 85%', once: true },
          });
          return;
        }

        // Desktop / tablet : deal stack -> distribution
        const firstRect = items[0].getBoundingClientRect();
        items.forEach((card, i) => {
          const rect = card.getBoundingClientRect();
          gsap.set(card, {
            x: (firstRect.left - rect.left) + i * OFFSET_X,
            y: (firstRect.top - rect.top) + i * OFFSET_Y,
            rotation: i < dealRotations.length ? dealRotations[i] : 0,
            zIndex: 100 - i,
            transformOrigin: 'center center',
          });
        });

        gsap.to(items, {
          x: 0,
          y: 0,
          rotation: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.3,
          scrollTrigger: { trigger: group, start: 'top 75%', once: true },
        });
      });

      if (ScrollTrigger.refresh) ScrollTrigger.refresh();
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(initCascade);
    } else {
      window.addEventListener('load', initCascade);
    }
  }

  /* --------- Marquee tickers ---------- */
  const marquees = document.querySelectorAll('[data-marquee]');
  if (marquees.length && !prefersReducedMotion) {
    marquees.forEach((marquee) => {
      marquee.innerHTML = marquee.innerHTML + marquee.innerHTML;
      if (gsap) {
        gsap.to(marquee, {
          xPercent: -50,
          ease: 'none',
          duration: 30,
          repeat: -1,
        });
      }
    });
  }

  const big = document.querySelector('[data-marquee-slow]');
  if (big && gsap && !prefersReducedMotion) {
    const parent = big.parentElement;
    big.innerHTML = big.innerHTML + ' ' + big.innerHTML;
    gsap.to(big, { xPercent: -50, ease: 'none', duration: 60, repeat: -1 });
    if (ScrollTrigger) {
      gsap.to(big, {
        xPercent: '+=8',
        ease: 'none',
        scrollTrigger: {
          trigger: parent,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }

  /* --------- Tilt 3D (cards) ---------- */
  if (isDesktop && !prefersReducedMotion && gsap) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotationX: y * -6,
          rotationY: x * 6,
          transformPerspective: 1000,
          duration: 0.6,
          ease: 'power3.out',
        });
      };
      const onLeave = () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.9,
          ease: 'elastic.out(1, 0.5)',
        });
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
  }

  /* --------- Magnetic buttons ---------- */
  if (isDesktop && !prefersReducedMotion && gsap) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = 0.28;
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        gsap.to(el, {
          x: x * strength,
          y: y * strength,
          duration: 0.5,
          ease: 'power3.out',
        });
      };
      const onLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: 'elastic.out(1, 0.5)',
        });
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  /* --------- Custom cursor ---------- */
  if (isDesktop && !prefersReducedMotion && gsap) {
    const cursor = document.querySelector('[data-cursor]');
    if (cursor) {
      document.body.classList.add('has-cursor');
      const dot = cursor.querySelector('.cursor__dot');
      const ring = cursor.querySelector('.cursor__ring');
      const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const target = { x: pos.x, y: pos.y };

      window.addEventListener('mousemove', (e) => {
        target.x = e.clientX;
        target.y = e.clientY;
        gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0, overwrite: true });
      });

      gsap.ticker.add(() => {
        pos.x += (target.x - pos.x) * 0.2;
        pos.y += (target.y - pos.y) * 0.2;
        gsap.set(ring, { x: pos.x, y: pos.y });
      });

      const hoverables = 'a, button, [data-magnetic], summary';
      document.querySelectorAll(hoverables).forEach((el) => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
      });
      // Cache le curseur custom quand on entre dans un champ de saisie
      const fields = 'input, textarea, select';
      document.querySelectorAll(fields).forEach((el) => {
        el.addEventListener('mouseenter', () => cursor.style.opacity = '0');
        el.addEventListener('mouseleave', () => cursor.style.opacity = '');
      });
    }
  }

  /* --------- Form — envoi réel via Web3Forms ---------- */
  const FORM_ENDPOINT = 'https://api.web3forms.com/submit';
  const form = document.querySelector('[data-form]');
  if (form) {
    const status = form.querySelector('[data-form-status]');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = form.querySelector('#f-name');
      const email = form.querySelector('#f-email');
      const msg = form.querySelector('#f-msg');
      let ok = true;

      [name, email, msg].forEach((f) => {
        const valid =
          f.value.trim().length > 1 &&
          (f.type !== 'email' || /.+@.+\..+/.test(f.value));
        f.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (!valid) ok = false;
      });

      if (!ok) {
        if (status) status.textContent = 'Merci de compléter les champs requis.';
        return;
      }

      if (status) status.textContent = 'Envoi en cours…';
      if (submitBtn) submitBtn.disabled = true;

      try {
        const fd = new FormData(form);
        const projectType = form.querySelector('#f-subject')?.selectedOptions[0]?.text || 'Contact';
        fd.append('subject', `Nouveau projet — ${projectType} · ${name.value.trim()}`);
        fd.append('from_name', `${name.value.trim()} (via noventisdesign.com)`);
        fd.append('replyto', email.value.trim());

        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: fd,
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success === true) {
          if (status) status.textContent = 'Message envoyé. Réponse sous 24 h ouvrées.';
          form.reset();
        } else {
          if (status) status.textContent = 'Envoi impossible. Écrivez-nous à contact@noventisdesign.com.';
        }
      } catch (err) {
        if (status) status.textContent = 'Erreur réseau. Écrivez-nous à contact@noventisdesign.com.';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* --------- ScrollTrigger refresh ------ */
  if (ScrollTrigger) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
