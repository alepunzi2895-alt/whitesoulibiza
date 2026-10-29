// =====================================
// WHITE SOUL IBIZA — SHARED INTERACTIONS
// =====================================

// ---- Turso DB (translations) ----

// In-memory cache: { lang -> { key -> value } }
const translationCache = {};

// Language currently shown; t() reads texts for this language
let currentLang = 'EN';

// Returns the text for a key in the current language. Values may contain {placeholders}.
function t(key, vars) {
  const text = (translationCache[currentLang] || {})[key]
    || (fallbackTranslations[currentLang] || {})[key]
    || fallbackTranslations.EN[key]
    || key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? '')) : text;
}

// Fallback translations (used until DB responds or on fetch failure)
const fallbackTranslations = {
  EN: { 'nav.vacation':'Your Holiday','nav.event':'Your Event','nav.partner':'Partner With Us','nav.contactus':'Contact Us','nav.home':'Home','nav.services':'Services','nav.custom':'Experiences','nav.events':'Events','nav.testimonials':'Testimonials','nav.about':'About','nav.contact':'Contact','cta.plan':'Plan Your Experience','cta.discover':'Discover Services','cta.start':'Start Your Journey','cta.create':'Create Your Experience','cta.inquire':'Begin Concierge Request','cta.services':'Explore All Services','cta.story':'Our Story','cta.plan.event':'Begin Planning' },
  IT: { 'nav.vacation':'La tua vacanza','nav.event':'Il tuo evento','nav.partner':'Collabora con noi','nav.contactus':'Contattaci','nav.home':'Home','nav.services':'Servizi','nav.custom':'Esperienze','nav.events':'Eventi','nav.testimonials':'Testimonianze','nav.about':'Chi Siamo','nav.contact':'Contatti','cta.plan':'Pianifica la Tua Esperienza','cta.discover':'Scopri i Servizi','cta.start':'Inizia il Tuo Viaggio','cta.create':'Crea la Tua Esperienza','cta.inquire':'Inizia Richiesta Concierge','cta.services':'Esplora Tutti i Servizi','cta.story':'La Nostra Storia','cta.plan.event':'Inizia a Pianificare' },
  ES: { 'nav.vacation':'Tus vacaciones','nav.event':'Tu evento','nav.partner':'Colabora con nosotros','nav.contactus':'Contáctanos','nav.home':'Inicio','nav.services':'Servicios','nav.custom':'Experiencias','nav.events':'Eventos','nav.testimonials':'Testimonios','nav.about':'Nosotros','nav.contact':'Contacto','cta.plan':'Planea Tu Experiencia','cta.discover':'Descubre Servicios','cta.start':'Comienza Tu Viaje','cta.create':'Crea Tu Experiencia','cta.inquire':'Solicitud de Conserje','cta.services':'Ver Todos los Servicios','cta.story':'Nuestra Historia','cta.plan.event':'Empieza a Planificar' },
  FR: { 'nav.vacation':'Vos vacances','nav.event':'Votre événement','nav.partner':'Collaborez avec nous','nav.contactus':'Contactez-nous','nav.home':'Accueil','nav.services':'Services','nav.custom':'Expériences','nav.events':'Événements','nav.testimonials':'Témoignages','nav.about':'À Propos','nav.contact':'Contact','cta.plan':'Planifiez Votre Expérience','cta.discover':'Découvrir les Services','cta.start':'Commencez Votre Voyage','cta.create':'Créez Votre Expérience','cta.inquire':'Demande de Conciergerie','cta.services':'Voir Tous les Services','cta.story':'Notre Histoire','cta.plan.event':'Commencer à Planifier' },
  DE: { 'nav.vacation':'Ihr Urlaub','nav.event':'Ihr Event','nav.partner':'Partner werden','nav.contactus':'Kontaktieren Sie uns','nav.home':'Startseite','nav.services':'Leistungen','nav.custom':'Erlebnisse','nav.events':'Events','nav.testimonials':'Bewertungen','nav.about':'Über uns','nav.contact':'Kontakt','cta.plan':'Erlebnis planen','cta.discover':'Leistungen entdecken','cta.start':'Aufenthalt planen','cta.create':'Erlebnis gestalten','cta.inquire':'Concierge-Anfrage stellen','cta.services':'Alle Leistungen entdecken','cta.story':'Unsere Geschichte','cta.plan.event':'Planung beginnen' },
};

async function fetchTranslations(lang) {
  if (translationCache[lang]) return translationCache[lang];

  // The texts come from our own API, so the database token never reaches the browser
  try {
    const res = await fetch(`/api/translations?lang=${encodeURIComponent(lang)}`);
    if (!res.ok) throw new Error('translations ' + res.status);
    const data = await res.json();
    translationCache[lang] = data.dict;
    return data.dict;
  } catch (err) {
    console.warn('Translations unavailable, using fallback:', err);
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
  document.querySelectorAll('.split-reveal').forEach(splitWords);
}

// Wrap each word in a span so it can be revealed one by one
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.style.setProperty('--i', i++);
          w.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('w')) {
        walk(child);
      }
    });
  };
  walk(el);
}

