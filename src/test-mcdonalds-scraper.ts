import 'dotenv/config';
import fs from 'fs';
import { createAIParserService } from './services/aiParser.js';
import { McdonaldsStrategy } from './scraper/strategies/mcdonalds.js';
import { getBrandByName } from './config/brands.js';

async function testMcdonalds() {
    console.log('🍔 Testing McDonald\'s Scraper Strategy...');

    // 1. Initialize Service
    const aiParser = createAIParserService();
    const strategy = new McdonaldsStrategy(aiParser);

    // 2. Get Config
    const config = getBrandByName('mcdonalds');
    if (!config) {
        console.error('❌ Configuration for mcdonalds not found!');
        process.exit(1);
    }

    console.log(`🎯 Target matched: ${config.url}`);

    // 3. Execute Scrape
    try {
        const result = await strategy.scrape(config);

        console.log('\n📊 Scrape Result Summary:');
        console.log(`   Status: ${result.status}`);
        console.log(`   Products Found: ${result.productsCount}`);
        console.log(`   Execution Time: ${result.executionTime}ms`);

        if (result.products.length > 0) {
            console.log('\n📦 Extracted Products:');
            result.products.forEach((p, i) => {
                console.log(`\n--- Product ${i + 1} ---`);
                console.log(`Name: ${p.originalName}`);
                console.log(`Price: ${p.price ? `${p.price.amount} ${p.price.currency}` : 'N/A'}`);
                console.log(`Image: ${p.imageUrl}`);
                console.log(`Description: ${p.originalDescription || 'N/A'}`);
                console.log(`Link: ${p.sourceUrl}`);
            });
        } else {
            console.warn('⚠️ No products found. Check if selectors are correct or if current banners are not food-related.');
        }


        // Save to file for easy debugging
        if (result.products.length > 0) {
            fs.writeFileSync('mcd_result.json', JSON.stringify(result.products, null, 2), 'utf-8');
            console.log('✅ Saved products to mcd_result.json');
        }

    } catch (error) {
        console.error('💥 Error during scraping:', error);
    }
}

testMcdonalds();
