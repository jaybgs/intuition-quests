// Test if the quest exists and if we can insert to user_quests
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const testQuestId = 'quest_1769774673723_x1040gz5i';
    const testWallet = '0x987449cc0D35d60b547C29E2fc684EFca3791dF5'.toLowerCase();

    console.log('=== Testing Quest Completion Flow ===\n');

    // 1. Check if quest exists
    const { data: quest, error: questError } = await supabase
        .from('published_quests')
        .select('id, title, iq_points')
        .eq('id', testQuestId)
        .single();

    if (questError) {
        console.error('❌ Quest not found:', questError.message);
        return;
    }

    console.log('✅ Quest found:', quest);

    // 2. Check if already completed
    const { data: existing, error: existingError } = await supabase
        .from('user_quests')
        .select('*')
        .eq('wallet_address', testWallet)
        .eq('quest_id', testQuestId)
        .single();

    if (existing) {
        console.log('\n⚠️  Quest already completed:', existing);
        return;
    }

    if (existingError && existingError.code !== 'PGRST116') {
        console.error('❌ Error checking existing completion:', existingError);
        return;
    }

    console.log('\n✅ Quest not yet completed by this wallet');

    // 3. Try to insert completion
    console.log('\n=== Attempting Insert ===');
    console.log('Data:', {
        wallet_address: testWallet,
        quest_id: testQuestId,
        iq_earned: quest.iq_points || 20,
        completed_at: new Date().toISOString()
    });

    const { data: inserted, error: insertError } = await supabase
        .from('user_quests')
        .insert({
            wallet_address: testWallet,
            quest_id: testQuestId,
            iq_earned: quest.iq_points || 20,
            completed_at: new Date().toISOString()
        })
        .select();

    if (insertError) {
        console.error('\n❌ INSERT FAILED:', insertError);
        console.error('Error details:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
        });
    } else {
        console.log('\n✅ INSERT SUCCESSFUL:', inserted);
    }
}

testInsert().catch(console.error);
