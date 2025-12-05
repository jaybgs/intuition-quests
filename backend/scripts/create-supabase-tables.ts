/**
 * Script to create tables in Supabase
 * This can be run manually or used as a reference
 */
import { supabase } from '../src/config/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createTables() {
  try {
    console.log('📊 Creating tables in Supabase...');
    
    // Read the SQL migration file
    const sqlPath = join(__dirname, '../supabase/migrations/001_create_tables.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Split SQL into individual statements (by semicolon, handling multi-line)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--')) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        // If RPC doesn't work, try direct query (Supabase doesn't support exec_sql by default)
        // Instead, we'll just log instructions
        if (error) {
          console.warn(`Statement ${i + 1} might need manual execution:`, error.message);
        }
      } catch (err: any) {
        console.warn(`Error executing statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('✅ Table creation process completed!');
    console.log('\n⚠️  Note: Supabase requires manual SQL execution.');
    console.log('📝 Please run the SQL file manually in Supabase SQL Editor:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl/sql/new');
    console.log('   2. Copy the contents of: backend/supabase/migrations/001_create_tables.sql');
    console.log('   3. Paste and execute');
    
  } catch (error: any) {
    console.error('❌ Error creating tables:', error.message);
    console.error('\n📝 Please create tables manually in Supabase SQL Editor');
  }
}

// Run if executed directly
if (require.main === module) {
  createTables().catch(console.error);
}

export { createTables };

