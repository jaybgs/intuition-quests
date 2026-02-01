// Check what the quest record actually looks like using the ID directly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuest() {
    console.log('=== Checking Quest By ID ===\n');

    const questId = 'quest_1769774673723_x1040gz5i';

    const { data: quest, error } = await supabase
        .from('published_quests')
        .select('*')
        .eq('id', questId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Quest Found!');
    console.log('ID:', quest.id);
    console.log('Title:', quest.title);
    console.log('IQ Points:', quest.iq_points);
    console.log('Reward Type:', quest.reward_type);
    console.log('Creator:', quest.creator_address);
    console.log('\nFull Requirements:');
    console.log(JSON.stringify(quest.requirements, null, 2));
}

checkQuest().catch(console.error);
