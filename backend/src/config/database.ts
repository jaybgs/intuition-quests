// Database configuration - Now using Supabase
// This file exports Supabase client for backward compatibility
// Services should migrate to: import { supabase } from '../config/supabase';

import { supabase } from './supabase.js';

// Export Supabase as default for backward compatibility
// TODO: Update all services to import directly from './supabase'
export default supabase;

