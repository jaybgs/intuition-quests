import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixDraftOwnership() {
  console.log('🔧 Fixing Quest Draft Ownership...\n');

  // Current situation:
  // Draft exists but belongs to wrong user
  const wrongUser = '0x80d291e82c6f8a11cec9a9ba699285afe14d7f4d'; // Contract owner
  const correctUser = '0x6cb435348f84638b6e2470835e06387448f7c9ef'; // User's actual wallet
  const draftId = 'draft_1767698946310_ixsfvsz6r';

  console.log('📋 Current Situation:');
  console.log('   Draft ID:', draftId);
  console.log('   Wrong Owner:', wrongUser);
  console.log('   Correct Owner:', correctUser);
  console.log('');

  // Step 1: Check if draft exists with wrong owner
  console.log('1️⃣ Checking draft ownership...');
  const { data: existingDraft, error: checkError } = await supabase
    .from('quest_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('❌ Error checking draft:', checkError.message);
    return;
  }

  if (!existingDraft) {
    console.log('❌ Draft not found');
    return;
  }

  console.log('✅ Draft found:');
  console.log('   Current owner:', existingDraft.user_address);
  console.log('   Title:', existingDraft.title);
  console.log('   Space ID:', existingDraft.space_id);
  console.log('');

  // Step 2: Check if correct user already has a draft with this ID
  console.log('2️⃣ Checking for conflicts...');
  const { data: conflictingDraft, error: conflictError } = await supabase
    .from('quest_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('user_address', correctUser)
    .single();

  if (conflictingDraft) {
    console.log('⚠️ Correct user already has a draft with this ID');
    console.log('   This might cause conflicts. Consider deleting one of them.');
    return;
  }

  if (conflictError && conflictError.code !== 'PGRST116') {
    console.error('❌ Error checking conflicts:', conflictError.message);
    return;
  }

  // Step 3: Transfer ownership
  console.log('3️⃣ Transferring draft ownership...');
  const { error: updateError } = await supabase
    .from('quest_drafts')
    .update({
      user_address: correctUser,
      updated_at: new Date().toISOString()
    })
    .eq('id', draftId)
    .eq('user_address', wrongUser); // Safety check

  if (updateError) {
    console.error('❌ Error updating draft ownership:', updateError.message);
    return;
  }

  // Step 4: Verify the change
  console.log('4️⃣ Verifying ownership transfer...');
  const { data: updatedDraft, error: verifyError } = await supabase
    .from('quest_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('user_address', correctUser)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying update:', verifyError.message);
    return;
  }

  console.log('✅ Ownership transfer successful!');
  console.log('   New owner:', updatedDraft.user_address);
  console.log('   Draft ID:', updatedDraft.id);
  console.log('   Title:', updatedDraft.title);
  console.log('');

  // Step 5: Clean up - remove any drafts with wrong ownership
  console.log('5️⃣ Cleaning up old ownership records...');
  const { error: deleteError } = await supabase
    .from('quest_drafts')
    .delete()
    .eq('id', draftId)
    .eq('user_address', wrongUser);

  if (deleteError) {
    console.warn('⚠️ Could not delete old record:', deleteError.message);
    console.log('   This is okay - the ownership was already transferred');
  } else {
    console.log('✅ Old ownership record cleaned up');
  }

  console.log('');
  console.log('🎉 Draft ownership fix completed!');
  console.log('   The draft should now appear in the user\'s dashboard');
}

// Run the fix
fixDraftOwnership()
  .then(() => {
    console.log('\n✨ Draft ownership fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fix failed:', error);
    process.exit(1);
  });
