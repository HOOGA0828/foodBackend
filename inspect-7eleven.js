import { PlaywrightCrawler } from 'crawlee';

async function inspectSevenEleven() {
  const crawler = new PlaywrightCrawler({
    maxRequestsPerMinute: 5,
    maxConcurrency: 1,
    async requestHandler({ page }) {
      console.log('檢查7-Eleven頁面結構...');

      // 等待頁面載入
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 檢查頁面標題
      const title = await page.title();
      console.log('頁面標題:', title);

      // 檢查body文字
      const bodyText = await page.$eval('body', el => el.textContent?.substring(0, 500));
      console.log('頁面內容預覽:', bodyText);

      // 檢查所有圖片
      const images = await page.$$eval('img', imgs =>
        imgs.slice(0, 20).map(img => ({
          src: img.src,
          alt: img.alt,
          className: img.className,
          dataSrc: img.getAttribute('data-src'),
          dataOriginal: img.getAttribute('data-original'),
          dataLazySrc: img.getAttribute('data-lazy-src'),
          dataLazy: img.getAttribute('data-lazy'),
          hasLazy: img.classList.contains('lazy'),
          allAttrs: Array.from(img.attributes).map(attr => `${attr.name}=${attr.value}`)
        }))
      );
      console.log('\n找到的圖片:');
      images.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.src}`);
        console.log(`     alt: ${img.alt}`);
        console.log(`     lazy: ${img.hasLazy}`);
        console.log(`     所有屬性: ${img.allAttrs.join(', ')}`);
        console.log('');
      });

      // 特別檢查產品圖片
      const productImages = images.filter(img => img.src.includes('item-image') || img.dataOriginal?.includes('item-image'));
      console.log(`產品圖片總數: ${productImages.length}`);
      productImages.forEach((img, i) => {
        const realSrc = img.dataOriginal || img.src;
        console.log(`  產品圖片 ${i + 1}: ${realSrc}`);
      });

      // 檢查是否有產品相關的div
      const productDivs = await page.$$eval('div[class*="product"], div[id*="product"]', divs =>
        divs.slice(0, 5).map(div => ({
          className: div.className,
          id: div.id,
          textPreview: div.textContent?.substring(0, 100)
        }))
      );
      console.log('\n產品相關的div:');
      productDivs.forEach((div, i) => {
        console.log(`  ${i + 1}. class='${div.className}' id='${div.id}'`);
        console.log(`     內容: ${div.textPreview}...`);
      });

      // 檢查所有連結
      const links = await page.$$eval('a[href]', anchors =>
        anchors.slice(0, 15).map(a => ({
          href: a.href,
          text: a.textContent?.trim(),
          className: a.className
        })).filter(link => link.text || link.href.includes('product'))
      );
      console.log('\n相關連結:');
      links.forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.text || '無文字'}`);
        console.log(`     連結: ${link.href}`);
        if (link.className) console.log(`     類別: ${link.className}`);
      });

      process.exit(0);
    },
    failedRequestHandler({ request }) {
      console.error('請求失敗:', request.url);
      process.exit(1);
    }
  });

  await crawler.addRequests([{
    url: 'https://www.sej.co.jp/products/a/thisweek/area/kinki/'
  }]);

  await crawler.run();
}

inspectSevenEleven().catch(console.error);