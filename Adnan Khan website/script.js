// Use several conservative signals together; this only changes rendering quality, not functionality.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = window.matchMedia('(max-width: 720px)').matches;
const memory = Number(navigator.deviceMemory || 0);
const cores = Number(navigator.hardwareConcurrency || 0);
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const saveData = Boolean(connection && connection.saveData);
const slowConnection = Boolean(connection && /^(slow-2g|2g|3g)$/.test(connection.effectiveType || ''));
const performanceLevel = motionQuery.matches || saveData || slowConnection ||
  (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2)
  ? 'LOW'
  : (isMobile || (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4) ? 'MEDIUM' : 'HIGH');
document.documentElement.dataset.performance = performanceLevel.toLowerCase();

const pageLoader = document.querySelector('.page-loader');
if (pageLoader) {
  let loaderHidden = false;
  let loaderFallbackTimer = 0;
  const hideLoader = () => {
    if (loaderHidden) return;
    loaderHidden = true;
    window.clearTimeout(loaderFallbackTimer);
    pageLoader.classList.add('is-hidden');
    window.setTimeout(() => pageLoader.remove(), 450);
  };

  window.addEventListener('load', hideLoader, { once: true });
  // Keep a failed or slow external resource from blocking the whole page.
  loaderFallbackTimer = window.setTimeout(hideLoader, 4000);
}

const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll('a')) : [];
let lockedScrollY = 0;
let scrollTicking = false;

const setHeaderState = () => {
  if (header) {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  scrollTicking = false;
};

setHeaderState();
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(setHeaderState);
    scrollTicking = true;
  }
}, { passive: true });

const closeMenu = (restoreFocus = true) => {
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.classList.remove('is-open');
  if (header) header.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  document.body.classList.remove('menu-open');
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, lockedScrollY);
  if (restoreFocus) menuToggle.focus();
};

const openMenu = () => {
  if (!mobileMenu || !menuToggle) return;
  lockedScrollY = window.scrollY;
  mobileMenu.classList.add('is-open');
  if (header) header.classList.add('is-open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close menu');
  document.body.classList.add('menu-open');
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  const firstLink = mobileMenu.querySelector('a');
  if (firstLink) firstLink.focus();
};

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    if (mobileMenu && mobileMenu.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

mobileLinks.forEach((link) => {
  link.addEventListener('click', () => closeMenu(false));
});

if (mobileMenu) {
  mobileMenu.addEventListener('click', (event) => {
    if (event.target === mobileMenu) closeMenu();
  });
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (window.innerWidth > 1080 && mobileMenu && mobileMenu.classList.contains('is-open')) {
      closeMenu(false);
    }
  }, 120);
}, { passive: true });

document.addEventListener('keydown', (event) => {
  if (!mobileMenu || !mobileMenu.classList.contains('is-open')) return;

  if (event.key === 'Escape') {
    closeMenu();
    return;
  }

  if (event.key === 'Tab') {
    const focusable = Array.from(mobileMenu.querySelectorAll('a, button')).filter((element) => !element.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

const sections = Array.from(document.querySelectorAll('main section[id]'));
const navLinks = Array.from(document.querySelectorAll('.desktop-nav a[href*="#"], .mobile-menu a[href*="#"]'));
const setActiveSection = (id) => {
  navLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const active = href.endsWith(`#${id}`);
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
};

if ('IntersectionObserver' in window) {
  const activeObserver = new IntersectionObserver((entries) => {
    const visibleSections = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));

    if (visibleSections[0]) setActiveSection(visibleSections[0].target.id);
  }, { rootMargin: '-42% 0px -48% 0px', threshold: 0 });
  sections.forEach((section) => activeObserver.observe(section));
}

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -20px 0px' })
  : null;

document.querySelectorAll('.reveal').forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add('is-visible');
});

