
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Sukiya Data Cleanup ---');

    // Try both variations
    const names = ['Sukiya', 'sukiya'];
    let deletedTotal = 0;

    for (const name of names) {
        const brand = await prisma.brand.findUnique({
            where: { name: name },
        });

        if (brand) {
            console.log(`Found brand: '${name}' (ID: ${brand.id})`);
            const result = await prisma.product.deleteMany({
                where: { brandId: brand.id },
            });
            console.log(`- Deleted ${result.count} products for '${name}'.`);
            deletedTotal += result.count;
        } else {
            console.log(`Brand '${name}' not found.`);
        }
    }

    console.log(`\nTotal products deleted: ${deletedTotal}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