async function applyLanguage(lang) {
  currentLang = lang;
  const dict = await fetchTranslations(lang);
  if (currentLang !== lang) return; // another language was picked while loading
  applyTranslationDict(dict);
  document.documentElement.lang = lang.toLowerCase();
  const title = t('site.title');
  if (title !== 'site.title') document.title = title;
  // Components that build their text in JavaScript re-render themselves
  document.dispatchEvent(new Event('ws:lang'));
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
  const savedLang = 'EN';

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
  document.querySelectorAll('.split-reveal').forEach(splitWords);
  const reveals = document.querySelectorAll('.reveal, .split-reveal');
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

  // --- Villa collection grid + map ---
  initVillaCollection();

  // --- Villa modal ---
  initVillaModal();

  // --- Service modal ---
  initServiceModal();

  // --- Experience builder ---
  initBuilder();

  // --- Homepage: active nav link per section ---
  initScrollSpy();

  // --- Partner form (opens the email client) ---
  initPartnerForm();

  // --- Planner: Build your holiday / Plan your event ---
  initPlanner();

  // --- Accounts: header button and saving projects ---
  initAccount();

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
// VILLA DATA
// =====================================
const villaData = {
  'villa-eliana':   { name:'Villa Eliana',   tier:'Essential', area:'San Agustín',     beds:6, baths:4, sleeps:12, min:4043,  max:13283,  lat:38.9494, lng:1.3113, min_nights:7,  flexible:false, license:'ET-0435-E', tagline:'Chic Villa Overlooking the Sea Near San Agustin', desc:'Villa Eliana is an impressive, modern villa with fabulous panoramic views over the local countryside, down to the sea and the world-famous Ibizan sunsets. A stunning property with exceptional design and finish throughout.' },
  'villa-larish':   { name:'Villa Larish',   tier:'Essential', area:'San Rafael',       beds:6, baths:4, sleeps:12, min:6050,  max:17875,  lat:38.9700, lng:1.3600, min_nights:7,  flexible:false, license:'ETV-1050-E', tagline:'Stylish Ibiza escape where Mediterranean energy meets Tulum spirit', desc:'Villa Larish is a spacious, beautifully curated Mediterranean residence where Ibiza\'s energy meets the warm, earthy spirit of Tulum. Every corner reflects a refined aesthetic balanced by organic textures and natural light.' },

  'can-nora':       { name:'Can Nora',        tier:'Essential', area:'Santa Gertrudis',  beds:6, baths:6, sleeps:12, min:4851,  max:17325,  lat:38.9939, lng:1.4303, min_nights:3,  flexible:true, license:'ETV-1532-E', tagline:'A beautifully renovated country house with charm throughout', desc:'Elegantly restored farmhouse conveniently located in the rural heart of the island, just a short walk to the village of Santa Gertrudis, a vibrant and popular place full of lively restaurants and galleries.' },
  'can-octavia':    { name:'Can Octavia',     tier:'Essential', area:'San Lorenzo',      beds:6, baths:6, sleeps:12, min:12980, max:15400,  lat:39.0178, lng:1.4794, min_nights:7,  flexible:false, license:'ETV-2112-E', tagline:'Beautifully restored finca with tennis in the heart of Ibiza\'s countryside', desc:'Can Octavia is a 6-bedroom traditional finca lovingly restored and transformed into a captivating home, retaining all its authenticity and charm yet refurbished with every modern comfort you could wish for.' },
  'villa-amado':    { name:'Villa Amado',     tier:'Essential', area:'Jesús',            beds:6, baths:6, sleeps:12, min:8800,  max:38500,  lat:38.9316, lng:1.4540, min_nights:7,  flexible:false, license:'ET-0314-E', tagline:'Large property close to all the action of the south', desc:'A tropical oasis that offers a perfect blend of luxury, comfort, and natural beauty. Set within a sprawling 2,000 m² estate surrounded by lush Mediterranean gardens and with a private infinity pool.' },
  'villa-brielle':  { name:'Villa Brielle',   tier:'Essential', area:'Cala Tarida',      beds:6, baths:6, sleeps:12, min:9240,  max:18150,  lat:38.9398, lng:1.2711, min_nights:7,  flexible:false, license:'ETV-0986-E', tagline:'Recently renovated with amazing sea and sunset views', desc:'Villa Brielle is an exceptional Ibizan retreat ideally located close to some of the island\'s most desirable sunset beaches on the stunning west coast. Crisp architecture, warm interiors, breathtaking views.' },
  'villa-samy':     { name:'Villa Samy',      tier:'Essential', area:'Cap Martinet',     beds:5, baths:6, sleeps:10, min:4120,  max:15070,  lat:38.9275, lng:1.4606, min_nights:5,  flexible:true, license:'ETV-1222-E', tagline:'A luxurious haven in Ibiza', desc:'Villa Samy is a breathtaking modern villa that combines authentic Ibizan charm with contemporary sophistication. Built in 2015, this spacious and light-filled property is nestled in one of Ibiza\'s most coveted locations, with beautiful sea views and total privacy.' },
  'can-savasana':   { name:'Can Savasana',    tier:'Essential', area:'Cala Salada',      beds:5, baths:4, sleeps:10, min:6600,  max:11000,  lat:39.0162, lng:1.2988, min_nights:3,  flexible:false, license:'ET-0401-E', tagline:'Restored 16th-century finca offering timeless tranquility', desc:'From its lofty perch in the quiet pine-clad hills near Cala Salada, Can Savasana enjoys spectacular sea views and grand Ibizan sunsets. The 50,000 m² grounds surrounding the villa provide complete seclusion and serenity.' },
  'villa-trevi':    { name:'Villa Trevi',     tier:'Essential', area:'San Carlos',       beds:4, baths:4, sleeps:8,  min:4400,  max:11000,  lat:39.0149, lng:1.5718, min_nights:4,  flexible:false, license:'ETV-1223-E', tagline:'Cosy villa with saltwater pool, BBQ and beautiful sunrise views', desc:'Nestled in a lush landscape, Villa Trevi offers an idyllic retreat perfect for a relaxing getaway in Ibiza. Classic Ibiza style with rustic accents, a warm inviting atmosphere, and a lovely saltwater pool.' },
  'villa-puma':     { name:'Villa Puma',      tier:'Selected',  area:'Vista Alegre',     beds:6, baths:5, sleeps:12, min:16500, max:22000,  lat:38.8886, lng:1.2905, min_nights:1,  flexible:false, license:'ETV-1897-E', tagline:'Beautiful villa with amazing sea views in a gated community', desc:'Located within the prestigious and secure gated community of Vista Alegre, this six-bedroom house offers a rare combination of privacy, peace of mind, and a prime location close to the best beaches.' },
  'can-josie':      { name:'Can Josie',       tier:'Selected',  area:'San Jose',         beds:6, baths:6, sleeps:12, min:16940, max:32890,  lat:38.8878, lng:1.3301, min_nights:7,  flexible:false, license:'ET-0819-E', tagline:'A chic bohemian property close to Ibiza\'s most beautiful beaches', desc:'Can Josie is an exquisitely designed 6-bedroom villa located minutes from the bay of Cala Jondal, home to the famed Blue Marlin Beach Club. Set in the hills of San José with stunning sea views.' },
  'villa-margo':    { name:'Villa Margo',     tier:'Selected',  area:'San Jose',         beds:6, baths:5, sleeps:12, min:16500, max:34650,  lat:38.9004, lng:1.3561, min_nights:4,  flexible:false, license:'ET-1030-E', tagline:'Historic Ibiza estate with panoramic sea views', desc:'Perched atop a sprawling 30,000 m² estate, Villa Margo is a majestic six-bedroom sanctuary where 200 years of history intertwine with modern luxury. This meticulously restored property commands awe-inspiring views.' },
  'villa-adalyn':   { name:'Villa Adalyn',    tier:'Selected',  area:'San Agustín',      beds:6, baths:6, sleeps:12, min:36300, max:41800,  lat:38.9257, lng:1.2804, min_nights:7,  flexible:false, license:'ET-0351-E', tagline:'A stylish property with distant sea and sunset views', desc:'Villa Adalyn is a spectacularly designed modern 6-bedroom property set high in the hills of San José, a sought-after location close to the village of San Agustín, with breathtaking views over the Mediterranean.' },
  'villa-meghan':   { name:'Villa Meghan',    tier:'Selected',  area:'San Jose',         beds:6, baths:5, sleeps:12, min:16830, max:34650,  lat:38.9039, lng:1.3460, min_nights:7,  flexible:false, license:'ETV-1353-E', tagline:'A luxury finca with spectacular sea views', desc:'Located near Ibiza\'s south-east coast, Villa Meghan is a stunning 6-bedroom villa with breathtaking views of the Mediterranean sea and the picturesque beaches of Playa den Bossa and Formentera beyond.' },
  'can-danza':      { name:'Can Danza',       tier:'Selected',  area:'San Jose',         beds:6, baths:7, sleeps:12, min:17380, max:34650,  lat:38.9168, lng:1.3604, min_nights:7,  flexible:false, license:'ETV-2336-E', tagline:'Lavishly built and uniquely equipped finca', desc:'Can Danza is a magnificent property where each of the 6 bedrooms has been meticulously crafted for the utmost comfort and style. The expansive living spaces flow naturally to the terrace and infinity pool.' },
  'villa-evelyn':   { name:'Villa Evelyn',    tier:'Selected',  area:'Cala Jondal',      beds:4, baths:4, sleeps:8,  min:17050, max:19250,  lat:38.8684, lng:1.3100, min_nights:7,  flexible:true, license:'ET-0424-E', tagline:'A stylish villa perched above Cala Jondal', desc:'Villa Evelyn is an elegant contemporary villa set on a pine-clad hillside above Cala Jondal, home to the iconic Blue Marlin beach club. A salt-water infinity pool, rooftop terrace, and sweeping Mediterranean views define this exceptional retreat.' },
  'villa-marielle': { name:'Villa Marielle',  tier:'Private',   area:'San Jose',         beds:5, baths:5, sleeps:10, min:55000, max:110000, lat:38.8920, lng:1.3093, min_nights:7,  flexible:false, license:'ETV-2077-E', tagline:'A breathtaking property with expansive and impeccably designed outdoor living', desc:'Villa Marielle is an exclusive 5-bedroom private residence defined by refined design and quiet elegance. Set in a secluded location between San José and the iconic Cala Comte beach, it offers absolute privacy at its finest.' },
  'villa-bailey':   { name:'Villa Bailey',    tier:'Private',   area:'Es Cubells',       beds:6, baths:6, sleeps:8,  min:63250, max:100100, lat:38.8670, lng:1.2550, min_nights:7,  flexible:false, license:'ET-0642-E', tagline:'Frontline elegance with panoramic sea views over Es Cubells', desc:'Villa Bailey is an exceptional front-line property set high on a cliffside in the exclusive area of Es Cubells, with direct access to a secluded cove and uninterrupted views across the sea to Formentera.' },
  'can-nemo':       { name:'Can Nemo',        tier:'Private',   area:'Cap Martinet',     beds:6, baths:5, sleeps:12, min:30000, max:95000,  lat:38.9261, lng:1.4690, min_nights:7,  flexible:false, license:'ETV-1461-E', tagline:'Ibiza\'s most iconic super villa with unparalleled service', desc:'Can Nemo is a masterpiece of modern design — Ibiza\'s most iconic super villa. 6 bedrooms, 5 bathrooms, and an estate set over sprawling lush gardens in the most coveted address on the island.' },
  'finca-utopia':   { name:'Finca Utopia',    tier:'Private',   area:'San Lorenzo',      beds:9, baths:9, sleeps:18, min:45000, max:90000,  lat:39.0373, lng:1.4745, min_nights:7,  flexible:false, license:'AG-0043-E', tagline:'A private 20-acre Ibicencan estate for transformative experiences', desc:'Hidden deep in Ibiza\'s countryside, Finca Utopia is a rare private estate with 9 en-suite suites, created for slow living and celebration alike. 20 acres of unspoiled land, total seclusion, total luxury.' },
  'villa-judith':   { name:'Villa Judith',    tier:'Private',   area:'Cala Llonga',      beds:4, baths:4, sleeps:8,  min:47300, max:51700,  lat:38.9394, lng:1.5050, min_nights:7,  flexible:true, license:'ETV-2511-E', tagline:'Rustic-chic elegance with panoramic bay views', desc:'Set high above the sea with breathtaking views over the bay of Sol den Serra, Villa Judith combines retro vintage style with modern architecture. Steps from the legendary Amante beach club, it is one of Ibiza\'s finest boutique retreats.' },
  'can-xarraca':    { name:'Can Xarraca',     tier:'Private',   area:'Portinatx',        beds:6, baths:4, sleeps:12, min:15125, max:61600,  lat:39.0999, lng:1.5033, min_nights:7,  flexible:false, license:'ETV-2167-E', tagline:'Divine villa surrounded by pine forests in the north of Ibiza', desc:'A spectacular hideaway with breathtaking sea views, lush private gardens, and direct access to the beach. Situated near the village of Portinatx — the untouched, natural north of the island.' },
  'can-nuri':       { name:'Can Nuri',        tier:'Private',   area:'Sa Caleta',        beds:6, baths:6, sleeps:12, min:27500, max:60500,  lat:38.8713, lng:1.3426, min_nights:3,  flexible:false, license:'ETV-1434-E', tagline:'Modern finca with amazing sea views and a large outdoor space', desc:'Located above Sa Caleta with uninterrupted views over the sea to Formentera and Cap des Falcó. With its saltwater infinity pool, Can Nuri is the ideal retreat for those who value privacy and natural beauty.' },
};

// =====================================
// VILLA COLLECTION — GRID + MAP
// =====================================
// "6 bedrooms · sleeps 12", rewritten in the current language
function renderVillaBeds() {
  document.querySelectorAll('.coll-villa-beds[data-beds]').forEach(el => {
    el.textContent = t('vc.beds', { b: el.dataset.beds, s: el.dataset.sleeps });
  });
}

function initVillaCollection() {
  const grid = document.getElementById('vcGrid');
  const mapWrap = document.getElementById('vcMapWrap');
  const noResults = document.getElementById('vcNoResults');
  const paginationEl = document.getElementById('vcPagination');
  const guestsSel = document.getElementById('vcGuests');
  const minNightsSel = document.getElementById('vcMinNights');
  const budgetSel = document.getElementById('vcBudget');
  const flexCheck = document.getElementById('vcFlexible');
  const viewBtns = document.querySelectorAll('.vc-view-btn');
  if (!grid) return;

  const allCards = Array.from(grid.querySelectorAll('.coll-villa'));
  const PER_PAGE = 6;
  let currentPage = 0;

  // --- Pagination ---
  const renderPage = () => {
    const visible = allCards.filter(c => !c.classList.contains('coll-villa--hidden'));
    const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
    currentPage = Math.min(currentPage, totalPages - 1);
    const start = currentPage * PER_PAGE;
    const end = start + PER_PAGE;

    allCards.forEach(card => {
      if (card.classList.contains('coll-villa--hidden')) {
        card.classList.remove('coll-villa--offpage');
        return;
      }
      const idx = visible.indexOf(card);
      card.classList.toggle('coll-villa--offpage', idx < start || idx >= end);
    });

    if (noResults) noResults.hidden = visible.length > 0;

    // Build pagination bar
    if (paginationEl) {
      if (totalPages > 1) {
        const from = start + 1;
        const to = Math.min(end, visible.length);
        const total = visible.length;
        const pageStr = `${String(currentPage + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;

        paginationEl.innerHTML = `
          <span class="vc-page-count">${t('vc.showing', { from, to, total })}</span>
          <div class="vc-page-nav">
            <button class="vc-page-arr" id="vcNavPrev" ${currentPage === 0 ? 'disabled' : ''}>&#8249;</button>
            <span class="vc-page-indicator">${pageStr}</span>
            <button class="vc-page-arr" id="vcNavNext" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>&#8250;</button>
          </div>`;

        paginationEl.querySelector('#vcNavPrev')
          .addEventListener('click', () => { currentPage--; renderPage(); });
        paginationEl.querySelector('#vcNavNext')
          .addEventListener('click', () => { currentPage++; renderPage(); });

        paginationEl.hidden = false;
      } else {
        paginationEl.hidden = true;
      }
    }
  };

  // --- Filtering ---
  const applyFilters = () => {
    const guestMin = guestsSel ? parseInt(guestsSel.value) : 0;
    const maxNights = minNightsSel ? parseInt(minNightsSel.value) : 0;
    const maxBudget = budgetSel ? parseInt(budgetSel.value) : 0;
    const flexOnly = flexCheck ? flexCheck.checked : false;

    allCards.forEach(card => {
      const sleeps = parseInt(card.dataset.sleeps) || 0;
      const minN = parseInt(card.dataset.minnights) || 7;
      const minPrice = parseInt(card.dataset.min) || 0;
      const flex = card.dataset.flexible === '1';
      const show = (guestMin === 0 || sleeps >= guestMin)
                && (maxNights === 0 || minN <= maxNights)
                && (maxBudget === 0 || minPrice <= maxBudget)
                && (!flexOnly || flex);
      card.classList.toggle('coll-villa--hidden', !show);
    });

    currentPage = 0;
    renderPage();

    if (mapWrap && !mapWrap.hidden && window._vcMap) refreshMapMarkers();
  };

  renderVillaBeds();
  document.addEventListener('ws:lang', () => { renderVillaBeds(); renderPage(); });
  if (guestsSel) guestsSel.addEventListener('change', applyFilters);
  if (minNightsSel) minNightsSel.addEventListener('change', applyFilters);
  if (budgetSel) budgetSel.addEventListener('change', applyFilters);
  if (flexCheck) flexCheck.addEventListener('change', applyFilters);

  // --- Villa card click → modal ---
  allCards.forEach(card => {
    card.addEventListener('click', () => openVillaModal(card.dataset.villa));
  });

  // --- View toggle ---
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      if (view === 'map') {
        grid.hidden = true;
        if (paginationEl) paginationEl.hidden = true;
        if (noResults) noResults.hidden = true;
        mapWrap.hidden = false;
        initMap();
      } else {
        grid.hidden = false;
        mapWrap.hidden = true;
        applyFilters();
      }
    });
  });

  // Initialise first page
  renderPage();

  // --- Leaflet map ---
  let mapInitialised = false;

  const initMap = () => {
    if (mapInitialised) { refreshMapMarkers(); return; }
    mapInitialised = true;

    const map = L.map('vcMap', { scrollWheelZoom: false }).setView([38.95, 1.40], 11);
    window._vcMap = map;
    window._vcMarkers = [];

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const houseIcon = L.divIcon({
      className: '',
      html: `<svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <filter id="ds"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.35"/></filter>
        <g filter="url(#ds)">
          <path d="M16 3L2 14h3v13h8v-8h6v8h8V14h3L16 3z" fill="#b8945f" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>
        </g>
      </svg>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -34],
    });

    Object.entries(villaData).forEach(([slug, v]) => {
      if (!v.lat || !v.lng) return;
      const thumb = `assets/villas/${slug}.jpg`;
      const popup = L.popup({ maxWidth: 240, className: 'vc-popup-wrap' }).setContent(
        `<div class="vc-popup">
          <img class="vc-popup-img" src="${thumb}" alt="${v.name}">
          <div class="vc-popup-body">
            <span class="vc-popup-name">${v.name}</span>
            <span class="vc-popup-loc">${v.area}</span>
            <span class="vc-popup-beds">${v.beds} bedrooms · sleeps ${v.sleeps}</span>
            <span class="vc-popup-btn" data-slug="${slug}">View details →</span>
          </div>
        </div>`
      );

      const marker = L.marker([v.lat, v.lng], { icon: houseIcon })
        .bindPopup(popup)
        .addTo(map);

      marker._villaSlug = slug;
      window._vcMarkers.push(marker);

      popup.on('add', () => {
        const btn = popup.getElement()?.querySelector('[data-slug]');
        if (btn) btn.addEventListener('click', () => openVillaModal(btn.dataset.slug));
      });
    });

    refreshMapMarkers();
  };

  const refreshMapMarkers = () => {
    if (!window._vcMarkers) return;
    const guestMin = guestsSel ? parseInt(guestsSel.value) : 0;
    const maxNights = minNightsSel ? parseInt(minNightsSel.value) : 0;
    const maxBudget = budgetSel ? parseInt(budgetSel.value) : 0;
    const flexOnly = flexCheck ? flexCheck.checked : false;

    window._vcMarkers.forEach(marker => {
      const v = villaData[marker._villaSlug];
      if (!v) return;
      const show = (guestMin === 0 || v.sleeps >= guestMin)
                && (maxNights === 0 || v.min_nights <= maxNights)
                && (maxBudget === 0 || v.min <= maxBudget)
                && (!flexOnly || v.flexible);
      if (show) {
        if (!window._vcMap.hasLayer(marker)) marker.addTo(window._vcMap);
      } else {
        if (window._vcMap.hasLayer(marker)) window._vcMap.removeLayer(marker);
      }
    });
  };
}

