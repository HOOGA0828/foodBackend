import { PrismaClient } from '@prisma/client';

async function checkRawData() {
  const prisma = new PrismaClient();

  console.log('檢查Supabase中原7-Eleven產品的原始資料...');

  const products = await prisma.product.findMany({
    where: {
      brand: {
        name: '7-Eleven'
      }
    },
    take: 3 // 只檢查前3個
  });

  console.log('原始資料結構:');
  products.forEach((product, i) => {
    console.log('產品 ' + (i + 1) + ':');
    console.log(JSON.stringify(product, null, 2));
    console.log('---');
  });

  await prisma.$disconnect();
}

checkRawData().catch(console.error);