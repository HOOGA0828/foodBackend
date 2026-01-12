// 測試網址配置檔案
// 在這裡添加您想要測試的網址，每個網址可以設定不同的抓取配置
export const TEST_URLS = [
    {
        name: 'your-test-1',
        displayName: '您的第一個測試網址',
        url: 'https://www.akindo-sushiro.co.jp/campaign/',
        category: '111',
        newProductSelector: '.product-list',
        options: {
            waitFor: 2000,
            deepCrawling: { enabled: true }
        }
    },
    {
        name: 'your-test-2',
        displayName: '您的第2個測試網址',
        url: 'https://www.lawson.co.jp/recommend/new/list/1517583_5162.html',
        category: '111',
        newProductSelector: '.product-list',
        options: {
            waitFor: 2000,
            deepCrawling: { enabled: true }
        }
    },
    {
        name: 'your-test-3',
        displayName: '您的第3個測試網址',
        url: 'https://www.sej.co.jp/products/a/thisweek/',
        category: '111',
        newProductSelector: '.product-list',
        options: {
            waitFor: 2000,
            deepCrawling: { enabled: true }
        }
    },
];
// 使用方法：
// 1. 在上面添加您的測試網址
// 2. 執行: node test-scraper-basic.js config
// 3. 或指定特定網址: node test-scraper-basic.js https://example.com
export function getTestConfigs() {
    return TEST_URLS;
}
export function getTestConfigByName(name) {
    return TEST_URLS.find(config => config.name === name);
}
