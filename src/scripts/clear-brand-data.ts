
import 'dotenv/config';
import { createSupabaseService } from '../services/supabase.js';

async function main() {
    const args = process.argv.slice(2);
    const brandName = args[0];

    if (!brandName) {
        console.error('請提供品牌名稱，例如: npx tsx src/scripts/clear-brand-data.ts 7-Eleven');
        process.exit(1);
    }

    console.log(`🚀 準備清除 ${brandName} 的所有產品資料...`);

    const supabaseService = createSupabaseService();
    if (!supabaseService) {
        console.error('❌ 無法初始化 Supabase 服務，請檢查環境變數');
        process.exit(1);
    }

    const result = await supabaseService.clearBrandProducts(brandName);

    if (result.success) {
        console.log(`✅ 清除完成！共刪除 ${result.deletedCount} 筆資料`);
    } else {
        console.error(`❌ 清除失敗: ${result.error}`);
    }
}

main().catch(console.error);
