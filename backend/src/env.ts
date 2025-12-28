// Load environment variables - import this FIRST in index.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Required environment variables for social connections:
// SUPABASE_URL=your_supabase_project_url
// SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
// JWT_SECRET=your_jwt_secret_for_wallet_auth
// ENCRYPTION_KEY=32_character_random_string_for_encrypting_tokens
// FRONTEND_URL=http://localhost:5173

export {};













