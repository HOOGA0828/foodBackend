import { GoogleGenerativeAI } from '@google/generative-ai';
import pRetry from 'p-retry';
export class AIParserService {
    genAI;
    model;
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });
    }
    async parseProducts(request) {
        try {
            console.log(`🤖 [AI Parser] 開始解析 ${request.brandName} 的產品資訊...`);
            const systemPrompt = this.buildSystemPrompt(request.brandName);
            const userPrompt = this.buildUserPrompt(request);
            const result = await pRetry(async () => {
                return await this.model.generateContent([
                    systemPrompt,
                    userPrompt
                ]);
            }, {
                retries: 3,
                minTimeout: 2000,
                factor: 2,
                onFailedAttempt: error => {
                    console.warn(`⚠️ [AI Parser] Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error: ${error.message}`);
                }
            });
            const response = result.response;
            const text = response.text();
            if (!text) {
                throw new Error('AI 回應為空');
            }
            const parsedData = JSON.parse(text);
            const products = this.validateAndTransformProducts(parsedData.products || [], request.sourceUrl);
            products.forEach(product => {
                const linkImageUrl = request.productLink?.imageUrl;
                if (!product.imageUrl && linkImageUrl && this.isValidImageUrl(linkImageUrl)) {
                    console.log(`🖼️ [AI Parser] Restoring imageUrl from link: ${linkImageUrl}`);
                    product.imageUrl = linkImageUrl;
                }
                else if (!product.imageUrl && linkImageUrl) {
                    console.log(`⚠️ [AI Parser] Refused to restore invalid imageUrl: ${linkImageUrl}`);
                }
            });
            console.log(`✅ [AI Parser] ${request.brandName} 解析完成，找到 ${products.length} 個產品`);
            return {
                success: true,
                products,
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            };
        }
        catch (error) {
            console.error(`❌ [AI Parser] ${request.brandName} 解析失敗:`, error);
            return {
                success: false,
                products: [],
                errorMessage: error instanceof Error ? error.message : '未知錯誤'
            };
        }
    }
    isValidImageUrl(url) {
        if (!url)
            return false;
        const lower = url.toLowerCase();
        return !lower.includes('giphy.gif') &&
            !lower.includes('placeholder') &&
            !lower.includes('loading') &&
            !lower.endsWith('.gif') &&
            !lower.includes('data:image/');
    }
    buildSystemPrompt(brandName) {
        return `你是專業的日本產品資訊解析助手，專門處理 ${brandName} 的產品資料。

你的任務是從提供的 Markdown 內容中提取產品資訊，並將其轉換為結構化的 JSON 格式。

請遵循以下規則：
1. 只提取明確的產品資訊，忽略廣告、導航等非產品內容
2. 將日文產品名稱翻譯為自然、易懂的繁體中文
3. 將產品描述翻譯為繁體中文，保持簡潔但完整
4. 正確識別價格資訊（包括稅金標註）
5. 提取營養資訊（如卡路里、蛋白質等）
6. 識別過敏原資訊
7. 判斷產品是否為新品
8. 保持價格數值為數字格式
9. 如果資訊不完整，請使用 null 或空陣列，不要編造資料

輸出必須是有效的 JSON 格式，包含 products 陣列。`;
    }
    buildUserPrompt(request) {
        const hasDetailPage = request.detailMarkdownContent && request.productLink;
        let prompt = `請從以下 Markdown 內容中提取產品資訊：

第一層內容（列表頁）：
${request.listMarkdownContent}`;
        if (hasDetailPage) {
            prompt += `

第二層內容（詳細頁面）：
${request.detailMarkdownContent}

產品資訊：${request.productLink?.title}
詳細頁面網址：${request.productLink?.url}`;
        }
        prompt += `

請特別注意：
- 如果有詳細頁面內容，請優先使用詳細頁面的資訊
- 圖片URL通常位於詳細頁面內容中，格式類似 ![圖片說明](https://example.com/image.jpg)
- 請從圖片連結中提取完整的URL，並將其設定為 imageUrl 欄位
- 如果找到多個圖片，請選擇最相關的產品圖片

請輸出以下 JSON 格式：
{
  "products": [
    {
      "originalName": "日文原名",
      "translatedName": "繁體中文翻譯名稱",
      "originalDescription": "日文描述（可選）",
      "translatedDescription": "繁體中文描述（可選）",`;
        if (hasDetailPage) {
            prompt += `
      "originalDetailedDescription": "來自詳細頁面的日文描述（可選）",
      "translatedDetailedDescription": "詳細頁面中文描述（可選）",`;
        }
        prompt += `
      "price": {
        "amount": 價格數字,
        "currency": "JPY",
        "note": "價格註記，如 '税込'（可選）"
      },
      "category": "產品類別（可選）",
      "releaseDate": "上市日期（可選）",
      "allergens": ["過敏原1", "過敏原2"],
      "nutrition": {
        "calories": 卡路里數值,
        "protein": 蛋白質數值,
        "fat": 脂肪數值,
        "carbs": 碳水化合物數值,
        "sodium": 鈉含量數值
      },
      "imageUrl": "圖片網址（可選）",
      "isNew": true/false,
      "sourceUrl": "${request.sourceUrl}"
    }
  ]
}

注意：
- 只包含實際存在的產品資訊
- 價格 amount 必須是數字
- 營養資訊數值必須是數字
- 如果某項資訊不存在，請省略該欄位或設為 null
- 務必包含 sourceUrl 欄位`;
        if (hasDetailPage) {
            prompt += `
- 優先使用詳細頁面的資訊來豐富產品描述
- 將第一層和第二層的資訊合併，提供最完整的產品資訊`;
        }
        return prompt;
    }
    async fetchImageAsBase64(url) {
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer).toString('base64');
        }
        catch (error) {
            console.warn(`⚠️ 無法下載圖片 ${url}:`, error);
            return null;
        }
    }
    async isFoodAdvertisement(imageUrl) {
        try {
            console.log(`🖼️ [AI Parser] 分析圖片是否為食物廣告: ${imageUrl}`);
            const imageBase64 = await this.fetchImageAsBase64(imageUrl);
            if (!imageBase64) {
                return false;
            }
            const prompt = '請問這張圖片是否為「食物商品」或「飲料商品」的廣告或介紹？\n包含便利商店、餐廳、速食店等各種食物飲料產品（如主餐、湯類、飲品、甜點等）。\n如果是會員招募、APP下載、點數活動、徵才資訊等非具體食物商品的內容，請回答 false。\n請只回傳 JSON 格式：{"isFood": boolean, "reason": "理由"}';
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: "image/jpeg"
                    }
                }
            ]);
            const text = result.response.text();
            if (!text)
                return false;
            const jsonResult = JSON.parse(text);
            console.log(`🤖 [AI Parser] 圖片分析結果: ${jsonResult.isFood} (${jsonResult.reason})`);
            return jsonResult.isFood === true;
        }
        catch (error) {
            console.warn(`⚠️ [AI Parser] 圖片分析失敗，預設視為非食物:`, error);
            return false;
        }
    }
    async isNewOrLimitedFood(imageUrl) {
        try {
            console.log(`🖼️ [AI Parser] 分析圖片是否為期間限定/新品食物: ${imageUrl}`);
            const imageBase64 = await this.fetchImageAsBase64(imageUrl);
            if (!imageBase64)
                return false;
            const prompt = '請問這張圖片是否為食物或飲料商品的廣告或介紹？\n\n判斷標準：\n1. 必須是具體的食物或飲料商品。\n2. 只要是介紹某個食物產品（包含新品、期間限定、或是一般主打商品），請都回答 true。\n3. 如果是純粹的會員招募、APP下載、徵才資訊、單純品牌形象（無特定產品）等，請回答 false。\n\n請只回傳 JSON 格式：{"isTarget": boolean, "reason": "理由"}';
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: "image/jpeg"
                    }
                }
            ]);
            const text = result.response.text();
            if (!text)
                return false;
            const jsonResult = JSON.parse(text);
            console.log(`🤖 [AI Parser] 期間限定/新品分析結果: ${jsonResult.isTarget} (${jsonResult.reason})`);
            return jsonResult.isTarget === true;
        }
        catch (error) {
            console.warn(`⚠️ [AI Parser] 圖片分析失敗，預設視為非目標:`, error);
            return false;
        }
    }
    async parseProductPage(request) {
        try {
            console.log(`🧠 [AI Parser] 解析產品頁面: ${request.url}`);
            const prompt = `你是一個產品資訊提取助手。請從提供的 HTML/文字內容中提取：
            1. 產品名稱 (name) - 請保留原文
            2. 產品描述 (description)
            3. 價格 (price) - 包含 amount (數字) 和 currency (幣種，預設 JPY)
            
            回傳 JSON 格式: { "name": string, "description": string, "price": { "amount": number, "currency": string } }`;
            const result = await this.model.generateContent([
                prompt,
                request.html
            ]);
            const text = result.response.text();
            if (!text)
                return {};
            return JSON.parse(text);
        }
        catch (e) {
            console.warn('AI 解析產品頁面失敗', e);
            return {};
        }
    }
    async translateToTraditionalChinese(text) {
        try {
            if (!text)
                return '';
            const prompt = '你是翻譯助手。請將以下日文翻譯成台灣繁體中文。請回傳 JSON 格式：{ "translated": "翻譯後的文字" }';
            const result = await pRetry(async () => {
                return await this.model.generateContent([
                    prompt,
                    text
                ]);
            }, {
                retries: 3,
                minTimeout: 2000,
                factor: 2,
                onFailedAttempt: error => {
                    console.warn(`⚠️ [AI Parser] Translation attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error: ${error.message}`);
                }
            });
            const respText = result.response.text();
            if (!respText)
                return text;
            const json = JSON.parse(respText);
            return json.translated || text;
        }
        catch (e) {
            console.warn('翻譯失敗', e);
            return text;
        }
    }
    async parseProductsBatch(requests) {
        if (requests.length === 0)
            return [];
        try {
            console.log(`🤖 [AI Parser] 開始批次解析 ${requests.length} 個產品...`);
            const result = await pRetry(async () => {
                const listings = requests.map((req, index) => {
                    return `Item ${index + 1}:\nSource URL: ${req.sourceUrl}\nContent:\n${req.listMarkdownContent}\n${req.detailMarkdownContent ? `Detail: ${req.detailMarkdownContent}` : ''}`;
                }).join('\n\n----------------\n\n');
                const systemPrompt = `你是專業的日本產品資訊解析助手。
你的任務是從提供的多個產品內容中提取資訊，並將其轉換為結構化的 JSON 格式。

請遵循以下規則：
1. 每個項目由 "Item N" 標識。請確保回傳的陣列順序與輸入 Item 順序一致。
2. 將日文產品名稱翻譯為自然、易懂的繁體中文。
3. 將產品描述翻譯為繁體中文，保持簡潔但完整。
4. 正確識別價格資訊（保持數字格式）。
5. 提取營養資訊和過敏原。
6. 對於每個 Item，回傳一個完整的產品物件。
7. 如果某個 Item 無法解析或非產品，請在該位置回傳 null 或標記錯誤，不要跳過導致索引錯位。

輸出格式必須是：
{
  "products": [
    { ...product 1 object... },
    { ...product 2 object... },
    ...
  ]
}`;
                const userPrompt = `請解析以下 ${requests.length} 個產品項目：

${listings}

除了基本資訊外，請特別注意提取圖片 URL (imageUrl) 和價格。
請回傳包含 ${requests.length} 個產品物件的 JSON，格式如下：
{
  "products": [
    {
       "originalName": "日文原名",
       "translatedName": "繁體中文翻譯名稱",
       "originalDescription": "日文描述",
       "translatedDescription": "繁體中文描述",
       "price": { "amount": 100, "currency": "JPY" },
       "nutrition": { ... },
       "allergens": [],
       "imageUrl": "URL",
       "isNew": true,
       "sourceUrl": "Source URL from input"
    },
    ...
  ]
}`;
                const generationResult = await this.model.generateContent([
                    systemPrompt,
                    userPrompt
                ]);
                return generationResult;
            }, {
                retries: 3,
                minTimeout: 2000,
                factor: 2,
                onFailedAttempt: error => {
                    console.warn(`⚠️ [AI Parser] Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error: ${error.message}`);
                }
            });
            const text = result.response.text();
            if (!text)
                throw new Error('AI 回應為空');
            const parsedData = JSON.parse(text);
            let products = parsedData.products || [];
            if (products.length !== requests.length) {
                console.warn(`⚠️ [AI Parser] 批次解析數量不匹配 (預期 ${requests.length}, 實際 ${products.length})，可能部分丟失。`);
            }
            return products.map((p, i) => {
                const req = requests[i];
                if (!req || !p)
                    return null;
                const sourceUrl = p?.sourceUrl || req?.sourceUrl || '';
                const transformedArray = this.validateAndTransformProducts([p], sourceUrl);
                if (transformedArray.length === 0)
                    return null;
                const transformed = transformedArray[0];
                if (!transformed)
                    return null;
                if (!transformed.imageUrl && req.productLink?.imageUrl) {
                    console.log(`🖼️ [AI Parser] Restoring imageUrl from link: ${req.productLink.imageUrl}`);
                    transformed.imageUrl = req.productLink.imageUrl;
                }
                else if (!transformed.imageUrl) {
                    console.log(`⚠️ [AI Parser] Item '${transformed.translatedName}' has no imageUrl. Link info:`, JSON.stringify(req.productLink));
                }
                transformed.sourceUrl = sourceUrl;
                return transformed;
            }).filter((p) => p !== null);
        }
        catch (error) {
            console.error(`❌ [AI Parser] 批次解析失敗 (Max Retries Reached):`, error);
            return [];
        }
    }
    validateAndTransformProducts(rawProducts, defaultSourceUrl) {
        return rawProducts
            .filter(product => product && typeof product === 'object')
            .map(product => ({
            originalName: product.originalName || '',
            translatedName: product.translatedName || '',
            originalDescription: product.originalDescription || undefined,
            translatedDescription: product.translatedDescription || undefined,
            originalDetailedDescription: product.originalDetailedDescription || undefined,
            translatedDetailedDescription: product.translatedDetailedDescription || undefined,
            price: product.price && typeof product.price.amount === 'number' ? {
                amount: Math.round(product.price.amount),
                currency: product.price.currency || 'JPY',
                note: product.price.note || undefined
            } : undefined,
            category: product.category || undefined,
            releaseDate: product.releaseDate || undefined,
            allergens: Array.isArray(product.allergens) ? product.allergens : [],
            nutrition: product.nutrition && typeof product.nutrition === 'object' ? {
                calories: typeof product.nutrition.calories === 'number' ? product.nutrition.calories : undefined,
                protein: typeof product.nutrition.protein === 'number' ? product.nutrition.protein : undefined,
                fat: typeof product.nutrition.fat === 'number' ? product.nutrition.fat : undefined,
                carbs: typeof product.nutrition.carbs === 'number' ? product.nutrition.carbs : undefined,
                sodium: typeof product.nutrition.sodium === 'number' ? product.nutrition.sodium : undefined,
            } : undefined,
            imageUrl: product.imageUrl || undefined,
            isNew: typeof product.isNew === 'boolean' ? product.isNew : true,
            sourceUrl: product.sourceUrl || defaultSourceUrl
        }))
            .filter(product => product.originalName && product.translatedName);
    }
}
export function createAIParserService(apiKey) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('Gemini API Key 未設定，請設定 GEMINI_API_KEY 環境變數');
    }
    return new AIParserService(key);
}
//# sourceMappingURL=aiParser.js.map