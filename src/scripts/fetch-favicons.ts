import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { BRANDS } from '../config/brands.js';

async function main() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const browser = await chromium.launch(); // headless: true by default

    console.log('Starting favicon extraction...');

    try {
        for (const brand of BRANDS) {
            if (!brand.enabled) {
                console.log(`Skipping disabled brand: ${brand.name}`);
                continue;
            }

            console.log(`Processing ${brand.name} (${brand.url})...`);

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            });
            const page = await context.newPage();

            let faviconUrl: string | null = null;

            try {
                await page.goto(brand.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Strategy 1: Check link tags using evaluate
                // We look for rel="icon", rel="shortcut icon", rel="apple-touch-icon"
                faviconUrl = await page.evaluate(() => {
                    const selectors = [
                        'link[rel="icon"]',
                        'link[rel="shortcut icon"]',
                        'link[rel="apple-touch-icon"]'
                    ];

                    for (const selector of selectors) {
                        const link = document.querySelector(selector) as HTMLLinkElement;
                        if (link && link.href) {
                            return link.href;
                        }
                    }
                    return null;
                });

                // Strategy 2: Check for favicon.ico at root if not found
                if (!faviconUrl) {
                    try {
                        const urlObj = new URL(brand.url);
                        const rootFavicon = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
                        // Optional: Verify if it exists, but might store dead link if we are lazy.
                        // Let's just trust it for now or do a quick HEAD request if we want to be fancy.
                        // For this script, let's assume if explicit link is missing, we fallback to this.
                        faviconUrl = rootFavicon;
                    } catch (e) {
                        console.warn(`Invalid URL for brand ${brand.name}: ${brand.url}`);
                    }
                }

                if (faviconUrl) {
                    console.log(`Found favicon: ${faviconUrl}`);

                    // Current slug generation logic from codebase
                    const slug = brand.name.toLowerCase().replace(/\s+/g, '-');

                    // Check if brand exists
                    const { data: brandData, error: findError } = await supabase
                        .from('brands')
                        .select('id')
                        .eq('slug', slug)
                        .single();

                    if (findError || !brandData) {
                        console.error(`Brand ${brand.name} (slug: ${slug}) not found in DB. Skipping update.`);

                        // Fallback: try finding by name if slug fails?
                        // Sometimes slug generation might differ if seeded differently.
                        // Let's try matching name directly as fallback
                        const { data: brandByName, error: findByNameError } = await supabase
                            .from('brands')
                            .select('id')
                            .eq('name', brand.name)
                            .single();

                        if (!findByNameError && brandByName) {
                            console.log(`Found brand by name instead of slug.`);
                            const { error: updateError } = await supabase
                                .from('brands')
                                .update({ favicon_url: faviconUrl })
                                .eq('id', brandByName.id);

                            if (updateError) console.error('Update failed:', updateError);
                            else console.log('Update success.');
                        }

                        continue;
                    }

                    const { error: updateError } = await supabase
                        .from('brands')
                        .update({ favicon_url: faviconUrl })
                        .eq('id', brandData.id);

                    if (updateError) {
                        console.error(`Failed to update ${brand.name}:`, updateError);
                    } else {
                        console.log(`Updated ${brand.name} successfully.`);
                    }
                } else {
                    console.warn(`No favicon found for ${brand.name}`);
                }

            } catch (e) {
                console.error(`Error processing ${brand.name}:`, e);
            } finally {
                await page.close();
                await context.close();
            }
        }
    } catch (e) {
        console.error("Critical error:", e);
    } finally {
        await browser.close();
        console.log('Done.');
    }
}

main();
