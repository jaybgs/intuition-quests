import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set the following environment variables in backend/.env:');
  console.error('  - SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  console.error('\nAlternatively, you can run the SQL migration directly in Supabase:');
  console.error('  backend/supabase/migrations/003_remove_quest_2024.sql');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Script to remove "My Quest 2024" from the database
 * This will delete the quest from both published_quests and quests tables
 */
async function removeQuest2024() {
  console.log('🔍 Searching for "My Quest 2024"...');

  try {
    // Search in published_quests table
    const { data: publishedQuests, error: publishedError } = await supabase
      .from('published_quests')
      .select('id, title')
      .ilike('title', '%My Quest 2024%');

    if (publishedError) {
      console.error('❌ Error searching published_quests:', publishedError);
    } else if (publishedQuests && publishedQuests.length > 0) {
      console.log(`📋 Found ${publishedQuests.length} quest(s) in published_quests table:`);
      publishedQuests.forEach(quest => {
        console.log(`  - ID: ${quest.id}, Title: ${quest.title}`);
      });

      // Delete from published_quests
      for (const quest of publishedQuests) {
        const { error: deleteError } = await supabase
          .from('published_quests')
          .delete()
          .eq('id', quest.id);

        if (deleteError) {
          console.error(`❌ Error deleting quest ${quest.id} from published_quests:`, deleteError);
        } else {
          console.log(`✅ Deleted quest "${quest.title}" (ID: ${quest.id}) from published_quests`);
        }
      }
    } else {
      console.log('ℹ️  No quests found in published_quests table');
    }

    // Search in quests table
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, title')
      .ilike('title', '%My Quest 2024%');

    if (questsError) {
      console.error('❌ Error searching quests:', questsError);
    } else if (quests && quests.length > 0) {
      console.log(`📋 Found ${quests.length} quest(s) in quests table:`);
      quests.forEach(quest => {
        console.log(`  - ID: ${quest.id}, Title: ${quest.title}`);
      });

      // Delete from quests (this will cascade delete requirements and completions)
      for (const quest of quests) {
        const { error: deleteError } = await supabase
          .from('quests')
          .delete()
          .eq('id', quest.id);

        if (deleteError) {
          console.error(`❌ Error deleting quest ${quest.id} from quests:`, deleteError);
        } else {
          console.log(`✅ Deleted quest "${quest.title}" (ID: ${quest.id}) from quests`);
        }
      }
    } else {
      console.log('ℹ️  No quests found in quests table');
    }

    console.log('\n✅ Quest removal process completed!');
    console.log('\n📝 Note: You may also need to clear localStorage in your browser:');
    console.log('   - Open browser DevTools (F12)');
    console.log('   - Go to Application/Storage tab');
    console.log('   - Find keys starting with "published_quests_"');
    console.log('   - Remove any entries containing "My Quest 2024"');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
removeQuest2024()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

