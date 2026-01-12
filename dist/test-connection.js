import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function testConnection() {
    try {
        console.log('🔍 正在測試資料庫連線...\n');
        await prisma.$connect();
        console.log('✅ Prisma 連線成功！\n');
        const brands = await prisma.brand.findMany({
            take: 5,
            orderBy: { createdAt: 'asc' },
        });
        console.log(`✅ 成功查詢 brands 表，找到 ${brands.length} 個品牌：`);
        brands.forEach((brand) => {
            console.log(`   - ${brand.name} (${brand.slug})`);
        });
        console.log('');
        const categories = await prisma.category.findMany({
            take: 5,
            orderBy: { sortOrder: 'asc' },
        });
        console.log(`✅ 成功查詢 categories 表，找到 ${categories.length} 個分類：`);
        categories.forEach((category) => {
            console.log(`   - ${category.name} (${category.slug})`);
        });
        console.log('');
        const productCount = await prisma.product.count();
        console.log(`✅ 成功查詢 products 表，目前有 ${productCount} 個產品\n`);
        if (brands.length > 0) {
            const brandWithProducts = await prisma.brand.findFirst({
                where: { id: brands[0]?.id },
                include: {
                    products: {
                        take: 3,
                    },
                },
            });
            console.log(`✅ 成功測試關聯查詢：品牌 "${brandWithProducts?.name}" 有 ${brandWithProducts?.products.length || 0} 個產品\n`);
        }
        console.log('🎉 所有測試通過！資料庫設定正確。');
    }
    catch (error) {
        console.error('❌ 資料庫連線測試失敗：\n');
        if (error instanceof Error) {
            console.error('錯誤訊息:', error.message);
            console.error('\n錯誤堆疊:', error.stack);
        }
        else {
            console.error('未知錯誤:', error);
        }
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
        console.log('\n📴 已關閉資料庫連線');
    }
}
testConnection();
//# sourceMappingURL=test-connection.js.map