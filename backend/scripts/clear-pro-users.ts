/**
 * Clear Pro Users Script
 * Removes all pro user records from the database
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from backend directory
dotenv.config({ path: './.env' });

// Manually create Supabase client to avoid config issues
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearProUsers() {
  console.log('🧹 Clearing all pro users from database...');

  try {
    // Delete all records from pro_users table
    const { data, error } = await supabase
      .from('pro_users')
      .delete()
      .neq('wallet_address', ''); // Delete all records

    if (error) {
      console.error('❌ Error clearing pro users:', error);
      return false;
    }

    console.log('✅ Successfully cleared all pro users');
    console.log('📊 Records affected:', data);

    // Verify the table is empty
    const { data: remaining, error: checkError } = await supabase
      .from('pro_users')
      .select('wallet_address')
      .limit(5);

    if (checkError) {
      console.error('❌ Error verifying clear:', checkError);
    } else {
      console.log('📋 Remaining records:', remaining?.length || 0);
      if (remaining && remaining.length === 0) {
        console.log('🎉 Pro users table is now empty!');
      }
    }

    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the script
clearProUsers()
  .then((success) => {
    if (success) {
      console.log('\n✅ Clear pro users script completed successfully!');
    } else {
      console.log('\n❌ Clear pro users script failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Script crashed:', error);
    process.exit(1);
  });
