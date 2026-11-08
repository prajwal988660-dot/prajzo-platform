// STUDIO. showcase — shared behaviour for every page.

// --- Hero entrance: pieces slide in from their sides + a figure rises from the bottom, and all
//     align into place. It settles shortly after load, and finishes on the first scroll. ---
const hero = document.getElementById('hero');
if (hero) {
  window.addEventListener('load', () => {
    setTimeout(() => hero.setAttribute('data-animate', 'in'), 200);
  });
  hero.setAttribute('data-animate', 'out');
}

// --- Header: shadow on scroll; finish the hero entrance on first scroll ---
const topbar = document.getElementById('topbar');
let firstScroll = false;
window.addEventListener(
  'scroll',
  () => {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
    if (!firstScroll && window.scrollY > 30) {
      firstScroll = true;
      if (hero) hero.setAttribute('data-animate', 'in');
    }
  },
  { passive: true },
);

// --- Reveal-on-scroll ---
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// --- Mobile menu (simple): toggle the nav links into view ---
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.navlinks');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.style.display === 'flex';
    links.style.display = open ? '' : 'flex';
    links.style.cssText += open
      ? ''
      : 'position:absolute;top:100%;right:4vw;flex-direction:column;background:var(--cream-card);padding:1rem 1.4rem;border:1px solid var(--line);border-radius:1rem;gap:1rem;';
  });
}

// --- Contact form: demo only, never actually sends ---
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = document.getElementById('formNote');
    if (note) note.hidden = false;
    form.reset();
  });
}
