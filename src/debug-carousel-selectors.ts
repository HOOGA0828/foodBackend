
import 'dotenv/config';
import { chromium } from 'playwright';

async function debugCarouselSelectors() {
    console.log('🔍 除錯：檢查所有可能的輪播選擇器\n');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url = 'https://www.family.co.jp/goods.html';
    console.log(`訪問: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // 測試多種選擇器
    const selectors = [
        '.responsive_carousel_module_wrapper .splide__slide',
        '.responsive_carousel_module_wrapper .splide__list .splide__slide',
        '.splide__slide',
        '.splide__list li',
        '.responsive_carousel_module_wrapper a',
        '[class*="carousel"] a',
        '[class*="slide"] a'
    ];

    console.log('測試各種選擇器:\n');

    for (const selector of selectors) {
        try {
            const count = await page.$$eval(selector, els => els.length);
            console.log(`✅ ${selector}`);
            console.log(`   找到: ${count} 個元素\n`);

            if (count > 0 && count <= 20) {
                // 顯示前 3 個的詳細資訊
                const details = await page.$$eval(selector, (els: HTMLElement[]) => {
                    return els.slice(0, 3).map((el, i) => {
                        const a = el.tagName === 'A' ? el as HTMLAnchorElement : el.querySelector('a');
                        const img = el.querySelector('img');
                        return {
                            index: i + 1,
                            tagName: el.tagName,
                            className: el.className,
                            hasLink: !!a,
                            linkHref: a?.href || '',
                            linkText: a?.innerText?.trim()?.substring(0, 50) || '',
                            hasImage: !!img,
                            imgSrc: img?.src || ''
                        };
                    });
                });

                console.log('   前 3 個的詳細資訊:');
                details.forEach(d => {
                    console.log(`   ${d.index}. <${d.tagName} class="${d.className.substring(0, 50)}...">`);
                    console.log(`      連結: ${d.hasLink ? '✅' : '❌'} ${d.linkHref.substring(0, 60)}`);
                    console.log(`      文字: ${d.linkText || '(無)'}`);
                    console.log(`      圖片: ${d.hasImage ? '✅' : '❌'}`);
                });
                console.log('\n');
            }
        } catch (error) {
            console.log(`❌ ${selector}`);
            console.log(`   錯誤: ${error.message}\n`);
        }
    }

    await browser.close();
}

debugCarouselSelectors().catch(console.error);
