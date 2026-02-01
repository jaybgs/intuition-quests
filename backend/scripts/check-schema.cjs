// Check the actual database schema for user_quests and published_quests
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('=== Checking Database Schema ===\n');

    // Check published_quests id column type
    const { data: pubData, error: pubError } = await supabase
        .from('published_quests')
        .select('id')
        .limit(1);

    if (pubError) {
        console.error('Error querying published_quests:', pubError);
    } else {
        console.log('✅ published_quests table accessible');
        console.log('Sample ID:', pubData && pubData[0] ? pubData[0].id : 'No data');
    }

    // Check user_quests schema
    const { data: userQuestData, error: userQuestError } = await supabase
        .from('user_quests')
        .select('*')
        .limit(1);

    if (userQuestError) {
        console.error('Error querying user_quests:', userQuestError);
    } else {
        console.log('\n✅ user_quests table accessible');
        if (userQuestData && userQuestData[0]) {
            console.log('Sample record:', userQuestData[0]);
        } else {
            console.log('No data in user_quests yet');
        }
    }

    // Try to find the quest with the problematic ID
    const testQuestId = 'quest_1769774673723_x1040gz5i';
    const { data: testQuest, error: testError } = await supabase
        .from('published_quests')
        .select('id, title')
        .eq('id', testQuestId)
        .single();

    console.log(`\n=== Testing Quest ID: ${testQuestId} ===`);
    if (testError) {
        console.error('Error finding quest:', testError);
    } else if (testQuest) {
        console.log('✅ Quest found:', testQuest);
    } else {
        console.log('❌ Quest not found');
    }
}

checkSchema().catch(console.error);
