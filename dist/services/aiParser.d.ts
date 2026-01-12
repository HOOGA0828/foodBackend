import { AIParseRequest, AIParseResponse } from '../types/scraper.js';
export declare class AIParserService {
    private openai;
    private readonly model;
    constructor(apiKey: string);
    parseProducts(request: AIParseRequest): Promise<AIParseResponse>;
    private buildSystemPrompt;
    private buildUserPrompt;
    private validateAndTransformProducts;
}
export declare function createAIParserService(apiKey?: string): AIParserService;
//# sourceMappingURL=aiParser.d.ts.map