
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const QUEST_ID = 'quest_1769733001755_hac3a7bf7';

async function checkQuest() {
    console.log(`Checking for quest: ${QUEST_ID}`);
    const { data, error } = await supabase
        .from('published_quests')
        .select('*')
        .eq('id', QUEST_ID);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Quest FOUND in Supabase:', data[0].title);
    } else {
        console.log('❌ Quest NOT found in Supabase.');
    }
}

checkQuest();
