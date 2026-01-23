import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xemzshuqdxijvpqtwmha.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbXpzaHVxZHhpanZwcXR3bWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzMzMzksImV4cCI6MjA4NDQwOTMzOX0.ml6t0NR5n9WUs3ULVQCGgzQ0ZseuelJ-CBAGBVqliIw'

export const supabase = createClient(supabaseUrl, supabaseKey)