import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY missing');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Note: The SDK does not have a direct listModels method on genAI instance usually, 
    // it might need the ModelManager content or using REST. 
    // Actually, the JS SDK (latest versions) might not expose listing easily without using the Admin API or just trying.
    // Wait, I can use the `getGenerativeModel` but that doesn't list.
    // I will try to use the raw API fetch to list models.

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log('Fetching models list...');
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.displayName})`);
                console.log(`  Supported methods: ${m.supportedGenerationMethods}`);
            });
        } else {
            console.log('Error listing models:', data);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

listModels();
