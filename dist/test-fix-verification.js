import { createWebScraper } from './scraper/scraper.js';
import { BRANDS } from './config/brands.js';
async function runTest() {
    try {
        console.log("Starting Test...");
        const sevenEleven = BRANDS.find(b => b.name === '7-Eleven');
        if (!sevenEleven) {
            console.error("7-Eleven config not found");
            return;
        }
        console.log("Config loaded.");
        const mockAiParser = {
            parseProducts: async (req) => {
                return {
                    success: true,
                    products: [{
                            name: "Test Product",
                            translatedName: "Test Product",
                            originalName: "Test Product Original",
                            price: { amount: 100, currency: "JPY" },
                            imageUrl: req.productLink?.imageUrl || "http://example.com/default.jpg",
                            sourceUrl: req.sourceUrl,
                            description: "Test",
                            ingredients: [],
                            isNew: true
                        }]
                };
            }
        };
        const scraper = createWebScraper(mockAiParser);
        console.log("Running scraper...");
        const result = await scraper.scrapeAndParseBrand(sevenEleven);
        console.log("Scraper finished.");
        console.log("Status:", result.status);
        if (result.products) {
            console.log("Products count:", result.products.length);
            if (result.products.length > 0) {
                const first = result.products[0];
                console.log("First product URL:", first.imageUrl);
                if (first.imageUrl && first.imageUrl.startsWith("http")) {
                    console.log("Image URL is absolute.");
                }
                else {
                    console.log("Image URL is NOT absolute or missing.");
                }
            }
        }
        else {
            console.log("Result products is undefined/null");
        }
    }
    catch (e) {
        console.error("Test failed with exception:", e);
    }
}
runTest();
//# sourceMappingURL=test-fix-verification.js.map