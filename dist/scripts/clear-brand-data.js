import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const brandName = process.argv[2];
    if (!brandName) {
        console.error('Usage: npx tsx src/scripts/clear-brand-data.ts <brand_name>');
        process.exit(1);
    }
    try {
        console.log(`Searching for brand: ${brandName}...`);
        let brand = await prisma.brand.findUnique({
            where: { name: brandName },
        });
        if (!brand) {
            const slug = brandName.toLowerCase().replace(/\s+/g, '-');
            console.log(`Name not found, trying slug: ${slug}...`);
            brand = await prisma.brand.findUnique({
                where: { slug: slug },
            });
        }
        if (!brand) {
            console.error(`❌ Brand '${brandName}' not found (checked Name and Slug).`);
            process.exit(1);
        }
        console.log(`✅ Found Brand: ${brand.name} (ID: ${brand.id})`);
        console.log(`🗑️ Clearing products...`);
        const deleteResult = await prisma.product.deleteMany({
            where: { brandId: brand.id },
        });
        console.log(`✅ Deleted ${deleteResult.count} products for brand '${brand.name}'.`);
    }
    catch (error) {
        console.error('Error clearing brand data:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=clear-brand-data.js.map