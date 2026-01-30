
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Manually adding 'colors' column...");

    try {
        // Add the column if it doesn't exist
        await prisma.$executeRawUnsafe(`
      ALTER TABLE brands 
      ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
    `);
        console.log("✅ Column 'colors' added successfully (or already exists).");

    } catch (error) {
        console.error("❌ Error executing SQL:", error);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
