const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuest() {
    console.log('Searching for quest by title...');

    const { data, error } = await supabase
        .from('published_quests')
        .select('*')
        .ilike('title', '%Follow us%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} matches.`);

    data.forEach(q => {
        console.log(`\n--- MATCH: ${q.title} (${q.id}) ---`);
        if (q.requirements) {
            console.log(JSON.stringify(q.requirements, null, 2));
        } else {
            console.log('No requirements array.');
        }
    });
}

checkQuest();
