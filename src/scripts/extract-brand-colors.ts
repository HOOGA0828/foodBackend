
import { PrismaClient } from '@prisma/client';
import getPixels from 'get-pixels';
import quantize from 'quantize';
import { BRANDS } from '../config/brands.js';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// Helper to get pixels from URL
function getPixelsPromise(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        getPixels(url, (err, pixels) => {
            if (err) reject(err);
            else resolve(pixels);
        });
    });
}

// Convert RGB/RGBA to Hex
function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

async function getDominantColors(imageUrl: string, count: number = 3): Promise<string[]> {
    try {
        const pixels = await getPixelsPromise(imageUrl);
        const data = pixels.data;
        const pixelArray: [number, number, number][] = [];

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip transparent or very light/dark pixels
            if (typeof a !== 'undefined' && a < 125) continue;
            if (r > 240 && g > 240 && b > 240) continue; // Skip white
            // if (r < 15 && g < 15 && b < 15) continue; // Skip black (optional, sometimes brands are black)

            pixelArray.push([r, g, b]);
        }

        if (pixelArray.length === 0) return [];

        // Use quantize to find dominant colors
        const colorMap = quantize(pixelArray, count);
        const palette = colorMap.palette(); // returns array of [r, g, b]

        if (!palette) return [];

        return palette.map((color: [number, number, number]) => rgbToHex(color[0], color[1], color[2]));
    } catch (error) {
        console.error(`Failed to process image ${imageUrl}:`, error);
        return [];
    }
}

async function getFaviconUrl(websiteUrl: string): Promise<string | null> {
    // Strategy 1: Google Favicon Service (Most reliable/easiest)
    // Format: https://www.google.com/s2/favicons?domain={domain}&sz={size}
    try {
        const urlObj = new URL(websiteUrl);
        return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
    } catch {
        return null;
    }

    // Strategy 2: Cheerio scraping (Fallback) - implemented if needed
}

async function main() {
    console.log('🎨 Starting Brand Color Extraction...');

    for (const brandConfig of BRANDS) {
        console.log(`\nProcessing ${brandConfig.displayName} (${brandConfig.name})...`);

        try {
            // 1. Get Brand from DB
            const brand = await prisma.brand.findFirst({
                where: { slug: brandConfig.name.toLowerCase().replace(/\s+/g, '-') }
            });

            if (!brand) {
                console.warn(`⚠️ Brand not found in DB: ${brandConfig.name}`);
                continue;
            }

            // 2. Determine Favicon URL
            // Use Google's service for high quality icons
            const faviconUrl = await getFaviconUrl(brandConfig.url);

            if (!faviconUrl) {
                console.warn(`⚠️ Could not determine favicon URL for ${brandConfig.name}`);
                continue;
            }

            console.log(`   Found Favicon: ${faviconUrl}`);

            // 3. Extract Colors
            const colors = await getDominantColors(faviconUrl, 3);

            if (colors.length === 0) {
                console.warn(`⚠️ No colors extracted for ${brandConfig.name}`);
                continue;
            }

            console.log(`   Extracted Colors: ${colors.join(', ')}`);

            // 4. Save to DB
            await prisma.brand.update({
                where: { id: brand.id },
                data: { colors: colors }
            });

            console.log(`   ✅ Saved to database`);

        } catch (error) {
            console.error(`❌ Error processing ${brandConfig.name}:`, error);
        }
    }

    console.log('\n✨ Analysis Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
