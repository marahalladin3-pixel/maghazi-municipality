(() => {
  'use strict';

  const doc = document;
  const body = doc.body;

  // شريط تقدّم بسيط وأنيق.
  const progress = doc.querySelector('.scroll-progress');
  const header = doc.querySelector('.site-header');
  const updateScrollUI = () => {
    const max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    if (progress) progress.style.width = `${percent}%`;
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });

  // تحديد رابط الصفحة الحالية تلقائياً.
  const current = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  doc.querySelectorAll('.nav-links a[href]').forEach(link => {
    const href = decodeURIComponent((link.getAttribute('href') || '').split('#')[0]);
    if (href && href === current) {
      doc.querySelectorAll('.nav-links a.active').forEach(item => item.classList.remove('active'));
      link.classList.add('active');
      link.closest('.dropdown')?.querySelector(':scope > .drop-link')?.classList.add('active');
    }
  });

  // إغلاق قائمة الهاتف بعد اختيار رابط أو النقر خارجها.
  const nav = doc.querySelector('.nav-links');
  const toggle = doc.querySelector('.menu-toggle');
  const closeMenu = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    doc.querySelectorAll('.dropdown.open').forEach(item => item.classList.remove('open'));
  };
  nav?.querySelectorAll('a:not(.drop-link)').forEach(link => link.addEventListener('click', closeMenu));
  doc.addEventListener('click', event => {
    if (window.innerWidth <= 900 && nav?.classList.contains('open') && !event.target.closest('.nav-inner')) closeMenu();
  });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  // منع الصور المفقودة من إظهار رمز مكسور.
  doc.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      img.closest('.member-card,.news-card,.project-card,.gallery,.image-stack')?.classList.add('image-unavailable');
    }, { once: true });
  });

  // سنة حقوق النشر حتى في الصفحات التي لا تستدعي main.js.
  doc.querySelectorAll('#year').forEach(node => { node.textContent = new Date().getFullYear(); });

  // تحسين الوصول للأسئلة الشائعة.
  doc.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      details.parentElement?.querySelectorAll('details[open]').forEach(item => {
        if (item !== details) item.removeAttribute('open');
      });
    });
  });

  // عدم إبقاء عناصر reveal مخفية في المتصفحات القديمة.
  if (!('IntersectionObserver' in window)) {
    doc.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  body.classList.add('site-ready');
})();
