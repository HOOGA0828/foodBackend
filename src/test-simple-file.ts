
import { createWebScraper } from './scraper/scraper.js';
import { AIParserService } from './services/aiParser.js';
import { getBrandByName } from './config/brands.js';
import fs from 'fs/promises';

async function run() {
    try {
        const aiParser = new AIParserService('fake-key'); // Not used
        const scraper = createWebScraper(aiParser);
        const brandConfig = getBrandByName('starbucks');

        if (!brandConfig) throw new Error('No config');

        console.log('Starting scrape...');
        const result = await scraper.scrapeAndParseBrand(brandConfig);
        console.log('Scrape done. Count:', result.productsCount);

        await fs.writeFile('result.json', JSON.stringify(result, null, 2));
        console.log('Written to result.json');
    } catch (e) {
        console.error(e);
        await fs.writeFile('error.txt', String(e));
    }
}

run();
