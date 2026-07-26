
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const expanded = navLinks.classList.contains('open');
      menuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      menuToggle.innerHTML = expanded ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
  }

  document.querySelectorAll('.dropdown > .drop-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  document.querySelectorAll('[data-slider]').forEach(slider => {
    const slides = [...slider.querySelectorAll('.slide')];
    const dotsWrap = slider.querySelector('.dots');
    let index = 0;
    let timer;
    const renderDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'dot' + (i === index ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', `عرض الصورة ${i + 1}`);
        dot.addEventListener('click', () => go(i));
        dotsWrap.appendChild(dot);
      });
    };
    const show = () => {
      slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
      if (dotsWrap) [...dotsWrap.children].forEach((dot, i) => dot.classList.toggle('active', i === index));
    };
    const go = (i) => { index = (i + slides.length) % slides.length; show(); restart(); };
    const restart = () => { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => go(index + 1), 5500); };
    slider.querySelector('.prev')?.addEventListener('click', () => go(index - 1));
    slider.querySelector('.next')?.addEventListener('click', () => go(index + 1));
    renderDots();
    restart();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  document.querySelectorAll('.filter-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.project-card[data-category]').forEach(card => {
        card.classList.toggle('hide', filter !== 'all' && card.dataset.category !== filter);
      });
    });
  });

  const topBtn = document.querySelector('.back-to-top');
  window.addEventListener('scroll', () => {
    topBtn?.classList.toggle('show', window.scrollY > 450);
  });
  topBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
