
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env vars from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_USER = '0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2'.toLowerCase();

async function checkUserCompletions() {
    console.log(`🔍 Checking completions for user: ${TARGET_USER}`);
    console.log('------------------------------------------------');

    try {
        const { data, error } = await supabase
            .from('quest_step_completions')
            .select('*')
            .eq('user_address', TARGET_USER);

        if (error) {
            console.error('❌ Error fetching completions:', error.message);
            return;
        }

        if (!data || data.length === 0) {
            console.log('✅ No completions found for this user.');
            console.log('   The issue implies purely Front-End persistence or a different table.');
        } else {
            console.log(`⚠️  Found ${data.length} completion records!`);
            data.forEach((record, i) => {
                console.log(`   ${i + 1}. Quest: ${record.quest_id} | Step: ${record.step_id} | Time: ${record.completed_at || 'N/A'}`);
            });
            console.log('\nConclusion: The Backend THINKS the user completed these tasks.');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkUserCompletions();
