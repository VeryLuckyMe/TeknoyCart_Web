import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chmtvasbhkbrvydbajnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXR2YXNiaGticnZ5ZGJham5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjMwMDgsImV4cCI6MjA5NTMzOTAwOH0.IJJIrh-dr4xRoXPPeBJoN_pVVHrNY4db5E1VY1Czj3I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
