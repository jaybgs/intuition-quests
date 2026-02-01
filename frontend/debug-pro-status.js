
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wlerzonnvjqdcrmhlucs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZXJ6b25udmpxZGNybWhsdWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTM2MzgsImV4cCI6MjA4MTA4OTYzOH0.8iOc4azY64UwJsdqZzVuz5_rpwGHUZDbTXsT-NcDk2s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProStatus() {
    console.log('🔍 Starting debug...');

    // 1. Fetch Spaces
    const { data: spaces, error: spaceError } = await supabase
        .from('spaces')
        .select('id, name, owner_address');

    if (spaceError) {
        console.error('❌ Error fetching spaces:', spaceError);
        return;
    }

    console.log(`✅ Fetched ${spaces.length} spaces.`);

    if (spaces.length === 0) return;

    const ownerAddresses = [...new Set(spaces.map(s => s.owner_address.toLowerCase()))];
    console.log(`ℹ️ Unique owner addresses (${ownerAddresses.length}):`, ownerAddresses);

    // 2. Fetch Pro Users (Raw)
    console.log('--- Checking Pro Users Table (Raw) ---');
    const { data: allProUsers, error: rawError } = await supabase
        .from('pro_users')
        .select('*');

    if (rawError) {
        console.error('❌ Error fetching ALL pro_users:', rawError);
    } else {
        console.log(`✅ Found ${allProUsers.length} total records in pro_users table.`);
        console.log(JSON.stringify(allProUsers, null, 2));
    }

    // 3. Test Service Logic Query
    console.log('--- Testing Service Logic Query ---');
    const { data: activePro, error: activeError } = await supabase
        .from('pro_users')
        .select('wallet_address')
        .in('wallet_address', ownerAddresses)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

    if (activeError) {
        console.error('❌ Service logic query failed:', activeError);
    } else {
        console.log(`✅ Service logic returned ${activePro.length} active pro users.`);
        console.log('Active Pro Addresses:', activePro.map(p => p.wallet_address));
    }
}

debugProStatus();
