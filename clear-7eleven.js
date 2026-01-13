import { PrismaClient } from '@prisma/client';

async function clearSevenElevenData() {
  const prisma = new PrismaClient();

  console.log('清除7-Eleven的測試資料...');

  // 刪除7-Eleven的產品
  const deletedProducts = await prisma.product.deleteMany({
    where: {
      brand: {
        name: '7-Eleven'
      }
    }
  });

  console.log('已刪除 ' + deletedProducts.count + ' 個產品');

  await prisma.$disconnect();
}

clearSevenElevenData().catch(console.error);