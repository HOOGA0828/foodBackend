import { PrismaClient } from '@prisma/client';

async function checkDBStatus() {
  const prisma = new PrismaClient();

  console.log('檢查7-Eleven在Supabase中的最新資料狀況...');

  // 檢查總產品數
  const totalProducts = await prisma.product.count({
    where: {
      brand: {
        name: '7-Eleven'
      }
    }
  });

  console.log('總產品數量:', totalProducts);

  // 檢查最新更新時間
  const latestProduct = await prisma.product.findFirst({
    where: {
      brand: {
        name: '7-Eleven'
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    select: {
      name: true,
      updatedAt: true,
      scrapedAt: true,
      imageUrls: true
    }
  });

  if (latestProduct) {
    console.log('最新產品更新時間:', latestProduct.updatedAt);
    console.log('最新產品抓取時間:', latestProduct.scrapedAt);
    console.log('最新產品名稱:', latestProduct.name);
    console.log('圖片數量:', latestProduct.imageUrls?.length || 0);
  }

  // 檢查最近幾個產品的更新時間
  const recentProducts = await prisma.product.findMany({
    where: {
      brand: {
        name: '7-Eleven'
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 5,
    select: {
      name: true,
      updatedAt: true,
      createdAt: true
    }
  });

  console.log('\n最近5個產品的更新時間:');
  recentProducts.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} - 更新:${p.updatedAt} 創建:${p.createdAt}`);
  });

  await prisma.$disconnect();
}

checkDBStatus().catch(console.error);