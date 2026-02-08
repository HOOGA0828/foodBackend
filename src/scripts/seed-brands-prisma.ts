import { PrismaClient } from '@prisma/client';
import { BRANDS } from '../config/brands.js'; // Ensure this path is correct

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Seeding Brands with Prisma...");

    // Basic list of brands to ensure
    // We can import from config, but let's hardcode the essential ones to be safe and quick
    const brandsToSeed = [
        {
            name: '7-Eleven',
            slug: 'seven-eleven',
            name_en: '7-Eleven',
            name_jp: 'セブン-イレブン',
            category: 'convenience_store',
            url: 'https://www.sej.co.jp/'
        },
        {
            name: 'FamilyMart',
            slug: 'familymart',
            name_en: 'FamilyMart',
            name_jp: 'ファミリーマート',
            category: 'convenience_store',
            url: 'https://www.family.co.jp/'
        },
        {
            name: 'Lawson',
            slug: 'lawson',
            name_en: 'Lawson',
            name_jp: 'ローソン',
            category: 'convenience_store',
            url: 'https://www.lawson.co.jp/'
        },
        {
            name: 'McDonalds',
            slug: 'mcdonalds',
            name_en: 'McDonalds',
            name_jp: 'マクドナルド',
            category: 'fast_food',
            url: 'https://www.mcdonalds.co.jp/'
        },
        {
            name: 'KFC',
            slug: 'kfc',
            name_en: 'KFC',
            name_jp: 'ケンタッキー',
            category: 'fast_food',
            url: 'https://www.kfc.co.jp/'
        },
        {
            name: 'Mos Burger',
            slug: 'mos-burger',
            name_en: 'Mos Burger',
            name_jp: 'モスバーガー',
            category: 'fast_food',
            url: 'https://www.mos.jp/'
        },
        {
            name: 'Yoshinoya',
            slug: 'yoshinoya',
            name_en: 'Yoshinoya',
            name_jp: '吉野家',
            category: 'restaurant',
            url: 'https://www.yoshinoya.com/'
        },
        {
            name: 'Sukiya',
            slug: 'sukiya',
            name_en: 'Sukiya',
            name_jp: 'すき家',
            category: 'restaurant',
            url: 'https://www.sukiya.jp/'
        },
        {
            name: 'Matsuya',
            slug: 'matsuya',
            name_en: 'Matsuya',
            name_jp: '松屋',
            category: 'restaurant',
            url: 'https://www.matsuyafoods.co.jp/'
        },
        {
            name: 'Starbucks',
            slug: 'starbucks',
            name_en: 'Starbucks',
            name_jp: 'スターバックス',
            category: 'restaurant',
            url: 'https://www.starbucks.co.jp/'
        }
    ];

    for (const brand of brandsToSeed) {
        try {
            const existing = await prisma.brand.findFirst({
                where: { slug: brand.slug }
            });

            if (existing) {
                console.log(`✅ Brand already exists: ${brand.name}`);
            } else {
                console.log(`➕ Creating brand: ${brand.name}...`);
                await prisma.brand.create({
                    data: {
                        name: brand.name,
                        slug: brand.slug,
                        nameEn: brand.name_en,
                        nameJp: brand.name_jp,
                        website: brand.url, // Corrected map
                        isActive: true,
                        // Fix for schema mismatch if any. Schema says 'description' exists but not used here.
                    }
                });
                console.log(`✅ Created ${brand.name}`);
            }
        } catch (e) {
            console.error(`❌ Failed to seed ${brand.name}:`, e);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
