
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking database schema and data...");

    // 1. Check if column exists in information_schema
    try {
        const columns: any[] = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'brands';
    `;

        const colorsColumn = columns.find(c => c.column_name === 'colors');

        if (colorsColumn) {
            console.log("✅ 'colors' column FOUND in database schema.");
            console.log("   Type:", colorsColumn.data_type);
        } else {
            console.error("❌ 'colors' column NOT FOUND in database schema.");
            console.log("   Available columns:", columns.map(c => c.column_name).join(', '));
        }

        // 2. Check data
        try {
            const brands = await prisma.brand.findMany({
                select: { name: true, displayName: true, colors: true }
            });
            console.log("\n📊 Current Brand Colors Data:");
            console.log(JSON.stringify(brands, null, 2));
        } catch (err) {
            console.error("❌ Failed to query brands with colors field:", err);
        }

    } catch (error) {
        console.error("❌ Error querying information_schema:", error);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
