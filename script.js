// =====================================
// WHITE SOUL IBIZA — SHARED INTERACTIONS
// =====================================

// ---- Turso DB (translations) ----
const TURSO_URL = 'https://whitesoulibiza-therealmfkk.aws-eu-west-1.turso.io/v2/pipeline';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk4NzYzODMsImlkIjoiMDE5ZTY4ZTYtMjYwMS03ZjNjLWI0NzktMTBjMzRmMGFlOWVlIiwicmlkIjoiOTdkNjc2NmQtYmNhOC00YWEwLWE1M2QtYTFmZjkzZWM1NjNhIn0.AYnPaVkNwWAttSV8Hhz6_bub4TipYJRSVd0GMokhTJwFG8_zRxuqyRjL0aBxoNOfjwc_McMjCKry7hbUG2VzCA';

// In-memory cache: { lang -> { key -> value } }
const translationCache = {};

// Fallback translations (used until DB responds or on fetch failure)
const fallbackTranslations = {
  EN: { 'nav.home':'Home','nav.services':'Services','nav.custom':'Experiences','nav.events':'Events','nav.testimonials':'Testimonials','nav.about':'About','nav.contact':'Contact','cta.plan':'Plan Your Experience','cta.discover':'Discover Services','cta.start':'Start Your Journey','cta.create':'Create Your Experience','cta.inquire':'Begin Concierge Request','cta.services':'Explore All Services','cta.story':'Our Story','cta.plan.event':'Begin Planning' },
  IT: { 'nav.home':'Home','nav.services':'Servizi','nav.custom':'Esperienze','nav.events':'Eventi','nav.testimonials':'Testimonianze','nav.about':'Chi Siamo','nav.contact':'Contatti','cta.plan':'Pianifica la Tua Esperienza','cta.discover':'Scopri i Servizi','cta.start':'Inizia il Tuo Viaggio','cta.create':'Crea la Tua Esperienza','cta.inquire':'Inizia Richiesta Concierge','cta.services':'Esplora Tutti i Servizi','cta.story':'La Nostra Storia','cta.plan.event':'Inizia a Pianificare' },
  ES: { 'nav.home':'Inicio','nav.services':'Servicios','nav.custom':'Experiencias','nav.events':'Eventos','nav.testimonials':'Testimonios','nav.about':'Nosotros','nav.contact':'Contacto','cta.plan':'Planea Tu Experiencia','cta.discover':'Descubre Servicios','cta.start':'Comienza Tu Viaje','cta.create':'Crea Tu Experiencia','cta.inquire':'Solicitud de Conserje','cta.services':'Ver Todos los Servicios','cta.story':'Nuestra Historia','cta.plan.event':'Empieza a Planificar' },
  FR: { 'nav.home':'Accueil','nav.services':'Services','nav.custom':'Expériences','nav.events':'Événements','nav.testimonials':'Témoignages','nav.about':'À Propos','nav.contact':'Contact','cta.plan':'Planifiez Votre Expérience','cta.discover':'Découvrir les Services','cta.start':'Commencez Votre Voyage','cta.create':'Créez Votre Expérience','cta.inquire':'Demande de Conciergerie','cta.services':'Voir Tous les Services','cta.story':'Notre Histoire','cta.plan.event':'Commencer à Planifier' },
};

async function fetchTranslations(lang) {
  if (translationCache[lang]) return translationCache[lang];

  try {
    const res = await fetch(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql: 'SELECT key, value FROM translations WHERE lang = ?',
              args: [{ type: 'text', value: lang }],
            },
          },
          { type: 'close' },
        ],
      }),
    });

    const data = await res.json();
    const rows = data.results[0].response.result.rows;
    const dict = {};
    rows.forEach(row => { dict[row[0].value] = row[1].value; });
    translationCache[lang] = dict;
    return dict;
  } catch (err) {
    console.warn('Turso fetch failed, using fallback:', err);
    return fallbackTranslations[lang] || fallbackTranslations.EN;
  }
}

function applyTranslationDict(dict) {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.dataset.t;
    if (dict[key]) {
      if (dict[key].includes('<')) {
        el.innerHTML = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });
}

async function applyLanguage(lang) {
  const dict = await fetchTranslations(lang);
  applyTranslationDict(dict);
}

// =====================================
// DOM READY
// =====================================
document.addEventListener('DOMContentLoaded', () => {

  // --- Sticky header on scroll ---
  const header = document.querySelector('.site-header');
  if (header && !header.classList.contains('solid')) {
    const onScroll = () => {
      if (window.scrollY > 40) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Mobile menu toggle ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // --- Language switcher ---
  const langButtons = document.querySelectorAll('[data-lang]');
  const savedLang = localStorage.getItem('ws_lang') || 'EN';

  langButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
      await applyLanguage(lang);
      localStorage.setItem('ws_lang', lang);
    });
  });

  langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === savedLang));

  // Apply fallback immediately, then fetch from DB
  applyTranslationDict(fallbackTranslations[savedLang] || fallbackTranslations.EN);
  applyLanguage(savedLang);

  // --- Reveal on scroll ---
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(r => io.observe(r));
  } else {
    reveals.forEach(r => r.classList.add('in-view'));
  }

  // --- Testimonial carousel ---
  initCarousel();

  // --- Experience builder ---
  initBuilder();

  // --- Form (prevent default submission) ---
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'Sending…';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = 'Thank you — we will be in touch';
          form.reset();
          setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 4000);
        }, 900);
      }
    });
  });
});

// =====================================
// CAROUSEL
// =====================================
function initCarousel() {
  const carousel = document.querySelector('.testimonial-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.testimonial-track');
  const slides = carousel.querySelectorAll('.testimonial-slide');
  const dotsContainer = carousel.querySelector('.testimonial-nav');
  if (!track || slides.length === 0) return;

  let current = 0;
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  const goTo = (i) => {
    current = i;
    track.style.transform = `translateX(-${i * 100}%)`;
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.testimonial-dot').forEach((d, idx) => {
        d.classList.toggle('active', idx === i);
      });
    }
  };

  setInterval(() => goTo((current + 1) % slides.length), 6500);
}

// =====================================
// EXPERIENCE BUILDER
// =====================================
function initBuilder() {
  document.querySelectorAll('.builder-step').forEach(step => {
    const options = step.querySelectorAll('.builder-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  });
}
