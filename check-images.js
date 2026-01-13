import { PrismaClient } from '@prisma/client';

async function checkImages() {
  const prisma = new PrismaClient();

  console.log('檢查7-Eleven產品圖片狀況...');

  const products = await prisma.product.findMany({
    where: {
      brand: {
        name: '7-Eleven'
      }
    },
    select: {
      name: true,
      imageUrls: true,
      updatedAt: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  let withImages = 0;
  let totalImages = 0;

  products.forEach(p => {
    if (p.imageUrls && p.imageUrls.length > 0) {
      withImages++;
      totalImages += p.imageUrls.length;
      console.log('有圖片: ' + p.name + ' - ' + p.imageUrls.length + ' 張');
      p.imageUrls.forEach((url, i) => {
        console.log('  圖片 ' + (i + 1) + ': ' + url);
      });
    }
  });

  console.log('\n總結:');
  console.log('總產品數: ' + products.length);
  console.log('有圖片的產品數: ' + withImages);
  console.log('總圖片數: ' + totalImages);

  await prisma.$disconnect();
}

checkImages().catch(console.error);