import 'dotenv/config';
import { createSupabaseService } from '../services/supabase.js';
import { createAIParserService } from '../services/aiParser.js';

async function main() {
    console.log('🌐 啟動產品名稱翻譯工具...');

    // 1. 初始化服務
    const supabaseService = createSupabaseService();
    const aiParser = createAIParserService();

    if (!supabaseService) {
        console.error('❌ 無法連接 Supabase');
        process.exit(1);
    }

    try {
        // 2. 獲取產品 (一次處理 50 筆，避免 Rate Limit)
        // 這裡我們需要更靈活的查詢。
        // 1. name IS NULL
        // 2. name = ''
        // 3. name = name_jp (假設這是日文)

        // Supabase 的 OR 語法對於欄位比較支援有限，我們分批抓取並在代碼過濾
        // 簡單起見，我們遍歷所有產品並檢查

        console.log('🔍 正在搜尋需要翻譯的產品...');

        let processedCount = 0;
        let updatedCount = 0;
        let page = 0;
        const pageSize = 50;
        let hasMore = true;

        // 直接使用 supabase client
        const supabase = (supabaseService as any).supabase;

        while (hasMore) {
            // 獲取一批產品
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, name_jp')
                .range(page * pageSize, (page + 1) * pageSize - 1)
                .order('id');

            if (error) {
                throw new Error(`查詢失敗: ${error.message}`);
            }

            if (!products || products.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`📄 正在處理第 ${page + 1} 頁 (本頁 ${products.length} 筆)...`);

            for (const product of products) {
                processedCount++;

                let shouldTranslate = false;
                let reason = '';

                if (!product.name) {
                    shouldTranslate = true;
                    reason = 'name 為空';
                } else if (product.name.trim() === '') {
                    shouldTranslate = true;
                    reason = 'name 為空字串';
                } else if (product.name === product.name_jp) {
                    shouldTranslate = true;
                    reason = 'name 與 name_jp 相同 (假設未翻譯)';
                }

                if (shouldTranslate && product.name_jp) {
                    console.log(`📝 [${processedCount}] 準備翻譯: "${product.name_jp}" (${reason})`);

                    try {
                        // 呼叫 AI 翻譯
                        const translatedName = await aiParser.translateToTraditionalChinese(product.name_jp);

                        if (translatedName && translatedName !== product.name_jp) {
                            // 更新資料庫
                            const { error: updateError } = await supabase
                                .from('products')
                                .update({ name: translatedName })
                                .eq('id', product.id);

                            if (updateError) {
                                console.error(`  ❌ 更新失敗: ${updateError.message}`);
                            } else {
                                console.log(`  ✅ 更新成功: "${translatedName}"`);
                                updatedCount++;
                            }

                            // 避免 API 速率限制
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } else {
                            console.log(`  ⚠️ 翻譯結果相同或為空，跳過`);
                        }
                    } catch (err) {
                        console.error(`  ❌ 翻譯過程錯誤:`, err);
                    }
                }
            }

            page++;

            // 安全機制：如果是測試，可以限制處理總量
            // if (processedCount > 500) break;
        }

        console.log('\n================================');
        console.log(`🎉 翻譯工作完成`);
        console.log(`📊 總檢查: ${processedCount} 筆`);
        console.log(`✅ 已更新: ${updatedCount} 筆`);

    } catch (error) {
        console.error('💥 執行過程發生錯誤:', error);
        process.exit(1);
    }
}

main().catch(console.error);
