
import 'dotenv/config';
import OpenAI from 'openai';

async function testApiKey() {
    console.log('🔑 測試 OpenAI API Key');

    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`API Key 長度: ${apiKey?.length || 0}`);
    console.log(`API Key 前綴: ${apiKey?.substring(0, 10)}...`);

    if (!apiKey) {
        console.error('❌ 未找到 OPENAI_API_KEY 環境變數');
        return;
    }

    try {
        const openai = new OpenAI({ apiKey });

        console.log('\n嘗試簡單的 API 呼叫...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 10
        });

        console.log('✅ API Key 有效！');
        console.log(`回應: ${response.choices[0]?.message?.content}`);

    } catch (error: any) {
        console.error('❌ API Key 測試失敗');
        console.error(`錯誤代碼: ${error.code}`);
        console.error(`錯誤訊息: ${error.message}`);

        if (error.code === 'invalid_api_key') {
            console.log('\n💡 建議檢查：');
            console.log('1. API Key 是否正確複製（沒有多餘空格或引號）');
            console.log('2. API Key 是否已啟用');
            console.log('3. 帳戶是否有足夠的額度');
        }
    }
}

testApiKey();
