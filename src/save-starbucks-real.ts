
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { createWebScraper } from './scraper/scraper.js';
import { createSupabaseService } from './services/supabase.js';
import { AIParserService } from './services/aiParser.js';
import { getBrandByName } from './config/brands.js';

dotenv.config();

async function run() {
    const supabase = createSupabaseService();
    if (!supabase) {
        console.error('No Supabase');
        return;
    }

    const aiParser = new AIParserService(process.env.OPENAI_API_KEY || '');
    const scraper = createWebScraper(aiParser);
    const config = getBrandByName('starbucks');

    if (!config) return;

    await fs.writeFile('progress.txt', 'Starting...\n');
    console.log('Scraping...');
    try {
        const result = await scraper.scrapeAndParseBrand(config);
        await fs.appendFile('progress.txt', `Scraped ${result.productsCount} items.\n`);
        console.log(`Scraped ${result.productsCount} items.`);

        console.log('Saving...');
        await fs.appendFile('progress.txt', 'Saving to DB...\n');
        const saveRes = await supabase.saveScraperResult(result);
        await fs.appendFile('progress.txt', `Save result: ${JSON.stringify(saveRes)}\n`);
        console.log('Save result:', JSON.stringify(saveRes));
        await fs.appendFile('progress.txt', 'Done.\n');

    } catch (e) {
        console.error('Error:', e);
        await fs.appendFile('progress.txt', `Error: ${e}\n`);
    }
}

run();