// =====================================
// VILLA MODAL
// =====================================
function openVillaModal(slug) {
  const v = villaData[slug];
  if (!v) return;
  const modal = document.getElementById('villaModal');
  if (!modal) return;

  const tierKey = 'tier.' + v.tier.toLowerCase();
  const tier = t(tierKey);
  modal.dataset.slug = slug;
  modal.querySelector('.villa-modal-tier').textContent = tier;
  modal.querySelector('.villa-modal-loc').textContent = v.area;
  modal.querySelector('.villa-modal-name').textContent = v.name;
  modal.querySelector('.villa-modal-tagline').textContent = t(`villa.${slug}.tagline`);
  modal.querySelector('.villa-modal-beds').textContent = v.beds;
  modal.querySelector('.villa-modal-baths').textContent = v.baths;
  modal.querySelector('.villa-modal-sleeps').textContent = v.sleeps;
  modal.querySelector('.villa-modal-desc').textContent = t(`villa.${slug}.desc`);
  const locale = { EN: 'en-GB', IT: 'it-IT', ES: 'es-ES', FR: 'fr-FR', DE: 'de-DE' }[currentLang] || 'en-GB';
  modal.querySelector('.villa-modal-price').textContent = t('vc.from', {
    min: v.min.toLocaleString(locale),
    max: v.max.toLocaleString(locale),
  });
  const licEl = modal.querySelector('.villa-modal-license');
  if (licEl) licEl.textContent = v.license ? t('vc.license', { l: v.license }) : '';

  const ctaLink = modal.querySelector('.villa-modal-cta');
  ctaLink.href = `contact.html?villa=${encodeURIComponent(v.name)}`;

  const waLink = modal.querySelector('.villa-modal-wa');
  const waMsg = encodeURIComponent(t('vc.hello', { name: v.name, tier }));
  waLink.href = `https://wa.me/34617010756?text=${waMsg}`;

  // Build photo gallery
  const photos = (window.villaPhotos && window.villaPhotos[slug]) || [];
  const allPhotos = photos.length > 0 ? photos : [`assets/villas/${slug}.jpg`];
  let currentPhoto = 0;

  const heroImg = modal.querySelector('.villa-modal-img');
  const thumbsEl = modal.querySelector('#villaModalThumbs');
  const counter = modal.querySelector('.villa-modal-counter');
  const prevBtn = modal.querySelector('.villa-modal-prev');
  const nextBtn = modal.querySelector('.villa-modal-next');

  const showPhoto = (idx) => {
    currentPhoto = Math.max(0, Math.min(idx, allPhotos.length - 1));
    heroImg.src = allPhotos[currentPhoto];
    heroImg.alt = v.name;
    counter.textContent = `${currentPhoto + 1} / ${allPhotos.length}`;
    prevBtn.disabled = currentPhoto === 0;
    nextBtn.disabled = currentPhoto === allPhotos.length - 1;
    // Update active thumb
    thumbsEl.querySelectorAll('.villa-modal-thumb').forEach((t, i) => {
      t.classList.toggle('active', i === currentPhoto);
    });
    // Scroll thumb into view
    const activThumb = thumbsEl.children[currentPhoto];
    if (activThumb) activThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Populate thumbnails (lazy load)
  thumbsEl.innerHTML = '';
  allPhotos.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    img.className = 'villa-modal-thumb' + (idx === 0 ? ' active' : '');
    img.addEventListener('click', () => showPhoto(idx));
    thumbsEl.appendChild(img);
  });

  modal._prevHandler = () => showPhoto(currentPhoto - 1);
  modal._nextHandler = () => showPhoto(currentPhoto + 1);
  prevBtn.onclick = modal._prevHandler;
  nextBtn.onclick = modal._nextHandler;

  showPhoto(0);

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

