import 'dotenv/config';
import { createAIParserService } from '../services/aiParser.js';
import { KfcStrategy } from '../scraper/strategies/kfc.js';

console.log('Testing KfcStrategy import...');

try {
    const aiParser = createAIParserService();
    const strategy = new KfcStrategy(aiParser);
    console.log('Successfully instantiated KfcStrategy');
} catch (e) {
    console.error('Failed to instantiate:', e);
}
