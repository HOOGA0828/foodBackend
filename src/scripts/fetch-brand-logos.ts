
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import { BRANDS } from '../config/brands.js';

const prisma = new PrismaClient();

async function fetchBrandLogo(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. Try OG Image (Best quality usually)
        let logoUrl = $('meta[property="og:image"]').attr('content');

        // 2. Try Twitter Image
        if (!logoUrl) {
            logoUrl = $('meta[name="twitter:image"]').attr('content');
        }

        // 3. Try Apple Touch Icon
        if (!logoUrl) {
            logoUrl = $('link[rel="apple-touch-icon"]').attr('href');
        }

        // 4. Try Favicon (Vector/High res)
        if (!logoUrl) {
            logoUrl = $('link[rel="icon"][type="image/svg+xml"]').attr('href');
        }

        // 5. Try Standard Favicon
        if (!logoUrl) {
            logoUrl = $('link[rel="icon"]').first().attr('href');
        }

        // 6. Try Shortcut Icon
        if (!logoUrl) {
            logoUrl = $('link[rel="shortcut icon"]').attr('href');
        }

        if (logoUrl) {
            // Resolve relative URLs
            try {
                return new URL(logoUrl, url).href;
            } catch (e) {
                console.warn(`Invalid URL found: ${logoUrl}`);
                return null;
            }
        }

        return null;
    } catch (error) {
        console.error(`Error fetching logo for ${url}:`, error);
        return null;
    }
}

async function main() {
    console.log('🚀 開始抓取品牌 Logo...');

    for (const brandConfig of BRANDS) {
        if (!brandConfig.enabled) continue;

        console.log(`\n🔍 正在處理: ${brandConfig.displayName} (${brandConfig.name})`);

        // Check if brand exists in DB
        const slug = brandConfig.name.toLowerCase().replace(/\s+/g, '-');
        const brandRecord = await prisma.brand.findUnique({
            where: { slug }
        });

        if (!brandRecord) {
            console.warn(`⚠️ 資料庫中找不到品牌: ${slug}，跳過`);
            continue;
        }

        const logoUrl = await fetchBrandLogo(brandConfig.url);

        if (logoUrl) {
            console.log(`✅ 找到 Logo: ${logoUrl}`);

            // Update DB
            await prisma.brand.update({
                where: { id: brandRecord.id },
                data: { logoUrl: logoUrl }
            });
            console.log(`💾 資料庫已更新`);
        } else {
            console.warn(`❌ 無法找到 Logo`);
        }
    }

    console.log('\n✨ 所有品牌處理完成');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
