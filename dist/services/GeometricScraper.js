export const GeometricScraperBrowserScript = () => {
    const priceRegex = /(\d{1,3}(,\d{3})*)円/;
    const allEls = Array.from(document.body.querySelectorAll('*'));
    const priceEls = allEls.filter(el => el.children.length === 0 &&
        el.textContent &&
        priceRegex.test(el.textContent)).map(el => {
        const rect = el.getBoundingClientRect();
        return { el, rect, text: el.textContent?.trim() };
    });
    const imgs = Array.from(document.querySelectorAll('img'))
        .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 50 && rect.height > 50 && rect.width < 800;
    })
        .map(img => ({ img, rect: img.getBoundingClientRect(), src: img.src, alt: img.alt }));
    const titleEls = Array.from(document.querySelectorAll('h3, h4, strong, p.goods_name, .ly-mod-goods-ttl, .title, .name, p'))
        .filter(el => {
        const t = el.textContent?.trim() || '';
        return t.length > 5 && !t.includes('円') && !t.includes('税込');
    })
        .map(el => ({ el, rect: el.getBoundingClientRect(), text: el.textContent?.trim() }));
    const results = [];
    const processedImages = new Set();
    for (const price of priceEls) {
        let bestImg = null;
        let minDist = Infinity;
        for (const img of imgs) {
            const yDiff = price.rect.top - img.rect.bottom;
            const pCenter = { x: price.rect.left + price.rect.width / 2, y: price.rect.top + price.rect.height / 2 };
            const iCenter = { x: img.rect.left + img.rect.width / 2, y: img.rect.top + img.rect.height / 2 };
            const dist = Math.sqrt(Math.pow(pCenter.x - iCenter.x, 2) + Math.pow(pCenter.y - iCenter.y, 2));
            if (Math.abs(pCenter.x - iCenter.x) < 300 && (price.rect.top > img.rect.top)) {
                if (dist < minDist) {
                    minDist = dist;
                    bestImg = img;
                }
            }
        }
        if (bestImg && minDist < 600) {
            let bestTitle = '未知の製品';
            let minTitleDist = Infinity;
            for (const t of titleEls) {
                const dist = Math.sqrt(Math.pow(price.rect.x - t.rect.x, 2) + Math.pow(price.rect.y - t.rect.y, 2));
                if (price.rect.top > t.rect.top && dist < minTitleDist && dist < 400) {
                    minTitleDist = dist;
                    bestTitle = t.text || '';
                }
            }
            if (bestTitle === '未知の製品' && bestImg.alt && bestImg.alt.length > 5) {
                bestTitle = bestImg.alt;
            }
            if (!processedImages.has(bestImg.src)) {
                processedImages.add(bestImg.src);
                results.push({
                    name: bestTitle,
                    priceText: price.text,
                    dateText: '',
                    imgUrl: bestImg.src,
                });
            }
        }
    }
    return results;
};
//# sourceMappingURL=GeometricScraper.js.map