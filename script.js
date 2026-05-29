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
  DE: { 'nav.home':'Startseite','nav.services':'Leistungen','nav.custom':'Erlebnisse','nav.events':'Events','nav.testimonials':'Bewertungen','nav.about':'Über uns','nav.contact':'Kontakt','cta.plan':'Erlebnis planen','cta.discover':'Leistungen entdecken','cta.start':'Aufenthalt planen','cta.create':'Erlebnis gestalten','cta.inquire':'Concierge-Anfrage stellen','cta.services':'Alle Leistungen entdecken','cta.story':'Unsere Geschichte','cta.plan.event':'Planung beginnen' },
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

  // --- Villa collection grid + map ---
  initVillaCollection();

  // --- Villa modal ---
  initVillaModal();

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
  const PER_PAGE = 12;
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
          <span class="vc-page-count">Showing ${from}–${to} of ${total} villas</span>
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

  modal.querySelector('.villa-modal-tier').textContent = v.tier;
  modal.querySelector('.villa-modal-loc').textContent = v.area;
  modal.querySelector('.villa-modal-name').textContent = v.name;
  modal.querySelector('.villa-modal-tagline').textContent = v.tagline;
  modal.querySelector('.villa-modal-beds').textContent = v.beds;
  modal.querySelector('.villa-modal-baths').textContent = v.baths;
  modal.querySelector('.villa-modal-sleeps').textContent = v.sleeps;
  modal.querySelector('.villa-modal-desc').textContent = v.desc;
  modal.querySelector('.villa-modal-price').textContent =
    `From €${v.min.toLocaleString('it-IT')} — €${v.max.toLocaleString('it-IT')} / week`;
  const licEl = modal.querySelector('.villa-modal-license');
  if (licEl) licEl.textContent = v.license ? `Tourist License: ${v.license}` : '';

  const ctaLink = modal.querySelector('.villa-modal-cta');
  ctaLink.href = `contact.html?villa=${encodeURIComponent(v.name)}`;

  const waLink = modal.querySelector('.villa-modal-wa');
  const waMsg = encodeURIComponent(`Hello, I'm interested in ${v.name} (${v.tier} collection) — could you let me know availability?`);
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
