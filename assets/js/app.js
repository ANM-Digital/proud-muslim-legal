/**
 * Proud Muslim Legal Centre - localization, navigation, and legacy-link support.
 */

const supportedLanguages = ['en', 'tr', 'ar', 'de', 'es', 'fr', 'pt', 'ru', 'id', 'ms', 'ur'];
const languageStorageKey = 'proudMuslimLegalLanguage';

function readSavedLanguage() {
  try {
    return localStorage.getItem(languageStorageKey);
  } catch (_) {
    return null;
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch (_) {
    // The site must continue to work when storage is blocked.
  }
}

function getTranslation(lang, key) {
  if (!window.translations) return undefined;

  const getFromObject = (object, path) =>
    path.split('.').reduce(
      (value, part) => (value && value[part] !== undefined ? value[part] : undefined),
      object
    );

  const localized = window.translations[lang]
    ? getFromObject(window.translations[lang], key)
    : undefined;

  if (localized !== undefined) return localized;
  return window.translations.en ? getFromObject(window.translations.en, key) : undefined;
}

function getLanguageFromUrl() {
  const parameter = new URLSearchParams(window.location.search).get('lang');
  if (supportedLanguages.includes(parameter)) return parameter;

  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const pathLanguage = pathSegments.find((segment) => supportedLanguages.includes(segment));
  return pathLanguage || null;
}

function getInitialLanguage() {
  const urlLanguage = getLanguageFromUrl();
  if (urlLanguage) return urlLanguage;

  const savedLanguage = readSavedLanguage();
  if (supportedLanguages.includes(savedLanguage)) return savedLanguage;

  const browserLanguage = (navigator.language || navigator.userLanguage || 'en')
    .toLowerCase()
    .split('-')[0];

  return supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';
}

function redirectLegacyHashLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage !== 'index.html') return false;

  const route = window.location.hash.slice(1).toLowerCase().replace(/[^a-z-]/g, '');
  const legacyRoutes = {
    about: 'about.html',
    privacy: 'privacy-terms.html',
    'privacy-policy': 'privacy-terms.html',
    terms: 'privacy-terms.html',
    'terms-of-use': 'privacy-terms.html',
    disclaimer: 'disclaimer.html',
    licenses: 'licenses.html',
    licences: 'licenses.html',
    datasets: 'datasets.html',
    websites: 'websites.html',
    support: 'support.html'
  };

  const destination = legacyRoutes[route];
  if (!destination) return false;

  const language = getInitialLanguage();
  saveLanguage(language);
  window.location.replace(`${destination}?lang=${encodeURIComponent(language)}`);
  return true;
}

function applyTranslations(languageCode) {
  const language = supportedLanguages.includes(languageCode) ? languageCode : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = ['ar', 'ur'].includes(language) ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = getTranslation(language, element.dataset.i18n);
    if (value !== undefined && value !== null) element.textContent = value;
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const value = getTranslation(language, element.dataset.i18nAria);
    if (value) element.setAttribute('aria-label', value);
  });

  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const title = getTranslation(language, titleElement.dataset.i18n);
    if (title) document.title = `${title} | Proud Muslim`;
  }

  const languageSelect = document.getElementById('language-select');
  if (languageSelect) languageSelect.value = language;

  saveLanguage(language);
}

function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach((link) => {
    const active = link.getAttribute('href') === currentPage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function initApp() {
  if (redirectLegacyHashLink()) return;

  const initialLanguage = getInitialLanguage();
  applyTranslations(initialLanguage);
  setActiveNav();

  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', (event) => {
      applyTranslations(event.target.value);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
