import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

/**
 * Script to remove "My Quest 2024" from local Prisma database
 */
async function removeQuest2024FromLocalDB() {
  console.log('🔍 Searching for "My Quest 2024" in local database...');

  try {
    // Search for quests with "My Quest 2024" in the title
    const quests = await prisma.quest.findMany({
      where: {
        title: {
          contains: 'My Quest 2024',
          mode: 'insensitive',
        },
      },
      include: {
        requirements: true,
        completions: true,
      },
    });

    if (quests.length === 0) {
      console.log('ℹ️  No quests found with "My Quest 2024" in the local database');
      console.log('\n📝 Note: If the quest appears in your browser, it may be stored in localStorage.');
      console.log('   Run the browser console script to clear localStorage:');
      console.log('   See: backend/scripts/clear-quest-2024-localStorage.js');
      return;
    }

    console.log(`📋 Found ${quests.length} quest(s) in local database:`);
    quests.forEach(quest => {
      console.log(`  - ID: ${quest.id}`);
      console.log(`    Title: ${quest.title}`);
      console.log(`    Requirements: ${quest.requirements.length}`);
      console.log(`    Completions: ${quest.completions.length}`);
    });

    // Delete each quest (cascade will handle requirements and completions)
    for (const quest of quests) {
      try {
        await prisma.quest.delete({
          where: { id: quest.id },
        });
        console.log(`✅ Deleted quest "${quest.title}" (ID: ${quest.id})`);
        console.log(`   - Removed ${quest.requirements.length} requirement(s)`);
        console.log(`   - Removed ${quest.completions.length} completion(s)`);
      } catch (error: any) {
        console.error(`❌ Error deleting quest ${quest.id}:`, error.message);
      }
    }

    console.log('\n✅ Successfully removed "My Quest 2024" from local database!');
    console.log('\n📝 Note: You may also need to clear localStorage in your browser:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Go to Console tab');
    console.log('   3. Copy and paste the script from: backend/scripts/clear-quest-2024-localStorage.js');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.error('\n💡 Tip: Make sure your database is running and DATABASE_URL is set correctly in .env');
    } else if (error.message.includes('P1001')) {
      console.error('\n💡 Tip: Cannot reach database. Check your DATABASE_URL in backend/.env');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
removeQuest2024FromLocalDB()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });




