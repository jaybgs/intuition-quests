import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testDraftsAPI() {
  console.log('🧪 Testing Quest Drafts API...\n');

  // Test 1: Check if quest_drafts table exists and has data
  console.log('1️⃣ Checking quest_drafts table...');
  try {
    const { data: drafts, error } = await supabase
      .from('quest_drafts')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error querying quest_drafts:', error.message);
      return;
    }

    console.log(`✅ Found ${drafts?.length || 0} drafts in database`);

    if (drafts && drafts.length > 0) {
      console.log('📋 Sample drafts:');
      drafts.forEach((draft, index) => {
        console.log(`   ${index + 1}. ${draft.title || 'Untitled'} (ID: ${draft.id})`);
        console.log(`      User: ${draft.user_address}`);
        console.log(`      Updated: ${draft.updated_at}`);
        console.log(`      Current step: ${draft.current_step}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Exception querying quest_drafts:', error.message);
    return;
  }

  // Test 2: Test the backend service directly
  console.log('2️⃣ Testing backend service...');
  try {
    const { QuestDraftService } = await import('../src/services/questDraftService.js');
    const draftService = new QuestDraftService();

    // Get all drafts for the actual user from the database
    const actualUser = '0x6cb435348f84638b6e2470835e06387448f7c9ef'; // From the database
    const allDrafts = await draftService.getAllDraftsForUser(actualUser);

    console.log(`✅ Backend service found ${allDrafts.length} drafts for actual user ${actualUser}`);

    if (allDrafts.length > 0) {
      console.log('📋 Drafts found:');
      allDrafts.forEach((draft, index) => {
        console.log(`   ${index + 1}. ${draft.title} (ID: ${draft.id})`);
        console.log(`      Updated: ${new Date(draft.updatedAt).toLocaleString()}`);
        console.log(`      Current step: ${draft.currentStep}`);
        console.log(`      Space ID: ${draft.spaceId || 'None'}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Error testing backend service:', error.message);
  }

  console.log('\n🎉 Test completed!');
}

// Run the test
testDraftsAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
