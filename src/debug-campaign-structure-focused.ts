
import 'dotenv/config';
import { chromium } from 'playwright';

async function debugCampaignPageStructure() {
    console.log('🔍 除錯：檢查 Campaign 頁面產品結構 (聚焦版)');

    const targetUrl = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 抓取包含價格的元素的父層結構
        const debugData = await page.evaluate(() => {
            const items = [];
            // 尋找包含 "円" 的元素
            const elements = document.body.querySelectorAll('*');

            for (const el of elements) {
                if (el.children.length === 0 && el.textContent?.includes('円')) {
                    // 找到價格，往上找 2-3 層看結構
                    let parent = el.parentElement;
                    let wrapper = parent;

                    // 嘗試找到包含圖片的共同父層
                    for (let i = 0; i < 3; i++) {
                        if (wrapper?.querySelector('img')) {
                            break;
                        }
                        wrapper = wrapper?.parentElement;
                    }

                    if (wrapper) {
                        items.push({
                            price: el.textContent.trim(),
                            wrapperClass: wrapper.className,
                            wrapperHtml: wrapper.outerHTML.substring(0, 300), // 取前300字元避免截斷
                            imgSrc: wrapper.querySelector('img')?.src || '無圖片',
                            title: wrapper.innerText.split('\n')[0].substring(0, 50) // 嘗試抓第一行文字作為標題
                        });
                    }
                }
                if (items.length >= 3) break; // 只看前 3 個
            }
            return items;
        });

        console.log(`找到 ${debugData.length} 個範例:\n`);
        debugData.forEach((item, i) => {
            console.log(`--- 範例 ${i + 1} ---`);
            console.log(`Class: ${item.wrapperClass}`);
            console.log(`價格: ${item.price}`);
            console.log(`標題(推測): ${item.title}`);
            console.log(`圖片: ${item.imgSrc}`);
            console.log(`HTML片段: ${item.wrapperHtml}\n`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

debugCampaignPageStructure().catch(console.error);
