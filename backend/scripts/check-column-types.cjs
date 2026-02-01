// Check actual column types in the database
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function checkColumnTypes() {
    console.log('=== Checking Actual Database Column Types ===\n');

    // Parse connection string from Supabase URL
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL not found in .env file');
        console.log('\nPlease add DATABASE_URL to your .env file.');
        console.log('You can find this in Supabase Dashboard > Project Settings > Database > Connection String');
        return;
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Check published_quests.id
        const pubQuestQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'published_quests' AND column_name = 'id';
    `;

        const pubResult = await client.query(pubQuestQuery);
        console.log('published_quests.id:');
        if (pubResult.rows.length > 0) {
            console.log('  Type:', pubResult.rows[0].data_type);
            console.log('  Max Length:', pubResult.rows[0].character_maximum_length || 'N/A');
        } else {
            console.log('  ❌ Column not found!');
        }

        // Check user_quests.quest_id
        const userQuestQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'user_quests' AND column_name = 'quest_id';
    `;

        const userResult = await client.query(userQuestQuery);
        console.log('\nuser_quests.quest_id:');
        if (userResult.rows.length > 0) {
            console.log('  Type:', userResult.rows[0].data_type);
            console.log('  Max Length:', userResult.rows[0].character_maximum_length || 'N/A');
        } else {
            console.log('  ❌ Column not found!');
        }

        // Check for any UUID columns in these tables
        const uuidCheckQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('published_quests', 'user_quests')
      AND data_type = 'uuid';
    `;

        const uuidResult = await client.query(uuidCheckQuery);
        console.log('\n--- UUID Columns Found ---');
        if (uuidResult.rows.length > 0) {
            uuidResult.rows.forEach(row => {
                console.log(`  ⚠️  ${row.table_name}.${row.column_name} is UUID`);
            });
        } else {
            console.log('  ✅ No UUID columns found in these tables');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkColumnTypes().catch(console.error);
