import { supabase } from '../src/config/supabase.js';

async function resetQuestCounts() {
  console.log('🔄 Resetting quest launch counts for all users...');

  try {
    // First, get count of quests before deletion
    const { count: questCount, error: countError } = await supabase
      .from('published_quests')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting quests:', countError);
      process.exit(1);
    }

    console.log(`📊 Found ${questCount} published quests to delete...`);

    // Delete all quests from published_quests table
    const { data, error } = await supabase
      .from('published_quests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This condition matches all records

    if (error) {
      console.error('❌ Error deleting quests:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully deleted ${questCount} quests`);
    console.log('🎯 Quest launch counts have been reset to 0 for all users');

    // Verify the deletion
    const { count: verifyCount, error: verifyError } = await supabase
      .from('published_quests')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
    } else {
      console.log(`✅ Verification: ${verifyCount} quests remaining in database`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
resetQuestCounts().catch(console.error);
