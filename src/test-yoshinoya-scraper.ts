
import { config } from 'dotenv';
import { createAIParserService } from './services/aiParser.js';
import { createWebScraper } from './scraper/scraper.js';
import { getBrandByName } from './config/brands.js';

// Load environment variables
config();

async function testYoshinoya() {
    console.log('🧪 Testing Yoshinoya Scraper...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ Missing OPENAI_API_KEY');
        process.exit(1);
    }

    const aiParser = createAIParserService(apiKey);
    const scraper = createWebScraper(aiParser);

    const brandName = '吉野家';
    const brandConfig = getBrandByName(brandName);

    if (!brandConfig) {
        console.error(`❌ Brand ${brandName} not found in config`);
        process.exit(1);
    }

    console.log(`📋 Config found for ${brandConfig.displayName}`);

    try {
        const result = await scraper.scrapeAndParseBrand(brandConfig);

        console.log('\n==========================================');
        console.log(`✅ Scrape Complete`);
        console.log(`📦 Status: ${result.status}`);
        console.log(`🔢 Products Found: ${result.productsCount}`);
        console.log('==========================================\n');

        if (result.products.length > 0) {
            console.log('🍵 Filtered Product List:');
            result.products.forEach((p, index) => {
                console.log(`\n--- Product ${index + 1} ---`);
                console.log(`Original Name (JP): ${p.originalName}`);
                console.log(`Translated Name (TW): ${p.translatedName}`);
                console.log(`Price: ${p.price ? `${p.price.amount} ${p.price.currency}` : 'N/A'}`);
                console.log(`New: ${p.isNew}`);
                console.log(`Image: ${p.imageUrl}`);
                console.log(`Source: ${p.sourceUrl}`);
            });
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

testYoshinoya();
