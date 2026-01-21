
import { config } from 'dotenv';
import { resolve } from 'path';
import { createAIParserService } from '../services/aiParser.js';
import { MosBurgerStrategy } from '../scraper/strategies/MosBurgerStrategy.js';
import { BRANDS } from '../config/brands.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

async function testMosScraper() {
    console.log('🧪 Testing Mos Burger Scraper...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        process.exit(1);
    }

    const aiParser = createAIParserService(apiKey);
    const strategy = new MosBurgerStrategy(aiParser);

    const mosConfig = BRANDS.find(b => b.name === 'mos_burger');
    if (!mosConfig) {
        console.error('❌ Mos Burger config not found');
        process.exit(1);
    }

    console.log('📋 Brand Config:', mosConfig);

    try {
        const result = await strategy.scrape(mosConfig);
        console.log('✅ Scrape Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Scrape Failed:', error);
    }
}

testMosScraper();
