// Client Supabase optionnel, réservé à une future intégration sécurisée.
// Les services métier n'utilisent pas ce client : l'app est local-first et
// la synchronisation cloud reste désactivée tant qu'Auth/RLS ne sont pas validés.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null