const contactSection = document.querySelector('#contact');
const projectType = document.querySelector('#project-type');
const goToContact = (service) => {
  if (projectType) {
    const option = Array.from(projectType.options).find((item) => item.value === service || item.text === service);
    if (option) projectType.value = option.value;
    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const url = service
    ? `contact.html?type=${encodeURIComponent(service)}`
    : 'contact.html';
  window.location.href = url;
};

if (projectType) {
  const presetType = new URLSearchParams(window.location.search).get('type');
  if (presetType) {
    const match = Array.from(projectType.options).find((option) => option.value === presetType || option.text === presetType);
    if (match) projectType.value = match.value;
  }
}

document.querySelectorAll('.service-card').forEach((card) => {
  const activate = () => goToContact(card.getAttribute('data-service') || '');
  card.addEventListener('click', activate);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
});

document.querySelectorAll('.project-link').forEach((button) => {
  button.addEventListener('click', () => {
    const details = button.parentElement.querySelector('.project-details');
    if (!details) return;
    const isOpen = !details.hidden;
    details.hidden = isOpen;
    button.setAttribute('aria-expanded', String(!isOpen));
    const label = button.querySelector('.project-link-label');
    if (label) label.textContent = isOpen ? 'View project' : 'Hide project';
  });
});

const sceneRoot = document.querySelector('[data-scene]');
const sceneCanvas = document.querySelector('[data-scene-canvas]');
if (sceneRoot && sceneCanvas) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = sceneCanvas.getContext('2d', { alpha: true });
  const nodes = [];
  const dust = [];
  const sparks = [];
  const connections = [];
  const nodeCount = performanceLevel === 'LOW' ? 22 : performanceLevel === 'MEDIUM' ? 34 : 48;
  const dustCount = performanceLevel === 'LOW' ? 18 : performanceLevel === 'MEDIUM' ? 28 : 42;
  const frameInterval = performanceLevel === 'LOW' ? 1000 / 30 : performanceLevel === 'MEDIUM' ? 1000 / 45 : 1000 / 60;

  for (let i = 0; i < nodeCount; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 0.62 + Math.random() * 0.5;
    nodes.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta) * 0.82,
      z: radius * Math.cos(phi),
      pulse: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < dustCount; i += 1) {
    dust.push({
      x: (Math.random() - 0.5) * 2.4,
      y: (Math.random() - 0.5) * 2.1,
      z: (Math.random() - 0.5) * 2.4,
      s: 0.6 + Math.random() * 1.8,
      drift: 0.0004 + Math.random() * 0.0012
    });
  }

  const sparkCount = performanceLevel === 'LOW' ? 3 : performanceLevel === 'MEDIUM' ? 4 : 6;
  for (let i = 0; i < sparkCount; i += 1) {
    sparks.push({
      angle: Math.random() * Math.PI * 2,
      radius: 0.85 + Math.random() * 0.45,
      speed: 0.004 + Math.random() * 0.006,
      length: 0.12 + Math.random() * 0.18
    });
  }

  // Particle relationships never change, so calculate them once instead of every frame.
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < 0.2) connections.push({ i, j, distSq });
    }
  }

  let width = 0;
  let height = 0;
  let rot = 0.45;
  let tiltX = -18;
  let tiltY = 28;
  let targetTiltX = -18;
  let targetTiltY = 28;
  let idle = 0;
  let inView = true;
  let pageVisible = document.visibilityState === 'visible';
  let hovering = false;
  let lastFrame = 0;
  let frameId = 0;
  let resizeFrame = 0;
  let pointerFrame = 0;
  let nebulaGradient = null;
  let nebulaRadius = 0;

  const resizeScene = () => {
    const rect = sceneRoot.getBoundingClientRect();
    const maxDpr = performanceLevel === 'LOW' ? 1 : performanceLevel === 'MEDIUM' ? 1.25 : 1.5;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    sceneCanvas.width = width * dpr;
    sceneCanvas.height = height * dpr;
    sceneCanvas.style.width = `${width}px`;
    sceneCanvas.style.height = `${height}px`;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nebulaGradient = null;
    nebulaRadius = 0;
  };

  resizeScene();
  window.addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resizeScene();
    });
  }, { passive: true });

  let pointerX = 0;
  let pointerY = 0;
  sceneRoot.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      hovering = true;
      const rect = sceneRoot.getBoundingClientRect();
      const px = (pointerX - rect.left) / rect.width - 0.5;
      const py = (pointerY - rect.top) / rect.height - 0.5;
      targetTiltY = 28 + px * 28;
      targetTiltX = -18 - py * 18;
    });
  }, { passive: true });

  sceneRoot.addEventListener('pointerleave', () => {
    hovering = false;
    targetTiltX = -18;
    targetTiltY = 28;
  });

  if ('IntersectionObserver' in window) {
    const sceneObserver = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView && pageVisible && !reducedMotion && !frameId) {
        frameId = window.requestAnimationFrame(drawScene);
      } else if (!inView && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }, { threshold: 0.05 });
    sceneObserver.observe(sceneRoot);
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState === 'visible';
    if (!pageVisible && frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (pageVisible && inView && !reducedMotion && !frameId) {
      frameId = window.requestAnimationFrame(drawScene);
    }
  });

  const rotateY = (point, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: point.x * cos - point.z * sin,
      y: point.y,
      z: point.x * sin + point.z * cos
    };
  };

  const project = (point, angle, cx, cy, fov, dist) => {
    const rotated = rotateY(point, angle);
    const scale = fov / (dist + rotated.z);
    return {
      x: cx + rotated.x * scale,
      y: cy + rotated.y * scale,
      z: rotated.z,
      scale
    };
  };

  const drawGlow = (x, y, radius, color) => {
    if (performanceLevel !== 'LOW') {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(196, 214, 255, 0)');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = color;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawScene = (timestamp = 0) => {
    if (!ctx) {
      frameId = 0;
      return;
    }
    if (!reducedMotion && timestamp - lastFrame < frameInterval) {
      frameId = window.requestAnimationFrame(drawScene);
      return;
    }
    lastFrame = timestamp;

    if (!reducedMotion && inView && pageVisible) {
      idle += 0.008;
      rot += 0.0028;
      if (!hovering) {
        targetTiltX = -18 + Math.sin(idle * 0.7) * 4;
        targetTiltY = 28 + Math.cos(idle * 0.55) * 6;
      }
      tiltX += (targetTiltX - tiltX) * 0.07;
      tiltY += (targetTiltY - tiltY) * 0.07;
      sceneRoot.style.setProperty('--tilt-x', `${tiltX}deg`);
      sceneRoot.style.setProperty('--tilt-y', `${tiltY}deg`);
      dust.forEach((speck) => {
        speck.y -= speck.drift;
        if (speck.y < -1.15) speck.y = 1.15;
      });
      sparks.forEach((spark) => {
        spark.angle += spark.speed;
      });
    }

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2 + 8;
    const fov = Math.min(width, height) * 0.78;
    const dist = 3.05;

    const nextNebulaRadius = Math.min(width, height) * 0.42;
    if (!nebulaGradient || nebulaRadius !== nextNebulaRadius) {
      nebulaGradient = ctx.createRadialGradient(cx, cy - 10, 20, cx, cy, nextNebulaRadius);
      nebulaGradient.addColorStop(0, 'rgba(168, 190, 240, 0.12)');
      nebulaGradient.addColorStop(1, 'rgba(168, 190, 240, 0)');
      nebulaRadius = nextNebulaRadius;
    }
    ctx.fillStyle = nebulaGradient;
    ctx.fillRect(0, 0, width, height);

    const projectedNodes = nodes.map((point, index) => {
      const projected = project(point, rot, cx, cy, fov, dist);
      projected.pulse = 0.65 + Math.sin(idle * 2 + point.pulse) * 0.35;
      projected.index = index;
      return projected;
    });

    connections.forEach(({ i, j, distSq }) => {
      const depth = (projectedNodes[i].z + projectedNodes[j].z + 2) / 4;
      ctx.strokeStyle = `rgba(196, 214, 255, ${(1 - distSq / 0.2) * 0.16 * depth})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(projectedNodes[i].x, projectedNodes[i].y);
      ctx.lineTo(projectedNodes[j].x, projectedNodes[j].y);
      ctx.stroke();
    });

    projectedNodes.forEach((point) => {
      const depth = (point.z + 1.2) / 2.4;
      const radius = 1.1 + depth * 2.4;
      drawGlow(point.x, point.y, radius * 4.2, `rgba(196, 214, 255, ${0.08 + depth * 0.12})`);
      ctx.fillStyle = `rgba(245, 247, 252, ${0.28 + depth * 0.55 * point.pulse})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    dust.forEach((speck) => {
      const projected = project(speck, rot * 0.35, cx, cy, fov, dist + 0.4);
      const depth = (projected.z + 1.2) / 2.4;
      ctx.fillStyle = `rgba(196, 214, 255, ${0.08 + depth * 0.22})`;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, speck.s * (0.4 + depth), 0, Math.PI * 2);
      ctx.fill();
    });

    sparks.forEach((spark) => {
      const from = project({
        x: Math.cos(spark.angle) * spark.radius,
        y: Math.sin(spark.angle * 0.65) * 0.18,
        z: Math.sin(spark.angle) * spark.radius
      }, rot, cx, cy, fov, dist);
      const to = project({
        x: Math.cos(spark.angle + spark.length) * spark.radius,
        y: Math.sin((spark.angle + spark.length) * 0.65) * 0.18,
        z: Math.sin(spark.angle + spark.length) * spark.radius
      }, rot, cx, cy, fov, dist);
      const streak = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      streak.addColorStop(0, 'rgba(245, 247, 252, 0)');
      streak.addColorStop(0.5, 'rgba(245, 247, 252, 0.55)');
      streak.addColorStop(1, 'rgba(245, 247, 252, 0)');
      ctx.strokeStyle = streak;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    if (!reducedMotion && inView && pageVisible) frameId = window.requestAnimationFrame(drawScene);
  };

  if (reducedMotion) drawScene();
  else if (inView && pageVisible) frameId = window.requestAnimationFrame(drawScene);
}

const form = document.querySelector('#contact-form');
if (form) {
  const fields = {
    name: { input: form.elements.name, error: document.querySelector('#name-error'), message: 'Please enter your name.' },
    email: { input: form.elements.email, error: document.querySelector('#email-error'), message: 'Please enter a valid email address.' },
    'project-type': { input: form.elements['project-type'], error: document.querySelector('#project-type-error'), message: 'Please select a project type.' },
    description: { input: form.elements.description, error: document.querySelector('#description-error'), message: 'Please add a few details about your project so I can respond helpfully.' }
  };
  const validate = (field) => {
    const value = field.input.value.trim();
    let valid = value.length > 0;
    if (field.input === fields.name.input) valid = value.length >= 2 && value.length <= 80;
    if (field.input === fields.email.input) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (field.input === fields.description.input) valid = value.length >= 20;
    field.error.textContent = valid ? '' : field.message;
    field.input.parentElement.classList.toggle('has-error', !valid);
    field.input.setAttribute('aria-invalid', String(!valid));
    return valid;
  };
  Object.values(fields).forEach((field) => {
    field.input.addEventListener('blur', () => validate(field));
    field.input.addEventListener('input', () => {
      if (field.input.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validationResults = Object.values(fields).map(validate);
    const valid = validationResults.every(Boolean);
    if (!valid) {
      const firstInvalid = Object.values(fields).find((field) => field.input.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) firstInvalid.input.focus();
      return;
    }
    const button = form.querySelector('.form-submit');
    const status = form.querySelector('.form-status');
    const formControls = Array.from(form.querySelectorAll('input, select, textarea, button'));
    const subject = encodeURIComponent(`Project inquiry: ${fields['project-type'].input.value}`);
    const body = encodeURIComponent(`Name: ${fields.name.input.value.trim()}\nEmail: ${fields.email.input.value.trim()}\nProject type: ${fields['project-type'].input.value}\n\n${fields.description.input.value.trim()}`);
    button.classList.add('is-loading');
    button.disabled = true;
    formControls.forEach((control) => { control.disabled = true; });
    status.textContent = 'Opening your email app…';
    window.setTimeout(() => {
      window.location.href = `mailto:md.adnankhan.developer@gmail.com?subject=${subject}&body=${body}`;
      formControls.forEach((control) => { control.disabled = false; });
      button.classList.remove('is-loading');
      button.disabled = false;
      status.innerHTML = 'If your email app did not open, write directly to <a href="mailto:md.adnankhan.developer@gmail.com">md.adnankhan.developer@gmail.com</a>.';
    }, 350);
  });
}
