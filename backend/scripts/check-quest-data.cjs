const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuest() {
    console.log('Searching for quest...');

    const { data, error } = await supabase
        .from('published_quests')
        .select('*')
        .ilike('title', '%Follow us on social media%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No quest found.');
        return;
    }

    console.log(`Found ${data.length} quests.`);

    // Limit to first 3
    data.slice(0, 3).forEach(q => {
        console.log(`\n--- Quest: ${q.title} (${q.id}) ---`);
        if (q.requirements) {
            q.requirements.forEach((req, i) => {
                console.log(`  [${i}] Type: "${req.type}"`);
                // Print full details for anything that looks like a doc or a link
                if (req.type?.toLowerCase().includes('doc') || req.type?.toLowerCase().includes('read') || req.type?.toLowerCase().includes('visit')) {
                    console.log(`      Config:`, JSON.stringify(req.config, null, 2));
                    console.log(`      Verification:`, JSON.stringify(req.verification, null, 2));
                }
            });
        } else {
            console.log('  No requirements array found.');
        }
    });
}

checkQuest();
