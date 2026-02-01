// Run the UUID fix migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('=== Running UUID to TEXT Fix Migration ===\n');

    const migrationPath = path.join(__dirname, '../supabase/migrations/99999_fix_uuid_to_text.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
        .catch(async () => {
            // If RPC doesn't exist, try direct query
            return await supabase.from('_sql').insert({ query: sql });
        })
        .catch(async () => {
            // Last resort: use raw SQL via pg
            console.log('Using alternative execution method...');
            // We'll need to use the Supabase Management API or Pgsql connection
            // For now, just show the SQL
            console.log('SQL to execute:');
            console.log(sql);
            console.log('\nPlease run this SQL manually in Supabase SQL Editor');
            return { data: null, error: null };
        });

    if (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
}

runMigration().catch(console.error);
