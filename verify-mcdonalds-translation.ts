import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function verify() {
    const brandName = 'mcdonalds';

    // Find brand
    const brand = await prisma.brand.findFirst({
        where: {
            OR: [
                { name: brandName },
                { slug: brandName }
            ]
        }
    });

    if (!brand) {
        console.error('Brand not found:', brandName);
        return;
    }

    // Find products sorted by updatedAt desc to see latest
    const products = await prisma.product.findMany({
        where: { brandId: brand.id },
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    const output = {
        brand: brandName,
        count: products.length,
        products: products.map(p => ({
            id: p.id,
            nameZh: p.name,
            nameJp: p.nameJp,
            description: p.description,
            updatedAt: p.updatedAt
        }))
    };

    fs.writeFileSync('verify_result.json', JSON.stringify(output, null, 2), 'utf-8');
    console.log('Results written to verify_result.json');
}

verify()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
