
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wlerzonnvjqdcrmhlucs.supabase.co';
// Using Service Role Key from backend/.env
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZXJ6b25udmpxZGNybWhsdWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMzYzOCwiZXhwIjoyMDgxMDg5NjM4fQ.Ulc4dCS_9LtZG8-g3AGJTjrJiz-U5EfYais777laeuo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProExpiry() {
    console.log('🔧 Starting fix for expired pro users...');

    // Update all users to have future expiry
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // +1 year

    const { data, error } = await supabase
        .from('pro_users')
        .update({
            expires_at: futureDate.toISOString(),
            status: 'active'
        })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Dummy condition to match all (or just omit filter for all)
        // Actually, .neq 'id' might not work if I don't know an ID. 
        // Let's select all IDs first then update, or just use a condition that is always true if Supabase allows mass updates without WHERE (it usually requires at least one filter or RLS bypass, but Service Role bypasses RLS).
        // Safest way is to fetch first.
        .select();

    // Actually, I can just use a filter that matches everything like 'status' is not null, or just fetch all and iterate if mass update is blocked.
    // Let's try fetching all first.

    const { data: allUsers, error: fetchError } = await supabase.from('pro_users').select('wallet_address');
    if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        return;
    }

    console.log(`Found ${allUsers.length} users. Updating...`);

    for (const user of allUsers) {
        const { error: updateError } = await supabase
            .from('pro_users')
            .update({
                expires_at: futureDate.toISOString(),
                status: 'active'
            })
            .eq('wallet_address', user.wallet_address);

        if (updateError) {
            console.error(`❌ Failed to update ${user.wallet_address}:`, updateError);
        } else {
            console.log(`✅ Updated ${user.wallet_address}`);
        }
    }

    console.log('🏁 Done.');
}

fixProExpiry();
