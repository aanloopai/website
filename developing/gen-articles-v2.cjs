// Generates 10 long-tail SEO articles. Run: node developing/gen-articles-v2.cjs
const fs = require('fs');
const path = require('path');
const today = new Date().toISOString().split('T')[0];

const articles = require('./articles-data.json');

function jsonLD(obj) {
  return JSON.stringify(obj, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
}
function escapeApos(s) { return s.replace(/'/g, "\\'"); }

function renderArticle(a) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.h1,
    description: a.description,
    author: { '@type': 'Organization', name: 'Aanloop AI', url: 'https://aanloopai.nl' },
    publisher: { '@type': 'Organization', name: 'Aanloop AI', logo: { '@type': 'ImageObject', url: 'https://aanloopai.nl/logo-mark-light-1024.png' } },
    datePublished: today,
    dateModified: today,
    mainEntityOfPage: 'https://aanloopai.nl/kennisbank/' + a.slug + '/',
    inLanguage: 'nl-NL',
  };
  let sectionsHtml = '';
  a.sections.forEach((s, i) => {
    const bg = i % 2 === 1 ? ' bg-slate-50/60 border-y border-slate-200' : '';
    const paras = s.paragraphs.map(p => '      <p class="text-slate-600 leading-relaxed mb-4">' + p + '</p>').join('\n');
    sectionsHtml += '\n  <section class="section' + bg + '">\n    <div class="container-page max-w-3xl">\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tightest text-navy text-balance mb-6">' + s.h2 + '</h2>\n' + paras + '\n    </div>\n  </section>\n';
  });
  const faqJs = a.faqs.map(f => "  { question: '" + escapeApos(f.q) + "', answer: '" + escapeApos(f.a) + "' },").join('\n');
  const relatedLinks = a.related.map(([slug, label]) =>
    '        <a href="/' + slug + '/" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy transition-all">' + label + ' →</a>'
  ).join('\n');
  return '---\n' +
    "import BaseLayout from '../../layouts/BaseLayout.astro';\n\n" +
    'const articleSchema = ' + jsonLD(articleSchema) + ';\n\n' +
    'const faqItems = [\n' + faqJs + '\n];\n---\n\n' +
    '<BaseLayout\n' +
    '  title=' + JSON.stringify(a.title) + '\n' +
    '  description=' + JSON.stringify(a.description) + '\n' +
    '  schema={articleSchema}\n  faqSchema={faqItems}\n>\n' +
    '  <section class="border-b border-slate-200 hero-gradient">\n' +
    '    <div class="container-page py-16 lg:py-24">\n' +
    '      <div class="max-w-3xl">\n' +
    '        <div class="flex items-center gap-3 mb-6">\n' +
    '          <div class="accent-band"><span></span><span></span><span></span><span></span></div>\n' +
    '          <span class="eyebrow">Kennisbank · ' + a.eyebrow + '</span>\n' +
    '        </div>\n' +
    '        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tightest text-navy text-balance leading-[1.05]">\n          ' + a.h1 + '\n        </h1>\n' +
    '        <p class="mt-6 text-lg lg:text-xl text-slate-600 leading-relaxed text-pretty">\n          ' + a.intro + '\n        </p>\n' +
    '      </div>\n    </div>\n  </section>\n' +
    sectionsHtml +
    '  <section class="section bg-slate-50/60 border-y border-slate-200">\n    <div class="container-page max-w-3xl">\n      <p class="eyebrow mb-3">ROI rekenvoorbeeld</p>\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tightest text-navy text-balance mb-6">Wat levert dit u op?</h2>\n      <p class="text-slate-600 leading-relaxed">' + a.roi + '</p>\n    </div>\n  </section>\n\n' +
    '  <section class="section">\n    <div class="container-page max-w-3xl">\n      <p class="eyebrow mb-3">Veelgestelde vragen</p>\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tightest text-navy text-balance mb-8">FAQ</h2>\n      <div class="space-y-3">\n        {faqItems.map(item => (\n          <details class="group card cursor-pointer">\n            <summary class="flex items-start justify-between gap-4 list-none">\n              <h3 class="text-base font-semibold text-navy pr-4">{item.question}</h3>\n              <svg class="w-5 h-5 flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>\n            </summary>\n            <p class="mt-3 text-sm text-slate-600 leading-relaxed">{item.answer}</p>\n          </details>\n        ))}\n      </div>\n    </div>\n  </section>\n\n' +
    '  <section class="section-tight border-t border-slate-200">\n    <div class="container-page max-w-4xl">\n      <p class="eyebrow mb-3">Verder lezen</p>\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tighter-2 text-navy text-balance mb-6">Verder verdiepen.</h2>\n      <div class="flex flex-wrap gap-2">\n        <a href="/sectoren/' + a.primary.slug + '/" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-indigo/5 hover:bg-brand-indigo/10 border border-brand-indigo/20 rounded-lg text-sm font-medium text-brand-indigo transition-all">' + a.primary.label + ' (volledige hub) →</a>\n' + relatedLinks + '\n        <a href="/sectoren/" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy transition-all">Alle sectoren →</a>\n      </div>\n    </div>\n  </section>\n\n' +
    '  <section class="section-tight bg-midnight text-pearl relative overflow-hidden">\n    <div class="absolute inset-0 dot-grid opacity-[0.04]"></div>\n    <div class="container-page relative max-w-3xl">\n      <h2 class="text-3xl font-bold tracking-tightest text-pearl text-balance reveal">' + a.ctaTitle + '</h2>\n      <p class="mt-4 text-slate-300 reveal reveal-delay-1">' + a.ctaDesc + '</p>\n      <div class="mt-6 flex flex-col sm:flex-row gap-3 reveal reveal-delay-2">\n        <a href="/demo-aanvragen/" class="btn bg-pearl text-navy hover:bg-white text-base px-6 py-3.5">Plan een demo</a>\n        <a href="/tarieven/" class="btn border border-slate-700 text-pearl hover:bg-slate-800 text-base px-6 py-3.5">Bekijk tarieven</a>\n      </div>\n    </div>\n  </section>\n</BaseLayout>\n';
}

const dir = path.join(__dirname, '..', 'src', 'pages', 'kennisbank');
let count = 0;
let totalWords = 0;
for (const a of articles) {
  const fp = path.join(dir, a.slug + '.astro');
  const content = renderArticle(a);
  fs.writeFileSync(fp, content);
  const wc = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  totalWords += wc;
  console.log('CREATED: ' + a.slug + '.astro (~' + wc + ' words)');
  count++;
}
console.log('\nTotal: ' + count + ' artikellen, ~' + totalWords + ' woorden');
