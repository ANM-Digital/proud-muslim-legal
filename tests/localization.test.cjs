const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const expected = ["en", "tr", "ar", "de", "es", "fr", "pt", "ru", "id", "ms", "ur"];
const pages = ['index.html','about.html','privacy-terms.html','disclaimer.html','licenses.html','datasets.html','websites.html','support.html','support-the-developer.html'];
const dictionaries = {window: {}};
vm.runInNewContext(read('assets/js/i18n.js'), dictionaries);
const translations = dictionaries.window.translations;
function flatten(object, prefix = '') {
  return Object.fromEntries(Object.entries(object).flatMap(([key, value]) => {
    const name = prefix ? prefix + '.' + key : key;
    return typeof value === 'string' ? [[name, value]] : Object.entries(flatten(value, name));
  }));
}
function context(href = 'https://example.test/legal/disclaimer.html?lang=ar', blocked = false) {
  const location = new URL(href);
  location.replace = destination => { location.replaced = destination; };
  const nodes = Object.keys(flatten(translations.en)).map(key => ({dataset: {i18n: key}, textContent: ''}));
  const links = ['privacy-terms.html#privacy', 'support.html', '#main', 'https://other.test/info.html', 'mailto:info@anmdigital.online'].map(href => ({
    href, getAttribute(name) { return this[name]; }, setAttribute(name, value) { this[name] = value; }
  }));
  const selector = {value: '', addEventListener(name, handler) { this[name] = handler; }};
  const document = {
    readyState: 'loading', documentElement: {}, addEventListener() {}, querySelector() { return null; },
    getElementById(id) { return id === 'language-select' ? selector : null; },
    querySelectorAll(query) { return query === '[data-i18n]' ? nodes : query === 'a[href]' ? links : []; }
  };
  const localStorage = {getItem() { if (blocked) throw Error('blocked'); return null; }, setItem() { if (blocked) throw Error('blocked'); }};
  const c = {window: {translations, location, history: {replaceState(a, b, url) { this.url = url; }}}, document, localStorage, navigator: {language: 'en'}, URL, URLSearchParams};
  vm.createContext(c); vm.runInContext(read('assets/js/app.js'), c);
  return {c, nodes, links, selector};
}

test('Every supported language has the full legal dictionary without missing keys', () => {
  assert.deepEqual(Object.keys(translations), expected);
  const manifest = JSON.parse(read('translations/languages.json'));
  assert.deepEqual(manifest.map(([code]) => code), expected);
  assert.deepEqual(fs.readdirSync(path.join(root, 'translations')).filter(name => name.endsWith('.json') && name !== 'languages.json').map(name => name.replace(/\.json$/, '')).sort(), [...expected].sort());
  for (const locale of expected) assert.deepEqual(JSON.parse(read('translations/' + locale + '.json')), JSON.parse(JSON.stringify(translations[locale])), locale + ': JSON/runtime dictionary mismatch');
  const source = flatten(translations.en);
  for (const locale of expected) {
    const localized = flatten(translations[locale]);
    assert.deepEqual(Object.keys(localized).sort(), Object.keys(source).sort(), locale);
    for (const [key, value] of Object.entries(localized)) assert.ok(value.trim(), locale + ': ' + key);
    for (const key of ['legalTranslationNotice.text', 'translationNotice.independence', 'translationNotice.responsibility', 'translationNotice.guidance']) {
      if (locale !== 'en') assert.notEqual(localized[key], source[key], locale + ': untranslated ' + key);
    }
    assert.ok(localized['legalTranslationNotice.text'].includes('info@anmdigital.online'), locale);
    assert.ok(/[1১१١۱][3৩३٣۳]/u.test(localized['privacyTerms.childrenText']), locale + ': minimum-age source changed');
    for (const name of ['ar.alafasy', 'Al Quran Cloud', 'Islamic Network']) {
      assert.ok(localized['licenses.hadithAudioText'].includes(name), locale + ': missing recitation attribution ' + name);
    }
    for (const [key, value] of Object.entries(source)) {
      if (value.includes('info@anmdigital.online')) assert.ok(localized[key].includes('info@anmdigital.online'), locale + ': missing support address in ' + key);
    }
  }
});

test('All nine legal pages expose 11 languages and valid localized content and controls', () => {
  for (const page of pages) {
    const html = read(page);
    assert.deepEqual([...html.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]), expected, page);
    const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(m => m[1]);
    for (const locale of expected) {
      const values = flatten(translations[locale]);
      for (const key of keys) assert.ok(values[key], page + ': ' + locale + ': ' + key);
    }
    assert.equal((html.match(/id="legal-translation-notice"/g) || []).length, 1, page);
    assert.ok(html.includes('data-i18n="legalTranslationNotice.text"'), page);
    assert.ok(html.includes('assets/js/i18n.js'), page);
    assert.ok(html.includes('data-i18n="common.skipToContent"'), page);
  }
});

test('Language switching renders every key and sets Arabic and Urdu RTL', () => {
  const {c, nodes, selector} = context();
  for (const locale of expected) {
    c.applyTranslations(locale);
    assert.equal(c.document.documentElement.lang, locale);
    assert.equal(c.document.documentElement.dir, ['ar', 'ur'].includes(locale) ? 'rtl' : 'ltr');
    assert.equal(selector.value, locale);
    const values = flatten(translations[locale]);
    for (const node of nodes) assert.equal(node.textContent, values[node.dataset.i18n]);
  }
});

test('Direct links, reload URLs and navigation retain language when storage is blocked', () => {
  for (const locale of expected) {
    const {c, links, selector} = context('https://example.test/legal/disclaimer.html?lang=' + locale, true);
    c.initApp();
    assert.equal(selector.value, locale);
    assert.equal(links[0].href, '/legal/privacy-terms.html?lang=' + locale + '#privacy');
    assert.equal(links[1].href, '/legal/support.html?lang=' + locale);
    assert.equal(links[2].href, '#main');
    assert.equal(links[3].href, 'https://other.test/info.html');
    assert.equal(links[4].href, 'mailto:info@anmdigital.online');
    selector.change({target: {value: 'tr'}});
    assert.equal(c.window.history.url, '/legal/disclaimer.html?lang=tr');
  }
});

test('The Quran disclaimer remains separate and retains responsibility safeguards', () => {
  for (const page of ['disclaimer.html', 'datasets.html']) {
    const html = read(page);
    for (const key of ['independence','responsibility','guidance','report']) assert.ok(html.includes('data-i18n="translationNotice.' + key + '"'), page);
  }
  assert.ok(translations.en.translationNotice.responsibility.includes('including for errors introduced by our own processing'));
  assert.ok(translations.en.legalTranslationNotice.text.includes('rights or responsibilities that cannot legally be excluded'));
});

test('Every supported language directory keeps legacy route navigation', () => {
  for (const locale of expected.filter(locale => locale !== 'en')) {
    const html = read(locale + '/index.html');
    assert.ok(html.includes('?lang=' + locale), locale);
    assert.ok(html.includes("privacy: 'privacy-terms.html'"), locale);
    assert.ok(html.includes("disclaimer: 'disclaimer.html'"), locale);
  }
});
