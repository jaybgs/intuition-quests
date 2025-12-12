// Quick script to check if Supabase is configured
// Run with: node check-supabase-config.js

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('🔍 Checking Supabase Configuration...\n');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('   Please create a .env file in the frontend directory.');
  if (fs.existsSync(envExamplePath)) {
    console.log('   You can copy .env.example to .env as a starting point.');
  }
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Check for required variables
const requiredVars = {
  'VITE_SUPABASE_URL': 'Supabase Project URL',
  'VITE_SUPABASE_ANON_KEY': 'Supabase Anonymous Key',
};

let allPresent = true;

console.log('Environment Variables:');
Object.entries(requiredVars).forEach(([key, description]) => {
  const value = envVars[key];
  if (value) {
    // Mask the key for security
    const masked = key.includes('KEY') 
      ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`  ✅ ${key}: ${masked}`);
  } else {
    console.log(`  ❌ ${key}: MISSING (${description})`);
    allPresent = false;
  }
});

console.log('');

if (allPresent) {
  console.log('✅ All required Supabase environment variables are set!');
  console.log('   The Supabase client should initialize correctly.');
} else {
  console.log('❌ Missing required environment variables!');
  console.log('   Quest drafts and published quests will be saved to localStorage only.');
  console.log('\n   To fix:');
  console.log('   1. Get your Supabase credentials from: https://supabase.com/dashboard');
  console.log('   2. Add them to your .env file');
  console.log('   3. Restart your development server');
}







