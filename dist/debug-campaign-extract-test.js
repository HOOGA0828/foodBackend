import 'dotenv/config';
import { chromium } from 'playwright';
async function testExtractionLogic() {
    console.log('🧪 測試 Campaign 頁面提取邏輯 (使用策略中的完全相同代碼)');
    const targetUrl = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        console.log(`訪問: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('正在滾動載入...');
        await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) {
                window.scrollBy(0, 1000);
                await new Promise(r => setTimeout(r, 500));
            }
        });
        console.log('執行提取...');
        const pageProducts = await page.evaluate((sourceUrl) => {
            const results = [];
            const priceRegex = /(\d{1,3}(,\d{3})*)円/;
            const getText = (el) => el?.textContent?.trim() || '';
            const allElements = Array.from(document.body.querySelectorAll('*'));
            const priceElements = allElements.filter(el => el.children.length === 0 &&
                el.textContent &&
                priceRegex.test(el.textContent));
            const processedImages = new Set();
            const debugLog = [];
            for (const priceEl of priceElements) {
                try {
                    let container = priceEl.parentElement;
                    let img = null;
                    let title = '';
                    let depth = 0;
                    while (container && depth < 5) {
                        if (!img) {
                            img = container.querySelector('img');
                            if (img && (img.width < 50 || img.height < 50))
                                img = null;
                        }
                        if (!title) {
                            const headings = container.querySelectorAll('h3, h4, strong, .title, .name, p.goods_name, .ly-mod-goods-ttl');
                            for (const h of headings) {
                                if (h.textContent && h.textContent.trim().length > 3) {
                                    title = h.textContent.trim();
                                    break;
                                }
                            }
                        }
                        if (img && title)
                            break;
                        container = container.parentElement;
                        depth++;
                    }
                    if (container && img && title) {
                        const imgSrc = img.src;
                        if (processedImages.has(imgSrc))
                            continue;
                        processedImages.add(imgSrc);
                        const priceText = getText(priceEl);
                        const dateEl = container.querySelector('.date, .release, time, .ly-mod-goods-date');
                        const dateText = getText(dateEl);
                        results.push({
                            name: title,
                            priceText: priceText,
                            dateText: dateText,
                            imgUrl: imgSrc,
                            sourceUrl: sourceUrl
                        });
                    }
                    else {
                        if (debugLog.length < 5) {
                            debugLog.push({
                                price: priceEl.textContent,
                                foundImg: !!img,
                                foundTitle: !!title,
                                depth: depth
                            });
                        }
                    }
                }
                catch (e) {
                }
            }
            return {
                count: results.length,
                priceElementCount: priceElements.length,
                results: results,
                debugLog: debugLog
            };
        }, targetUrl);
        console.log(`\n📊 提取結果:`);
        console.log(`   找到價格元素: ${pageProducts.priceElementCount} 個`);
        console.log(`   成功提取產品: ${pageProducts.count} 個`);
        if (pageProducts.count > 0) {
            console.log('\n前 3 個產品:');
            pageProducts.results.slice(0, 3).forEach((p, i) => {
                console.log(`${i + 1}. ${p.name}`);
                console.log(`   ${p.priceText}`);
                console.log(`   ${p.imgUrl}`);
            });
        }
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await browser.close();
    }
}
testExtractionLogic().catch(console.error);
//# sourceMappingURL=debug-campaign-extract-test.js.map