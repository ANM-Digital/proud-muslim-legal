/**
 * Proud Muslim Legal Centre - Localization & Core Application Logic
 * Shared across all 8 main HTML pages.
 */

const supportedLanguages = [
  'en',
  'tr',
  'ar',
  'de',
  'es',
  'fr',
  'pt',
  'ru',
  'id',
  'ms',
  'ur'
];

/**
 * Retrieves nested translation string from translations dictionary.
 * Falls back to English ('en') if translation is missing in the target language.
 */
function getTranslation(lang, key) {
  if (!window.translations) return key;
  
  const getFromObj = (obj, path) => {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  };

  let val = window.translations[lang] ? getFromObj(window.translations[lang], key) : undefined;
  if (val === undefined && lang !== 'en' && window.translations['en']) {
    val = getFromObj(window.translations['en'], key);
  }
  return val;
}

/**
 * Determines initial language from localStorage, browser language, or English default.
 */
function getInitialLanguage() {
  const savedLanguage = localStorage.getItem('proudMuslimLegalLanguage');
  if (supportedLanguages.includes(savedLanguage)) {
    return savedLanguage;
  }
  const browserLanguage = (navigator.language || navigator.userLanguage || 'en')
    .toLowerCase()
    .split('-')[0];
  if (supportedLanguages.includes(browserLanguage)) {
    return browserLanguage;
  }
  return 'en';
}

/**
 * Applies translations to all data-i18n elements, adjusts document lang/dir,
 * and updates document title and language selector.
 */
function applyTranslations(languageCode) {
  const language = supportedLanguages.includes(languageCode) ? languageCode : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = ['ar', 'ur'].includes(language) ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const value = getTranslation(language, key);
    if (value !== undefined && value !== null) {
      element.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const key = element.dataset.i18nAria;
    const value = getTranslation(language, key);
    if (value) {
      element.setAttribute('aria-label', value);
    }
  });

  // Dynamic Title update
  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) {
    const key = titleEl.dataset.i18n;
    const value = getTranslation(language, key);
    if (value) {
      document.title = value + ' | Proud Muslim';
    }
  }

  // Update dropdown if available
  const langSelect = document.getElementById('language-select');
  if (langSelect && langSelect.value !== language) {
    langSelect.value = language;
  }

  localStorage.setItem('proudMuslimLegalLanguage', language);
}

/**
 * Highlights active navigation item based on current page URL.
 */
function setActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.main-nav a');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

// Initialize on DOM ready
function initApp() {
  const initialLang = getInitialLanguage();
  applyTranslations(initialLang);
  setActiveNav();

  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    langSelect.value = initialLang;
    langSelect.addEventListener('change', (e) => {
      applyTranslations(e.target.value);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
