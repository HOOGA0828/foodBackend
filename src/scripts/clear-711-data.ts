import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearSevenElevenData() {
    console.log('🗑️ 開始清除 7-Eleven 相關資料...');

    try {
        // Check if brand exists
        const brand = await prisma.brand.findUnique({
            where: { slug: 'seven-eleven' }
        });

        if (!brand) {
            console.log('⚠️ 找不到 7-Eleven 品牌資料，無需清除。');
            return;
        }

        console.log(`📍 找到品牌 ID: ${brand.id}`);

        // Delete products
        const deletedProducts = await prisma.product.deleteMany({
            where: {
                brandId: brand.id
            }
        });

        console.log(`✅ 已刪除 ${deletedProducts.count} 筆 7-Eleven 產品資料。`);

    } catch (error) {
        console.error('❌ 清除資料失敗:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearSevenElevenData();