// Re-render the open villa in the new language
document.addEventListener('ws:lang', () => {
  const modal = document.getElementById('villaModal');
  if (modal && modal.classList.contains('is-open') && modal.dataset.slug) openVillaModal(modal.dataset.slug);
});

function closeVillaModal() {
  const modal = document.getElementById('villaModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  const thumbsEl = modal.querySelector('#villaModalThumbs');
  if (thumbsEl) thumbsEl.innerHTML = '';
}

function initVillaModal() {
  const modal = document.getElementById('villaModal');
  if (!modal) return;
  modal.querySelector('.villa-modal-overlay').addEventListener('click', closeVillaModal);
  modal.querySelector('.villa-modal-close').addEventListener('click', closeVillaModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeVillaModal();
  });
}

// =====================================
// SERVICE MODAL
// =====================================
function initServiceModal() {
  const modal = document.getElementById('svcModal');
  if (!modal) return;

  document.querySelectorAll('[data-open-svc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openServiceModal(btn.dataset.openSvc);
    });
  });

  modal.querySelector('.svc-modal-overlay').addEventListener('click', closeServiceModal);
  modal.querySelector('.svc-modal-close').addEventListener('click', closeServiceModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeServiceModal();
  });

  // Links like services.html#svc-yacht open that service directly
  const fromHash = location.hash.match(/^#svc-([\w-]+)$/);
  if (fromHash) openServiceModal(fromHash[1]);
}

