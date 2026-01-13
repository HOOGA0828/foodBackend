import { PrismaClient } from '@prisma/client';

async function checkSevenElevenProducts() {
  const prisma = new PrismaClient();

  console.log('檢查7-Eleven產品資料...');

  const products = await prisma.product.findMany({
    where: {
      brand: {
        name: '7-Eleven'
      }
    },
    include: {
      brand: true
    }
  });

  console.log('找到 ' + products.length + ' 個7-Eleven產品：');

  products.forEach((product, i) => {
    console.log((i + 1) + '. ' + product.name);
    console.log('   原始名稱: ' + product.original_name);
    console.log('   價格: ' + product.price_amount + ' ' + product.price_currency);
    if (product.image_urls && product.image_urls.length > 0) {
      console.log('   圖片: ' + product.image_urls[0]);
      if (product.image_urls.length > 1) {
        console.log('   還有 ' + (product.image_urls.length - 1) + ' 張圖片');
      }
    } else {
      console.log('   圖片: 無');
    }
    console.log('   是否新品: ' + product.is_new);
    console.log('');
  });

  await prisma.$disconnect();
}

checkSevenElevenProducts().catch(console.error);