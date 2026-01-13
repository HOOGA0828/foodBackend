import { PrismaClient } from '@prisma/client';

async function checkIssues() {
  const prisma = new PrismaClient();

  console.log('檢查7-Eleven產品問題...');

  const products = await prisma.product.findMany({
    where: {
      brand: {
        name: '7-Eleven'
      }
    },
    select: {
      name: true,
      sourceUrl: true,
      imageUrls: true
    }
  });

  console.log('總共 ' + products.length + ' 個產品');

  // 檢查重複名稱
  const nameCount = {};
  products.forEach(p => {
    nameCount[p.name] = (nameCount[p.name] || 0) + 1;
  });

  const duplicates = Object.entries(nameCount).filter(([name, count]) => count > 1);
  console.log('重複名稱數量: ' + duplicates.length);
  duplicates.slice(0, 5).forEach(([name, count]) => {
    console.log('  ' + name + ': ' + count + ' 次');
  });

  // 檢查圖片URL問題
  const invalidImages = products.filter(p =>
    p.imageUrls && p.imageUrls.some(url => !url || !url.includes('.jpg') || url.endsWith('/'))
  );
  console.log('有問題的圖片URL產品數量: ' + invalidImages.length);

  invalidImages.slice(0, 3).forEach(p => {
    console.log('  ' + p.name + ': ' + JSON.stringify(p.imageUrls));
  });

  await prisma.$disconnect();
}

checkIssues().catch(console.error);