function openServiceModal(key) {
  const modal = document.getElementById('svcModal');
  const tpl = document.getElementById('svc-tpl-' + key);
  const body = document.getElementById('svcModalBody');
  const imgEl = modal.querySelector('.svc-modal-img');
  if (!modal || !tpl || !body) return;

  const card = document.querySelector('[data-svc="' + key + '"]');
  if (card) {
    const cardImg = card.querySelector('img');
    imgEl.src = cardImg ? cardImg.src : '';
    imgEl.alt = cardImg ? cardImg.alt : '';
  }

  body.appendChild(tpl);
  tpl.style.display = '';

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeServiceModal() {
  const modal = document.getElementById('svcModal');
  const body = document.getElementById('svcModalBody');
  const tplContainer = document.getElementById('spgTemplates');
  if (!modal) return;

  body.querySelectorAll('.spg-tpl').forEach(tpl => {
    tpl.style.display = '';
    tplContainer.appendChild(tpl);
  });

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
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

  const cta = document.getElementById('builder-cta');
  if (!cta) return;
  cta.addEventListener('click', () => {
    const lines = [];
    document.querySelectorAll('.builder-step').forEach(step => {
      const heading = step.querySelector('h4').textContent.trim();
      const sel = step.querySelector('.builder-option.selected');
      if (sel) lines.push(heading + ' ' + sel.textContent.trim());
    });
    let msg = '';
    if (lines.length) {
      msg = 'I would like to plan a custom experience. Here are my preferences:\n\n' + lines.join('\n') + '\n\nCould you please send me a tailored proposal?';
    }
    window.location.href = 'contact.html' + (msg ? '?experience=' + encodeURIComponent(msg) : '');
  });
}

// =====================================
// HOMEPAGE SCROLL SPY
// =====================================
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="index.html#"]'));
  const targets = links
    .map(a => ({ a, el: document.getElementById(a.hash.slice(1)) }))
    .filter(t => t.el);
  if (!targets.length || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('active', a.hash === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach(t => io.observe(t.el));
}

// =====================================
// PARTNER FORM
// =====================================
function initPartnerForm() {
  const form = document.getElementById('partnerForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const subject = `Partnership proposal — ${d.service}`;
    const body = [
      `Name: ${d.firstName} ${d.lastName}`,
      `Email: ${d.email}`,
      `Phone: ${d.phone || '-'}`,
      `Service: ${d.service}`,
      '',
      d.message,
    ].join('\n');
    window.location.href = `mailto:concierge@whitesoulibiza.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

// =====================================
// PLANNER (Build your holiday / Plan your event)
// =====================================
const PLANNER_LOCATIONS = [
  { id: 'Via terra', title: 'Via terra', copy: 'Ville, fincas e location sull’isola', img: 'assets/home/celebration.jpg' },
  { id: 'Via mare', title: 'Via mare', copy: 'Una festa speciale in barca', img: 'assets/home/real-ibiza-boat-club.jpg' },
];

const PLANNER_EVENT_TYPES = [
  { id: 'Eventi privati', copy: 'Una festa costruita intorno ai tuoi desideri', img: 'assets/home/real-amante.jpg' },
  { id: 'Eventi aziendali', copy: 'Incontri e occasioni da condividere con il tuo team', img: 'assets/home/villa-selected.jpg' },
  { id: 'Matrimonio', copy: 'Il vostro sì a Ibiza', img: 'assets/home/real-atzaro.jpg' },
  { id: 'Addio al nubilato e celibato', copy: 'Un’esperienza da vivere insieme prima del sì', img: 'assets/home/real-entertainment.jpg' },
  { id: 'Ritiri spirituali', copy: 'Benessere, natura e momenti di condivisione', img: 'assets/home/wellness.jpg' },
  { id: 'Eventi e DJ set', copy: 'Dai DJ set alla musica dal vivo, crea la tua serata', img: 'assets/home/real-pacha.jpg' },
];

const PLANNER_PARTIES = [
  { id: 'Amici', title: 'Gruppo di amici', copy: 'Giornate da condividere, ricordi da creare', img: 'assets/home/friends.jpg' },
  { id: 'Coppia', title: 'In coppia', copy: 'Il vostro tempo, al ritmo dell’isola', img: 'assets/home/couple.jpg' },
  { id: 'Famiglia', title: 'In famiglia', copy: 'Una vacanza da vivere insieme', img: 'assets/home/family.jpg' },
];

const PLANNER_HOLIDAY_SERVICES = [
  { id: 'Villa & soggiorno', copy: 'La tua casa sull’isola', img: 'assets/home/villa.jpg' },
  { id: 'Barca & mare', copy: 'Una giornata tra calette e mare', img: 'assets/home/boat.jpg' },
  { id: 'Chef privato', copy: 'Il piacere di una cena in villa', img: 'assets/home/chef.jpg' },
  { id: 'Drinks & Beverage', copy: 'Cocktail, bartender e bevande', img: 'assets/home/drinks-beverage.svg' },
  { id: 'Luxury cars & transfer', copy: 'Auto, transfer e autisti privati', img: 'assets/home/real-luxury-car.jpg' },
  { id: 'Private aviation', copy: 'Jet privati, elicotteri e aerei privati', img: 'assets/home/private-aviation.svg' },
  { id: 'Beauty & wellness', copy: 'Massaggi, relax e tempo per te', img: 'assets/home/wellness.jpg' },
  { id: 'Photographer', copy: 'Un ricordo speciale della vacanza', img: 'assets/home/couple.jpg' },
  { id: 'VIP reservations', copy: 'Tavoli e serate da vivere', img: 'assets/home/real-pacha.jpg' },
  { id: 'Security staff', copy: 'Personale per la tua occasione', img: 'assets/home/real-security.jpg' },
  { id: 'Intrattenimento', copy: 'Ballerine, musica e performance', img: 'assets/home/real-entertainment.jpg' },
];

// Event service categories: each option is stored as "Category: option"
const PLANNER_EVENT_CATEGORIES = [
  { name: 'Fiori e allestimenti', copy: 'La scenografia della tua festa', img: 'assets/home/real-amante.jpg', options: ['Fiori e composizioni', 'Archi e fondali floreali', 'Centrotavola e mise in place', 'Luci e decorazioni a tema'] },
  { name: 'Chef privato', copy: 'Un menu cucinato sul posto', img: 'assets/home/real-private-chef.jpg', options: ['Cucina spagnola', 'Cucina italiana', 'Cucina francese', 'Cucina giapponese', 'Altri tipi di cucina'] },
  { name: 'Catering', copy: 'Formula e stile del servizio', img: 'assets/home/dinner.jpg', options: ['Aperitivo e finger food', 'Buffet', 'Food station e isole tematiche', 'Food truck', 'Brunch o colazione'] },
  { name: 'Drinks & Beverage', copy: 'Cocktail e bevande per gli ospiti', img: 'assets/home/drinks-beverage.svg', options: ['Bartender e cocktail bar', 'Open bar', 'Champagne e vini', 'Bevande analcoliche'] },
  { name: 'Staff evento', copy: 'Il team che segue ogni dettaglio', img: 'assets/home/real-security.jpg', options: ['Coordinatore evento', 'Sicurezza e vigilanza', 'Hostess e accoglienza', 'Camerieri e personale di sala', 'Housekeeping'] },
  { name: 'Intrattenimento', copy: 'Musica e spettacoli per la festa', img: 'assets/home/real-music-agency.jpg', options: ['DJ', 'Musicisti', 'Cantanti', 'Performers', 'Fuochi d’artificio'] },
  { name: 'Audio e luci', copy: 'Attrezzature per il tuo evento', img: 'assets/home/real-entertainment.jpg', options: ['Impianto audio', 'Impianto luci', 'Console e attrezzature per DJ'] },
  { name: 'Transfer', copy: 'Spostamenti per te e i tuoi ospiti', img: 'assets/home/transfer.jpg', options: ['Transfer aeroportuali', 'Auto con autista', 'Minivan per gruppi', 'Transfer tra location e alloggio'] },
  { name: 'Foto e video', copy: 'I ricordi del tuo evento', img: 'assets/home/couple.jpg', options: ['Fotografo', 'Videomaker', 'Riprese con drone, dove consentito', 'Photo booth'] },
  { name: 'Pasticceria', copy: 'Dolci pensati per l’occasione', img: 'assets/home/celebration.jpg', options: ['Torta', 'Tavolo dei dessert', 'Pasticceria mignon'] },
  { name: 'Corpo e benessere', copy: 'Cura di sé, bellezza ed esperienze olistiche', img: 'assets/home/wellness.jpg', options: ['Massaggiatrici', 'Make-up artist', 'Hair stylist', 'Esperienze spirituali e olistiche'] },
  { name: 'Yachts & Boats', copy: 'Una giornata tra calette e mare', img: 'assets/home/boat.jpg', options: ['Yacht privato', 'Barca a motore', 'Catamarano', 'Barca con skipper'] },
  { name: 'Luxury cars & transfer', copy: 'Auto, transfer e autisti privati', img: 'assets/home/real-luxury-car.jpg', options: ['Supercar', 'Cabriolet', 'Autisti privati'] },
  { name: 'Private aviation', copy: 'Jet, elicotteri e aerei privati', img: 'assets/home/private-aviation.svg', options: ['Jet privati', 'Elicotteri', 'Aerei privati'] },
  { name: 'VIP tables', copy: 'Tavoli e serate da vivere', img: 'assets/home/real-pacha.jpg', options: ['Tavolo VIP', 'Prenotazione VIP'] },
  { name: 'Security staff', copy: 'Personale per la villa e i tuoi spostamenti', img: 'assets/home/real-security.jpg', options: ['Sicurezza in villa', 'Accompagnamento'] },
  { name: 'Beauty, Wellness & Fitness', copy: 'Benessere, movimento e cura personale', img: 'assets/home/real-beauty-concierge.jpg', options: ['Yoga', 'Massaggi', 'Personal training', 'Parrucchiere', 'Barbiere', 'Estetista', 'Truccatrice'] },
];

const PLANNER_FLOWS = {
  holiday: { steps: ['party', 'services', 'details'], title: 'Progetta la tua vacanza', eyebrow: 'LA TUA VACANZA, INIZIA QUI', max: 60, labels: { party: '01 / CON CHI PARTI?', services: '02 / VILLE ED ESPERIENZE', details: '03 / I DETTAGLI DELLA VACANZA' } },
  event: { steps: ['location', 'type', 'services', 'details'], title: 'Organizza il tuo evento', eyebrow: 'IL TUO EVENTO, INIZIA QUI', max: 500, labels: { location: '01 / VIA TERRA O VIA MARE', type: '02 / TIPO DI EVENTO', services: '03 / SERVIZI E STAFF', details: '04 / DATA E DETTAGLI' } },
};

// Translation key part for an Italian id: "Villa & soggiorno" -> "villa-soggiorno"
function pslug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Event options are stored as "Category: option"; this returns the translated pair
function optionLabel(key) {
  const cut = key.indexOf(': ');
  return `${t('cat.name.' + pslug(key.slice(0, cut)))}: ${t('opt.' + pslug(key.slice(cut + 2)))}`;
}

const plannerState = {
  mode: 'holiday',
  step: 0,
  result: false,
  location: '',
  type: '',
  party: 'Amici',
  services: new Set(),
  options: new Set(),
  guests: 2,
};

// Formats an amount as "€ 5.000", independent of the browser's locale data
function formatEuro(value) {
  return '€ ' + String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function initPlanner() {
  const dialog = document.getElementById('planner');
  if (!dialog) return;

  document.querySelectorAll('[data-start]').forEach(btn => {
    btn.addEventListener('click', () => openPlanner(btn.dataset.start, btn.dataset.service));
  });

  document.getElementById('planner-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });

  document.getElementById('planner-next').addEventListener('click', plannerNext);
  document.getElementById('planner-back').addEventListener('click', plannerBack);

  // Save button and status line on the summary step
  const mail = document.getElementById('planner-mail');
  const save = document.createElement('button');
  save.type = 'button';
  save.id = 'planner-save';
  save.className = 'acc-save';
  save.setAttribute('data-t', 'acc.save');
  save.textContent = t('acc.save');
  save.addEventListener('click', onSaveProject);
  mail.insertAdjacentElement('afterend', save);
  const saved = document.createElement('p');
  saved.id = 'planner-saved';
  saved.className = 'planner-saved';
  saved.setAttribute('role', 'status');
  save.insertAdjacentElement('afterend', saved);

  // Single-choice tiles advance to the next step
  dialog.addEventListener('click', (e) => {
    const tile = e.target.closest('button[data-pick]');
    if (tile) {
      const { pick, value } = tile.dataset;
      if (pick === 'location') plannerState.location = value;
      if (pick === 'type') plannerState.type = value;
      if (pick === 'party') plannerState.party = value;
      if (pick === 'location' || pick === 'type' || pick === 'party') {
        plannerState.step += 1;
        renderPlanner();
        return;
      }
      if (pick === 'service') {
        toggleSet(plannerState.services, value);
        tile.classList.toggle('is-on', plannerState.services.has(value));
        tile.setAttribute('aria-pressed', String(plannerState.services.has(value)));
        updateSelectedSummary();
        return;
      }
    }

    const guest = e.target.closest('[data-guest]');
    if (guest) {
      const max = plannerFlow().max;
      plannerState.guests = Math.min(max, Math.max(1, plannerState.guests + Number(guest.dataset.guest)));
      renderDetails();
      return;
    }

    const preset = e.target.closest('[data-budget] [data-value]');
    if (preset) {
      const input = document.getElementById(preset.parentElement.dataset.budget === 'villa' ? 'planner-budget-villa' : 'planner-budget-services');
      input.value = preset.dataset.value;
      highlightPresets();
    }
  });

  // Event options: change events leave the accordion open
  dialog.addEventListener('change', (e) => {
    const option = e.target.closest('input[data-pick="option"]');
    if (!option) return;
    toggleSet(plannerState.options, option.dataset.value);
    updateSelectedSummary();
  });

  ['planner-budget-villa', 'planner-budget-services'].forEach(id => {
    document.getElementById(id).addEventListener('input', highlightPresets);
  });

  ['planner-arrival', 'planner-departure'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      document.getElementById('planner-stay-preview').textContent = stayPreview();
    });
  });

  // Re-render the open planner in the new language
  document.addEventListener('ws:lang', () => {
    if (dialog.open) renderPlanner();
  });
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function plannerFlow() {
  return PLANNER_FLOWS[plannerState.mode];
}

function currentStep() {
  return plannerFlow().steps[plannerState.step];
}

// service (optional): a holiday service to preselect, e.g. from the yachts page.
// The planner then opens on the services step with that service already chosen.
function openPlanner(mode, service) {
  const dialog = document.getElementById('planner');
  plannerState.mode = mode === 'event' ? 'event' : 'holiday';
  plannerState.step = 0;
  plannerState.result = false;
  plannerState.guests = 2;
  plannerState.services = new Set();
  if (service && plannerState.mode === 'holiday') {
    plannerState.services.add(service);
    plannerState.step = plannerFlow().steps.indexOf('services');
  }
  plannerState.options = new Set();
  plannerState.location = '';
  plannerState.type = '';
  document.getElementById('planner-arrival').value = '';
  document.getElementById('planner-departure').value = '';
  document.getElementById('planner-budget-villa').value = '';
  document.getElementById('planner-budget-services').value = '';
  document.getElementById('planner-notes').value = '';
  document.getElementById('planner-error').textContent = '';
  renderPlanner();
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function plannerNext() {
  document.getElementById('planner-error').textContent = '';
  const step = currentStep();

  if (step === 'details') {
    const arrival = document.getElementById('planner-arrival').value;
    const departure = document.getElementById('planner-departure').value;
    if (!arrival) return showError(t('pl.error.date'));
    if (plannerState.mode === 'holiday' && (!departure || departure <= arrival)) {
      return showError(t('pl.error.departure'));
    }
    plannerState.result = true;
    renderPlanner();
    return;
  }

  plannerState.step += 1;
  renderPlanner();
}

function showError(text) {
  document.getElementById('planner-error').textContent = text;
}

function plannerBack() {
  if (plannerState.result) {
    plannerState.result = false;
  } else if (plannerState.step === 0) {
    document.getElementById('planner').close();
    return;
  } else {
    plannerState.step -= 1;
  }
  renderPlanner();
}

function stayPreview() {
  const arrival = document.getElementById('planner-arrival').value;
  const departure = document.getElementById('planner-departure').value;
  if (plannerState.mode === 'event') {
    return arrival ? t('pl.preview.event.yes', { n: plannerState.guests }) : t('pl.preview.event.no');
  }
  const nights = arrival && departure ? Math.round((new Date(departure) - new Date(arrival)) / 86400000) : 0;
  if (nights > 0) return t('pl.preview.nights', { n: nights, p: plannerState.guests });
  if (arrival && departure) return t('pl.error.departure');
  return t('pl.preview.none');
}

function renderPlanner() {
  const dialog = document.getElementById('planner');
  const flow = plannerFlow();
  const step = currentStep();
  const mode = plannerState.mode;

  document.getElementById('planner-eyebrow').textContent = t(`pl.eyebrow.${mode}`);
  document.getElementById('planner-title').textContent = t(`pl.title.${mode}`);

  const progress = document.getElementById('planner-progress');
  progress.max = flow.steps.length;
  progress.value = plannerState.result ? flow.steps.length : plannerState.step + 1;
  const stepKey = ['services', 'details'].includes(step) ? `${step}.${mode}` : step;
  document.getElementById('planner-step-label').textContent = plannerState.result ? t('pl.step.summary') : t(`pl.step.${stepKey}`);

  dialog.querySelectorAll('.planner-step').forEach(section => {
    section.hidden = plannerState.result || section.dataset.step !== step;
  });
  document.getElementById('planner-result').hidden = !plannerState.result;

  if (!plannerState.result) {
    if (step === 'location') renderTiles('planner-locations', PLANNER_LOCATIONS, 'loc', 'location', plannerState.location);
    if (step === 'type') renderTiles('planner-types', PLANNER_EVENT_TYPES, 'type', 'type', plannerState.type);
    if (step === 'party') renderTiles('planner-parties', PLANNER_PARTIES, 'party', 'party', plannerState.party);
    if (step === 'services') renderServices();
    if (step === 'details') renderDetails();
  } else {
    renderResult();
  }

  document.getElementById('planner-back').textContent = plannerState.step === 0 && !plannerState.result ? t('pl.btn.close') : t('pl.btn.back');
  const next = document.getElementById('planner-next');
  next.hidden = plannerState.result;
  next.textContent = step === 'details' ? t('pl.btn.submit') : t('pl.btn.next');
  updateSelectedSummary();
}

function renderTiles(containerId, items, prefix, pick, selected) {
  document.getElementById(containerId).innerHTML = items.map(item => `
    <button type="button" class="planner-tile${selected === item.id ? ' is-on' : ''}" data-pick="${pick}" data-value="${item.id}" aria-pressed="${selected === item.id}">
      <img src="${item.img}" alt="" loading="lazy">
      <span class="planner-tile-copy"><strong>${t(`${prefix}.name.${pslug(item.id)}`)}</strong><span>${t(`${prefix}.desc.${pslug(item.id)}`)}</span></span>
    </button>`).join('');
}

function renderServices() {
  const intro = document.getElementById('planner-services-intro');
  const list = document.getElementById('planner-service-list');
  const cats = document.getElementById('planner-event-list');

  if (plannerState.mode === 'holiday') {
    intro.textContent = t('pl.intro.services.holiday');
    list.hidden = false;
    cats.hidden = true;
    list.innerHTML = PLANNER_HOLIDAY_SERVICES.map(item => {
      const on = plannerState.services.has(item.id);
      return `
      <button type="button" class="planner-tile${on ? ' is-on' : ''}" data-pick="service" data-value="${item.id}" aria-pressed="${on}">
        <img src="${item.img}" alt="" loading="lazy">
        <span class="planner-tile-copy"><strong>${t('svc.name.' + pslug(item.id))}</strong><span>${t('svc.desc.' + pslug(item.id))}</span></span>
        <span class="planner-check" aria-hidden="true">✓</span>
      </button>`;
    }).join('');
    return;
  }

  intro.textContent = t('pl.intro.services.event');
  list.hidden = true;
  cats.hidden = false;
  cats.innerHTML = PLANNER_EVENT_CATEGORIES.map(cat => `
    <details class="planner-cat">
      <summary>
        <img src="${cat.img}" alt="" loading="lazy">
        <span class="planner-cat-copy"><strong>${t('cat.name.' + pslug(cat.name))}</strong><span>${t('cat.desc.' + pslug(cat.name))}</span></span>
        <b aria-hidden="true">+</b>
      </summary>
      <div class="planner-options">
        ${cat.options.map(opt => {
          const key = `${cat.name}: ${opt}`;
          return `<label><input type="checkbox" data-pick="option" data-value="${key}"${plannerState.options.has(key) ? ' checked' : ''}><span>${t('opt.' + pslug(opt))}</span></label>`;
        }).join('')}
      </div>
    </details>`).join('');
}

function renderDetails() {
  const mode = plannerState.mode;
  document.getElementById('planner-arrival-label').textContent = t(`pl.arrival.${mode}`);
  document.querySelector('#planner-departure-wrap > span').textContent = t('pl.departure');
  document.getElementById('planner-departure-wrap').hidden = mode === 'event';
  document.getElementById('planner-guests-title').textContent = t(`pl.guests.${mode}`);
  document.querySelector('.planner-guests > div > span').textContent = t(`pl.guests.hint.${mode}`);
  document.getElementById('planner-guests-out').textContent = plannerState.guests;
  document.querySelector('[data-guest="-1"]').disabled = plannerState.guests <= 1;
  document.querySelector('[data-guest="1"]').disabled = plannerState.guests >= plannerFlow().max;
  document.getElementById('planner-stay-preview').textContent = stayPreview();

  const budgetLabels = document.querySelectorAll('.planner-budget-label');
  budgetLabels[0].textContent = t(`pl.budget.villa.${mode}`);
  budgetLabels[1].textContent = t('pl.budget.services');
  document.querySelectorAll('.planner-budget input').forEach(input => {
    input.placeholder = t('pl.budget.input');
  });
  document.getElementById('planner-notes').placeholder = t('pl.notes.placeholder');
  highlightPresets();
}

function highlightPresets() {
  document.querySelectorAll('[data-budget]').forEach(group => {
    const input = document.getElementById(group.dataset.budget === 'villa' ? 'planner-budget-villa' : 'planner-budget-services');
    group.querySelectorAll('[data-value]').forEach(btn => {
      const on = input.value === btn.dataset.value;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  });
}

function updateSelectedSummary() {
  const el = document.getElementById('planner-selected');
  if (plannerState.result || currentStep() !== 'services') {
    el.textContent = '';
    return;
  }
  const n = plannerState.mode === 'holiday' ? plannerState.services.size : plannerState.options.size;
  el.textContent = n === 0 ? t('pl.count.none') : n === 1 ? t('pl.count.one') : t('pl.count.many', { n });
}

function requestSummary() {
  const isEvent = plannerState.mode === 'event';
  const arrival = document.getElementById('planner-arrival').value;
  const departure = document.getElementById('planner-departure').value;
  const services = isEvent
    ? [...plannerState.options].map(optionLabel)
    : [...plannerState.services].map(id => t('svc.name.' + pslug(id)));
  const villa = document.getElementById('planner-budget-villa').value;
  const servicesBudget = document.getElementById('planner-budget-services').value;
  const notes = document.getElementById('planner-notes').value.trim();
  const amount = value => (value ? formatEuro(value) : t('pl.budget.undefined'));

  const lines = [
    isEvent
      ? t('pl.mail.event', { x: t('type.name.' + pslug(plannerState.type)), y: t('loc.name.' + pslug(plannerState.location)) })
      : t('pl.mail.holiday', { x: t('party.name.' + pslug(plannerState.party)) }),
    isEvent ? t('pl.mail.date', { a: arrival }) : t('pl.mail.dates', { a: arrival, b: departure }),
    t('pl.mail.guests', { n: plannerState.guests }),
    t(isEvent ? 'pl.mail.budget_location' : 'pl.mail.budget_villa', { x: amount(villa) }),
    t('pl.mail.budget_services', { x: amount(servicesBudget) }),
    '',
    t('pl.mail.services'),
    ...(services.length ? services.map(s => `- ${s}`) : [t('pl.mail.none')]),
  ];
  if (notes) lines.push('', t('pl.mail.notes'), notes);
  return lines.join('\n');
}

function renderResult() {
  const isEvent = plannerState.mode === 'event';
  const subject = isEvent
    ? t('pl.mail.subject.event', { x: t('type.name.' + pslug(plannerState.type)) })
    : t('pl.mail.subject.holiday', { x: t('party.name.' + pslug(plannerState.party)) });
  document.getElementById('planner-mail').href = `mailto:concierge@whitesoulibiza.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestSummary())}`;
}

// =====================================
// ACCOUNTS (register, log in, save planner projects)
// =====================================
// Public Google OAuth client ID. Leave empty and the Google button stays hidden.
const GOOGLE_CLIENT_ID = '';

const accountState = { user: null, pendingSave: false, googleLoaded: false };

// Calls the account API; returns { ok, status, data }
async function accountApi(path, method = 'GET', body) {
  try {
    const res = await fetch('/api/' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'network' } };
  }
}

function initAccount() {
  const nav = document.querySelector('.nav-right');
  if (!nav || document.getElementById('account')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'account-btn';
  btn.className = 'account-btn';
  nav.insertBefore(btn, nav.querySelector('.lang-switcher'));

  document.body.insertAdjacentHTML('beforeend', `
<dialog id="account" aria-labelledby="account-title">
  <div class="planner-top">
    <span class="eyebrow" data-t="acc.eyebrow">IL TUO SPAZIO</span>
    <button type="button" class="planner-close" id="account-close" aria-label="×">×</button>
  </div>
  <h2 id="account-title"></h2>

  <div id="account-auth">
    <div class="acc-tabs" role="tablist">
      <button type="button" data-tab="login" data-t="acc.login">Accedi</button>
      <button type="button" data-tab="register" data-t="acc.register">Registrati</button>
    </div>

    <form class="acc-form" id="acc-login" novalidate>
      <label><span data-t="acc.identifier">Email o cellulare</span><input name="identifier" autocomplete="username" required></label>
      <label><span data-t="acc.password">Password</span><input name="password" type="password" autocomplete="current-password" required></label>
      <button type="submit" class="acc-submit" data-t="acc.submit.login">Accedi</button>
    </form>

    <form class="acc-form" id="acc-register" novalidate hidden>
      <label><span data-t="acc.name">Nome</span><input name="name" autocomplete="name" required></label>
      <label><span data-t="acc.email">Email</span><input name="email" type="email" autocomplete="email" required></label>
      <label><span data-t="acc.phone">Cellulare</span><input name="phone" type="tel" autocomplete="tel"></label>
      <label><span data-t="acc.password">Password</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label class="acc-consent"><input name="consent" type="checkbox" required><span data-t="acc.consent">Acconsento al trattamento dei miei dati per salvare i progetti.</span></label>
      <button type="submit" class="acc-submit" data-t="acc.submit.register">Crea il tuo spazio</button>
    </form>

    <div class="acc-google-wrap" id="acc-google-wrap" hidden>
      <p class="acc-or" data-t="acc.or">oppure</p>
      <div id="acc-google"></div>
      <p class="acc-note" data-t="acc.google.note">Accedendo accetti il trattamento dei dati per salvare i tuoi progetti.</p>
    </div>

    <button type="button" class="acc-switch" id="acc-switch"></button>
    <p class="acc-error" id="acc-error" role="alert"></p>
  </div>

  <div id="account-panel" hidden>
    <p class="acc-hello" id="acc-hello"></p>
    <h3 class="acc-subtitle" data-t="acc.projects">I tuoi progetti</h3>
    <ul class="acc-projects" id="acc-projects"></ul>
    <button type="button" class="acc-switch" id="acc-logout" data-t="acc.logout">Esci</button>
  </div>
</dialog>`);

  btn.addEventListener('click', () => openAccount());
  document.getElementById('account-close').addEventListener('click', () => document.getElementById('account').close());
  document.querySelectorAll('#account .acc-tabs button').forEach(tab => {
    tab.addEventListener('click', () => showAccountTab(tab.dataset.tab));
  });
  document.getElementById('acc-switch').addEventListener('click', () => {
    showAccountTab(document.getElementById('acc-register').hidden ? 'register' : 'login');
  });
  document.getElementById('acc-login').addEventListener('submit', submitLogin);
  document.getElementById('acc-register').addEventListener('submit', submitRegister);
  document.getElementById('acc-logout').addEventListener('click', logoutAccount);
  document.getElementById('acc-projects').addEventListener('click', onProjectAction);
  document.addEventListener('ws:lang', renderAccountHeader);

  refreshAccount();
}

async function refreshAccount() {
  const { ok, data } = await accountApi('me');
  accountState.user = ok ? data.account : null;
  renderAccountHeader();
}

function renderAccountHeader() {
  const btn = document.getElementById('account-btn');
  if (!btn) return;
  btn.textContent = accountState.user ? accountState.user.name.split(' ')[0] : t('acc.login');
}

function openAccount(tab = 'login', message = '') {
  const dialog = document.getElementById('account');
  dialog.querySelectorAll('.acc-tabs button').forEach(b => b.setAttribute('aria-selected', 'false'));
  document.getElementById('account-auth').hidden = !!accountState.user;
  document.getElementById('account-panel').hidden = !accountState.user;
  if (accountState.user) {
    renderAccountPanel();
  } else {
    showAccountTab(tab);
    document.getElementById('acc-error').textContent = message;
  }
  renderAccountTitle();
  if (!dialog.open) dialog.showModal();
}

function renderAccountTitle() {
  const title = accountState.user
    ? t('acc.title.panel')
    : document.getElementById('acc-register').hidden ? t('acc.title.login') : t('acc.title.register');
  document.getElementById('account-title').textContent = title;
  document.getElementById('acc-hello').textContent = accountState.user ? t('acc.hello', { name: accountState.user.name }) : '';
}

function showAccountTab(tab) {
  const isRegister = tab === 'register';
  document.getElementById('acc-login').hidden = isRegister;
  document.getElementById('acc-register').hidden = !isRegister;
  document.querySelectorAll('#account .acc-tabs button').forEach(b => {
    b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  });
  document.getElementById('acc-switch').textContent = isRegister ? t('acc.switch.login') : t('acc.switch.register');
  document.getElementById('acc-error').textContent = '';
  document.getElementById('acc-google-wrap').hidden = !GOOGLE_CLIENT_ID;
  if (GOOGLE_CLIENT_ID) loadGoogleButton();
  renderAccountTitle();
}

function accountError(code) {
  const keys = { invalid: 'acc.err.invalid', taken: 'acc.err.taken', password: 'acc.err.password', email: 'acc.err.email', name: 'acc.err.name', consent: 'acc.err.consent' };
  document.getElementById('acc-error').textContent = t(keys[code] || 'acc.err.generic');
}

async function submitLogin(e) {
  e.preventDefault();
  const form = e.target;
  const body = { identifier: form.identifier.value, password: form.password.value };
  const { ok, data } = await accountApi('login', 'POST', body);
  if (!ok) return accountError(data.error);
  await afterLogin(data.account);
}

async function submitRegister(e) {
  e.preventDefault();
  const form = e.target;
  const body = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    password: form.password.value,
    consent: form.consent.checked,
  };
  const { ok, data } = await accountApi('register', 'POST', body);
  if (!ok) return accountError(data.error);
  await afterLogin(data.account);
}

// Google button from Google Identity Services; the browser sends the ID token to /api/google
function loadGoogleButton() {
  const render = () => {
    const holder = document.getElementById('acc-google');
    if (!holder || !window.google || !window.google.accounts || holder.childElementCount) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        const { ok, data } = await accountApi('google', 'POST', { credential: response.credential });
        if (!ok) return accountError(data.error);
        await afterLogin(data.account);
      },
    });
    window.google.accounts.id.renderButton(holder, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300 });
  };
  if (window.google && window.google.accounts) return render();
  if (accountState.googleLoaded) return;
  accountState.googleLoaded = true;
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = render;
  document.head.appendChild(script);
}

async function afterLogin(account) {
  accountState.user = account;
  renderAccountHeader();
  if (accountState.pendingSave) {
    accountState.pendingSave = false;
    document.getElementById('account').close();
    await saveCurrentProject();
    return;
  }
  openAccount();
}

async function logoutAccount() {
  await accountApi('logout', 'POST');
  accountState.user = null;
  renderAccountHeader();
  document.getElementById('account').close();
}

async function renderAccountPanel() {
  const list = document.getElementById('acc-projects');
  list.innerHTML = '';
  const { ok, data } = await accountApi('projects');
  if (!ok) {
    list.innerHTML = `<li class="acc-empty">${t('acc.err.generic')}</li>`;
    return;
  }
  if (!data.projects.length) {
    list.innerHTML = `<li class="acc-empty">${t('acc.projects.empty')}</li>`;
    return;
  }
  const locale = { EN: 'en-GB', IT: 'it-IT', ES: 'es-ES', FR: 'fr-FR', DE: 'de-DE' }[currentLang] || 'en-GB';
  list.innerHTML = data.projects.map(p => `
    <li class="acc-project" data-id="${p.id}">
      <div><strong>${escapeHtml(p.title)}</strong><span>${new Date(p.created_at).toLocaleDateString(locale)}</span></div>
      <div class="acc-project-actions">
        <button type="button" data-action="resume" data-id="${p.id}">${t('acc.resume')}</button>
        <button type="button" data-action="delete" data-id="${p.id}">${t('acc.delete')}</button>
      </div>
    </li>`).join('');
  list.projects = data.projects; // read back by the resume buttons
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function onProjectAction(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const list = document.getElementById('acc-projects');
  if (btn.dataset.action === 'delete') {
    if (!window.confirm(t('acc.delete.confirm'))) return;
    await accountApi('projects?id=' + encodeURIComponent(btn.dataset.id), 'DELETE');
    return renderAccountPanel();
  }
  const project = (list.projects || []).find(p => p.id === btn.dataset.id);
  if (project) {
    document.getElementById('account').close();
    restoreProject(project.data);
  }
}

// What a saved project stores: the planner state plus the details typed in the form
function projectSnapshot() {
  return {
    mode: plannerState.mode,
    party: plannerState.party,
    location: plannerState.location,
    type: plannerState.type,
    services: [...plannerState.services],
    options: [...plannerState.options],
    guests: plannerState.guests,
    arrival: document.getElementById('planner-arrival').value,
    departure: document.getElementById('planner-departure').value,
    budgetVilla: document.getElementById('planner-budget-villa').value,
    budgetServices: document.getElementById('planner-budget-services').value,
    notes: document.getElementById('planner-notes').value,
  };
}

function projectTitle() {
  const d = projectSnapshot();
  if (d.mode === 'event') return `${t('type.name.' + pslug(d.type))} · ${d.arrival}`;
  return `${t('party.name.' + pslug(d.party))} · ${d.arrival} → ${d.departure}`;
}

// Rebuilds the planner on its summary step from a saved project
function restoreProject(data) {
  const dialog = document.getElementById('planner');
  Object.assign(plannerState, {
    mode: data.mode,
    party: data.party,
    location: data.location,
    type: data.type,
    services: new Set(data.services || []),
    options: new Set(data.options || []),
    guests: data.guests,
    result: true,
  });
  plannerState.step = plannerFlow().steps.length - 1;
  document.getElementById('planner-arrival').value = data.arrival || '';
  document.getElementById('planner-departure').value = data.departure || '';
  document.getElementById('planner-budget-villa').value = data.budgetVilla || '';
  document.getElementById('planner-budget-services').value = data.budgetServices || '';
  document.getElementById('planner-notes').value = data.notes || '';
  document.getElementById('planner-saved').textContent = '';
  renderPlanner();
  if (!dialog.open) dialog.showModal();
}

// Called by the "Salva progetto" button
async function onSaveProject() {
  if (!accountState.user) {
    accountState.pendingSave = true;
    document.getElementById('planner').close();
    return openAccount('register', t('acc.need'));
  }
  await saveCurrentProject();
}

async function saveCurrentProject() {
  const status = document.getElementById('planner-saved');
  const { ok, data } = await accountApi('projects', 'POST', { title: projectTitle(), data: projectSnapshot() });
  status.textContent = ok ? t('acc.saved') : t('acc.err.generic');
  if (!document.getElementById('planner').open) document.getElementById('planner').showModal();
}
