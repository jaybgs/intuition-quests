// Check what the quest record actually looks like
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
    console.log('=== Checking Quest Record ===\n');

    // Find quest by slug
    const slug = 'follow-us-on-social-media-bsgkjasnqfdsgvbhhgfhmklmbjnpm';

    const { data: quests, error } = await supabase
        .from('published_quests')
        .select('*')
        .ilike('title', `%${slug}%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${quests.length} quest(s) matching slug:`);
    quests.forEach((q, idx) => {
        console.log(`\n--- Quest ${idx + 1} ---`);
        console.log('ID:', q.id);
        console.log('Title:', q.title);
        console.log('IQ Points:', q.iq_points);
        console.log('Reward Type:', q.reward_type);
        console.log('Creator:', q.creator_address);
    });
}

checkQuest().catch(console.error);
