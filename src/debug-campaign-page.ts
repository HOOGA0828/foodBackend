
import 'dotenv/config';
import { chromium } from 'playwright';

async function debugCampaignPage() {
    console.log('🔍 除錯：檢查 Campaign 頁面結構');

    // 使用之前測試找到的一個實際 Campaign 連結
    const targetUrl = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';

    console.log(`訪問 URL: ${targetUrl}\n`);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 1. 嘗試找出頁面上的產品列表結構
        // 通常 campaign 頁面會有多個產品區塊

        console.log('測試常見的產品列表選擇器...\n');

        const selectors = [
            '.ly-goods-list',
            '.family-goods-list',
            '.campaign-goods',
            '.ly-module-goods-list',
            '.goods_list',
            '.text_module', // 很多 campaign 頁面只是圖片+文字堆疊
            '.image_module'
        ];

        for (const sel of selectors) {
            const count = await page.$$eval(sel, els => els.length);
            console.log(`選擇器 ${sel}: 找到 ${count} 個`);
        }

        // 2. 提取所有可能的產品資訊區塊
        // 找尋同時包含 "円" (價格) 和圖片的區域
        console.log('\n尋找疑似產品的區塊 (包含價格與圖片)...\n');

        const potentialProducts = await page.evaluate(() => {
            // 策略：找到所有包含價格文字的元素，然後往上找容器
            const priceRegex = /\d{1,3}(,\d{3})*円/;
            const elements = Array.from(document.body.querySelectorAll('*'));
            const priceElements = elements.filter(el =>
                el.children.length === 0 && // 只看末端節點
                el.textContent &&
                priceRegex.test(el.textContent)
            );

            return priceElements.slice(0, 5).map(el => {
                // 往上找父層，直到找到包含圖片的層級
                let parent = el.parentElement;
                let img = null;
                let depth = 0;

                while (parent && depth < 5) {
                    img = parent.querySelector('img');
                    if (img) break;
                    parent = parent.parentElement;
                    depth++;
                }

                return {
                    priceText: el.textContent?.trim() || '',
                    hasImage: !!img,
                    imgSrc: img?.src || '',
                    parentHtml: parent?.innerHTML.substring(0, 200) || '',
                    parentClass: parent?.className || ''
                };
            });
        });

        console.log(`找到 ${potentialProducts.length} 個疑似產品:\n`);
        potentialProducts.forEach((p, i) => {
            console.log(`產品 ${i + 1}:`);
            console.log(`   價格: ${p.priceText}`);
            console.log(`   圖片: ${p.hasImage ? '✅' : '❌'} ${p.imgSrc}`);
            console.log(`   容器 Class: ${p.parentClass}`);
            console.log(`   HTML 片段: ${p.parentHtml}...\n`);
        });

    } catch (e) {
        console.error('執行錯誤:', e);
    } finally {
        await browser.close();
    }
}

debugCampaignPage().catch(console.error);
