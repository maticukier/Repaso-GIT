import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Proyecto "futbolero" de Supabase. La clave publicable está pensada para ir en la
// app: lo que cada usuario puede leer o escribir lo controlan las reglas (RLS) de
// supabase/migrations.
export const SUPABASE_URL = 'https://ecnagjqxdebkbqiowgwe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SK4hjy7pVPa4M70z7l06jQ_wtP6Eomi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // En la web, al volver de Google la sesión viene en la dirección de la página.
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// Por ahora el login con Google está disponible en la versión web.
export const loginAvailable = Platform.OS === 'web';
