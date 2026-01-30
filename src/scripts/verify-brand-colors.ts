
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Verifying Brand Colors in Database...\n');

    const brands = await prisma.brand.findMany({
        select: {
            name: true,
            colors: true
        }
    });

    if (brands.length === 0) {
        console.log('❌ No brands found in database.');
        return;
    }

    console.table(brands);

    const missingColors = brands.filter(b => !b.colors || b.colors.length === 0);

    if (missingColors.length > 0) {
        console.warn(`\n⚠️ The following brands have no colors: ${missingColors.map(b => b.name).join(', ')}`);
    } else {
        console.log('\n✅ All brands have colors assigned!');
    }
}

verify()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
