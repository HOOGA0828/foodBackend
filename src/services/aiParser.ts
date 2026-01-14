import OpenAI from 'openai';
import { AIParseRequest, AIParseResponse, ProductInfo } from '../types/scraper.js';

/**
 * AI 解析器服務
 * 使用 OpenAI GPT-4o-mini 來解析日文產品資訊並翻譯為中文
 */
export class AIParserService {
  private openai: OpenAI;
  private readonly model = 'gpt-4o-mini';

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * 解析產品資訊
   * @param request 解析請求
   * @returns 解析結果
   */
  async parseProducts(request: AIParseRequest): Promise<AIParseResponse> {
    try {
      console.log(`🤖 [AI Parser] 開始解析 ${request.brandName} 的產品資訊...`);

      const systemPrompt = this.buildSystemPrompt(request.brandName);
      const userPrompt = this.buildUserPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // 降低隨機性，提高一致性
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI 回應為空');
      }

      const parsedData = JSON.parse(content);

      // 驗證並轉換資料格式
      const products = this.validateAndTransformProducts(parsedData.products || [], request.sourceUrl);

      console.log(`✅ [AI Parser] ${request.brandName} 解析完成，找到 ${products.length} 個產品`);

      return {
        success: true,
        products,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      console.error(`❌ [AI Parser] ${request.brandName} 解析失敗:`, error);

      return {
        success: false,
        products: [],
        errorMessage: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }

  /**
   * 建構系統提示詞
   */
  private buildSystemPrompt(brandName: string): string {
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

  /**
   * 建構使用者提示詞
   */
  private buildUserPrompt(request: AIParseRequest): string {
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

  /**
   * 判斷圖片是否為食物商品廣告
   * @param imageUrl 圖片網址
   * @returns 是否為食物廣告
   */
  async isFoodAdvertisement(imageUrl: string): Promise<boolean> {
    try {
      console.log(`🖼️ [AI Parser] 分析圖片是否為食物廣告: ${imageUrl}`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '請問這張圖片是否為便利商店的「食物商品」或「飲料商品」的廣告或介紹？\n如果是會員招募、APP下載、點數活動、徵才資訊等非具體食物商品的內容，請回答 false。\n請只回傳 JSON 格式：{"isFood": boolean, "reason": "理由"}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return false;

      const result = JSON.parse(content);
      console.log(`🤖 [AI Parser] 圖片分析結果: ${result.isFood} (${result.reason})`);

      return result.isFood === true;

    } catch (error) {
      console.warn(`⚠️ [AI Parser] 圖片分析失敗，預設視為非食物:`, error);
      return false;
    }
  }

  /**
   * 驗證並轉換產品資料格式
   */
  private validateAndTransformProducts(rawProducts: any[], defaultSourceUrl: string): ProductInfo[] {
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
          amount: product.price.amount,
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
      .filter(product => product.originalName && product.translatedName); // 確保必要欄位存在
  }
}

/**
 * 建立 AI 解析器服務實例
 */
export function createAIParserService(apiKey?: string): AIParserService {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API Key 未設定，請設定 OPENAI_API_KEY 環境變數');
  }
  return new AIParserService(key);
}