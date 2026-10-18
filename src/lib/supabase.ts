// GYM OS — Client Supabase (décision D1 : Supabase dès la V1, sans compte en V1)
// La clé utilisée est la clé publique "anon" : la sécurité repose sur les
// politiques RLS (supabase/schema.sql), jamais sur le secret de cette clé (§18).
// Tant que les variables ne sont pas renseignées, l'application fonctionne
// en local (IndexedDB) et l'indique honnêtement dans l'interface.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null
