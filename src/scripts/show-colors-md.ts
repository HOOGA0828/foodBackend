
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const brands = await prisma.brand.findMany({
        select: { name: true, nameJp: true, colors: true },
        orderBy: { name: 'asc' }
    });

    let output = '| 品牌名稱 (ID) | 提取顏色 | 數量 |\n';
    output += '| :--- | :--- | :--- |\n';

    brands.forEach(b => {
        const colorList = (b.colors || []);
        const colorDisplay = colorList.map(c => `**${c}**`).join(', ');
        const display = b.nameJp || b.name;
        output += `| ${display} (${b.name}) | ${colorDisplay} | ${colorList.length} |\n`;
    });

    fs.writeFileSync('colors_report.md', output);
    console.log('Report saved to colors_report.md');
}

main().finally(() => prisma.$disconnect());
