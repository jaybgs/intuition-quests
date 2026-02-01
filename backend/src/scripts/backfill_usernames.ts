
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Prefer service role if available for updates

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillUsernames() {
    console.log('🔄 Starting username backfill...');

    // 1. Fetch all users
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('address, username');

    if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('⚠️ No users found to backfill.');
        return;
    }

    console.log(`📋 Found ${users.length} users. Updating leaderboard...`);

    let updatedCount = 0;
    let errorCount = 0;

    // 2. Update leaderboard for each user
    for (const user of users) {
        if (!user.username || !user.address) continue;

        const { error: updateError } = await supabase
            .from('leaderboard')
            .update({ username: user.username })
            .eq('address', user.address.toLowerCase()); // Assuming address in leaderboard is lowercase

        if (updateError) {
            console.error(`❌ Failed to update ${user.address}:`, updateError.message);
            errorCount++;
        } else {
            updatedCount++;
        }
    }

    console.log(`✅ Backfill complete!`);
    console.log(`📈 Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
}

backfillUsernames();
