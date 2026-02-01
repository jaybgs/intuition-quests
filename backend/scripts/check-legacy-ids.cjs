const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLegacyIds() {
    console.log('Checking for published quests with "quest_draft_" prefix...');

    const { data, error } = await supabase
        .from('published_quests')
        .select('id, title')
        .like('id', 'quest_draft_%');

    if (error) {
        console.error('Error fetching quests:', error);
        return;
    }

    if (data && data.length > 0) {
        console.warn('WARNING: Found published quests with "quest_draft_" prefix!');
        data.forEach(q => console.log(`- [${q.id}] ${q.title}`));
    } else {
        console.log('No published quests found with "quest_draft_" prefix. Safe to proceed.');
    }
}

checkLegacyIds();
