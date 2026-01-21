
import 'dotenv/config';
import { createWebScraper } from './scraper/scraper.js';
import { createAIParserService } from './services/aiParser.js';
import { getBrandByName } from './config/brands.js';
import { createSupabaseService } from './services/supabase.js';

async function testMatsuya() {
    console.log('🧪 Testing Matsuya Scraper...');

    const brand = getBrandByName('Matsuya');
    if (!brand) {
        console.error('❌ Matsuya brand config not found!');
        return;
    }

    const aiParser = createAIParserService();
    const scraper = createWebScraper(aiParser);
    const supabase = createSupabaseService();

    // Run scraper
    const result = await scraper.scrapeAndParseBrand(brand);

    console.log('--- Result ---');
    console.log(`Status: ${result.status}`);
    console.log(`Products Found: ${result.productsCount}`);

    if (result.products.length > 0) {
        console.log('Sample Products:');
        result.products.slice(0, 5).forEach(p => {
            console.log(`- [${p.originalName}] -> ${p.translatedName} (${p.price?.amount} JPY)`);
            console.log(`  Filtered Desc: ${p.originalDescription?.slice(0, 30)}...`);
        });
    }

    // Attempt Save
    if (supabase && result.products.length > 0) {
        console.log('\n💾 Saving to DB...');
        await supabase.saveScraperResult(result);
    }
}

testMatsuya().catch(console.error);
