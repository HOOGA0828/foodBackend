
import 'dotenv/config';
import { chromium } from 'playwright';

async function testExtractionLogic() {
    console.log('🧪 測試 Campaign 頁面提取邏輯 (使用策略中的完全相同代碼)');

    // 目標 URL
    const targetUrl = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log(`訪問: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 模擬策略中的 Scroll
        console.log('正在滾動載入...');
        await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) {
                window.scrollBy(0, 1000);
                await new Promise(r => setTimeout(r, 500));
            }
        });

        // 模擬策略中的提取邏輯
        console.log('執行提取...');
        const pageProducts = await page.evaluate((sourceUrl) => {
            const results = [];

            // 策略邏輯開始
            const priceRegex = /(\d{1,3}(,\d{3})*)円/;
            const getText = (el) => el?.textContent?.trim() || '';

            // Find all potential price elements
            const allElements = Array.from(document.body.querySelectorAll('*'));
            // DEBUG: 打印總元素數量
            // console.log(`Total elements: ${allElements.length}`);

            const priceElements = allElements.filter(el =>
                el.children.length === 0 &&
                el.textContent &&
                priceRegex.test(el.textContent)
            );

            // DEBUG: 打印找到的價格元素數量
            // console.log(`Price elements: ${priceElements.length}`);

            const processedImages = new Set();
            const debugLog = []; // 收集除錯訊息

            for (const priceEl of priceElements) {
                try {
                    // Find Product Container (Price + Image + Title)
                    let container = priceEl.parentElement;
                    let img = null;
                    let title = '';
                    let depth = 0;

                    while (container && depth < 5) {
                        if (!img) {
                            img = container.querySelector('img');
                            // Heuristic: filter small icons
                            if (img && (img.width < 50 || img.height < 50)) img = null;
                        }

                        // Try various title selectors
                        if (!title) {
                            // 嘗試更多樣的標題選擇器，包含 p 標籤粗體等
                            const headings = container.querySelectorAll('h3, h4, strong, .title, .name, p.goods_name, .ly-mod-goods-ttl');
                            for (const h of headings) {
                                if (h.textContent && h.textContent.trim().length > 3) {
                                    title = h.textContent.trim();
                                    break;
                                }
                            }
                        }

                        if (img && title) break;
                        container = container.parentElement;
                        depth++;
                    }

                    if (container && img && title) {
                        const imgSrc = img.src;
                        if (processedImages.has(imgSrc)) continue;
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
                    } else {
                        // 記錄失敗原因 (僅前 5 個)
                        if (debugLog.length < 5) {
                            debugLog.push({
                                price: priceEl.textContent,
                                foundImg: !!img,
                                foundTitle: !!title,
                                depth: depth
                            });
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }
            // 策略邏輯結束

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

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

testExtractionLogic().catch(console.error);
