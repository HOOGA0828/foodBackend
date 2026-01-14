import 'dotenv/config';
import { createSupabaseService } from './src/services/supabase.js';

async function clearFamilyMartData() {
    console.log('🗑️ 清除 FamilyMart 資料...\n');

    const supabaseService = createSupabaseService();

    if (!supabaseService) {
        console.error('❌ Supabase 服務初始化失敗');
        process.exit(1);
    }

    try {
        // 使用 clearBrandProducts 方法清除 familymart 的所有產品
        const result = await supabaseService.clearBrandProducts('familymart');

        if (result.success) {
            console.log(`✅ 成功刪除 ${result.deletedCount} 筆 FamilyMart 產品資料`);
        } else {
            console.error(`❌ 刪除失敗: ${result.error}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ 執行過程發生錯誤:', error);
        process.exit(1);
    }
}

clearFamilyMartData();
