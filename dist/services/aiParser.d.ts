import { AIParseRequest, AIParseResponse, ProductInfo } from '../types/scraper.js';
export declare class AIParserService {
    private genAI;
    private model;
    constructor(apiKey: string);
    parseProducts(request: AIParseRequest): Promise<AIParseResponse>;
    private isValidImageUrl;
    private buildSystemPrompt;
    private buildUserPrompt;
    private fetchImageAsBase64;
    isFoodAdvertisement(imageUrl: string): Promise<boolean>;
    isNewOrLimitedFood(imageUrl: string): Promise<boolean>;
    parseProductPage(request: {
        url: string;
        html: string;
        screenshot?: string;
    }): Promise<Partial<ProductInfo>>;
    translateToTraditionalChinese(text: string): Promise<string>;
    parseProductsBatch(requests: AIParseRequest[]): Promise<ProductInfo[]>;
    private validateAndTransformProducts;
}
export declare function createAIParserService(apiKey?: string): AIParserService;
//# sourceMappingURL=aiParser.d.ts.map