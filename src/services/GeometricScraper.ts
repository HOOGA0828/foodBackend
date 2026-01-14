
export const GeometricScraperBrowserScript = () => {
    // 1. Collect all candidates
    const priceRegex = /(\d{1,3}(,\d{3})*)円/;
    const allEls = Array.from(document.body.querySelectorAll('*'));

    // Prices
    const priceEls = allEls.filter(el =>
        el.children.length === 0 &&
        el.textContent &&
        priceRegex.test(el.textContent)
    ).map(el => {
        const rect = el.getBoundingClientRect();
        return { el, rect, text: el.textContent?.trim() };
    });

    // Images (ignore small icons and likely banners)
    const imgs = Array.from(document.querySelectorAll('img'))
        .filter(img => {
            const rect = img.getBoundingClientRect();
            // Size filter: not too small (icon), not too wide (banner)
            return rect.width > 50 && rect.height > 50 && rect.width < 800;
        })
        .map(img => ({ img, rect: img.getBoundingClientRect(), src: img.src, alt: img.alt }));

    // Titles (h3, h4, strong, p with filtered text)
    const titleEls = Array.from(document.querySelectorAll('h3, h4, strong, p.goods_name, .ly-mod-goods-ttl, .title, .name, p'))
        .filter(el => {
            const t = el.textContent?.trim() || '';
            // Basic title heuristic: > 5 chars, no price, no 'tax included'
            return t.length > 5 && !t.includes('円') && !t.includes('税込');
        })
        .map(el => ({ el, rect: el.getBoundingClientRect(), text: el.textContent?.trim() }));

    const results: any[] = [];
    const processedImages = new Set<string>();

    // 2. Match Price to Closest Image strictly ABOVE/NEAR it
    for (const price of priceEls) {
        // Find closest image
        let bestImg = null;
        let minDist = Infinity;

        for (const img of imgs) {
            // Image must be above or slightly below (aligned)
            // Usually Image is above Price.
            const yDiff = price.rect.top - img.rect.bottom;

            // Center points
            const pCenter = { x: price.rect.left + price.rect.width / 2, y: price.rect.top + price.rect.height / 2 };
            const iCenter = { x: img.rect.left + img.rect.width / 2, y: img.rect.top + img.rect.height / 2 };

            const dist = Math.sqrt(Math.pow(pCenter.x - iCenter.x, 2) + Math.pow(pCenter.y - iCenter.y, 2));

            // Heuristic: Image should be roughly above or aligned with price
            // Horizontal alignment check: < 300px
            // Vertical check: Price is roughly below Image
            if (Math.abs(pCenter.x - iCenter.x) < 300 && (price.rect.top > img.rect.top)) {
                if (dist < minDist) {
                    minDist = dist;
                    bestImg = img;
                }
            }
        }

        if (bestImg && minDist < 600) {
            // Find Title (closest text above price, below image?)
            let bestTitle = '未知の製品';
            let minTitleDist = Infinity;

            for (const t of titleEls) {
                const dist = Math.sqrt(Math.pow(price.rect.x - t.rect.x, 2) + Math.pow(price.rect.y - t.rect.y, 2));
                // Title usually above price
                if (price.rect.top > t.rect.top && dist < minTitleDist && dist < 400) {
                    minTitleDist = dist;
                    bestTitle = t.text || '';
                }
            }

            // Fallback to alt if title not found
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
