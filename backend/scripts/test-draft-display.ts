import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testDraftDisplay() {
  console.log('🧪 Testing Quest Draft Display...\n');

  // Test data from the user's logs
  const testUser = '0x6cb435348f84638b6e2470835e06387448f7c9ef';
  const testSpaceId = '1e9618fb-c0cd-47d1-8b80-57a9a9815678';

  console.log('📋 Test Parameters:');
  console.log('   User:', testUser);
  console.log('   Space ID:', testSpaceId);
  console.log('');

  // Test 1: Check all drafts in database
  console.log('1️⃣ All Drafts in Database:');
  try {
    const { data: allDrafts, error } = await supabase
      .from('quest_drafts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    console.log('✅ Total drafts in database:', allDrafts?.length || 0);
    if (allDrafts && allDrafts.length > 0) {
      console.log('📋 All drafts:');
      allDrafts.forEach((draft, index) => {
        console.log(`   ${index + 1}. ${draft.title} (${draft.id})`);
        console.log(`      User: ${draft.user_address}`);
        console.log(`      Space ID: ${draft.space_id}`);
        console.log(`      Updated: ${draft.updated_at}`);
        console.log('');
      });
    }

    // Check drafts for test user specifically
    console.log('2️⃣ Drafts for Test User:', testUser.toLowerCase());
    const userDrafts = allDrafts?.filter(d => d.user_address === testUser.toLowerCase()) || [];
    console.log('✅ Found', userDrafts.length, 'drafts for test user');

  } catch (error: any) {
    console.error('❌ Exception:', error.message);
  }

  // Test 2: Backend service simulation
  console.log('2️⃣ Backend Service Simulation:');
  try {
    // Simulate the backend service logic
    const { data, error } = await supabase
      .from('quest_drafts')
      .select('id, title, current_step, space_id, updated_at')
      .eq('user_address', testUser.toLowerCase())
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Backend service query error:', error.message);
      return;
    }

    console.log('✅ Backend query found', data?.length || 0, 'drafts');

    // Apply space filtering like the backend does
    let filteredData = data || [];
    if (testSpaceId) {
      console.log('🔍 Applying space filter for:', testSpaceId);
      filteredData = filteredData.filter((draft: any) => {
        const matches = draft.space_id === testSpaceId || draft.space_id === null;
        console.log(`   Draft ${draft.id}: space_id=${draft.space_id}, matches=${matches}`);
        return matches;
      });
    }

    console.log('✅ After filtering:', filteredData.length, 'drafts');

    const result = filteredData.map((draft: any) => ({
      id: draft.id,
      title: draft.title || 'Untitled Quest',
      updatedAt: new Date(draft.updated_at).getTime(),
      currentStep: draft.current_step || 1,
      spaceId: draft.space_id || null,
    }));

    console.log('📋 Final result:', result);

  } catch (error: any) {
    console.error('❌ Backend service simulation error:', error.message);
  }

  console.log('\n🎯 Summary:');
  console.log('If the backend simulation shows the draft but the frontend doesn\'t,');
  console.log('the issue is likely with API authentication or frontend filtering.');
  console.log('If the backend simulation doesn\'t show the draft, there\'s a database issue.');
}

// Run the test
testDraftDisplay()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
