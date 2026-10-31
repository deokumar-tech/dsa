const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const suppliedValues = [supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey].filter(Boolean).length;
const supabaseConfigured = suppliedValues === 3;

if (suppliedValues > 0 && !supabaseConfigured) {
  throw new Error(
    'Configure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY together.',
  );
}

const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

const supabaseAnon = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, authOptions)
  : null;

const supabaseAdmin = supabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, authOptions)
  : null;

function assertSupabaseConfigured() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
}

module.exports = {
  supabaseAnon,
  supabaseAdmin,
  supabaseConfigured,
  assertSupabaseConfigured,
};
