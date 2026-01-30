
const html = '<div class="card"><a href="//menu.starbucks.co.jp/4524785618039" class="card__inner">';
const fixed = html.replace(/href="\/\//g, 'href="https://');
console.log('Original:', html);
console.log('Fixed:', fixed);

if (fixed.includes('href="https://menu.starbucks.co.jp')) {
    console.log('✅ Regex verification passed');
} else {
    console.log('❌ Regex verification failed');
}

const html2 = '<a href="//example.com">Link</a>';
const fixed2 = html2.replace(/href="\/\//g, 'href="https://');
console.log('Fixed 2:', fixed2);
