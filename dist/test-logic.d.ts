interface ProductInfo {
    originalName: string;
    translatedName: string;
    sourceUrl: string;
    [key: string]: any;
}
declare function removeDuplicateProducts(products: ProductInfo[]): ProductInfo[];
declare const testData: {
    originalName: string;
    translatedName: string;
    sourceUrl: string;
    id: number;
}[];
declare const result: ProductInfo[];
//# sourceMappingURL=test-logic.d.ts.map