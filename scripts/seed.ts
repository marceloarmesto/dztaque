import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Carregar .env.local manualmente (tsx não carrega automaticamente)
const envContent = fs.readFileSync('.env.local', 'utf-8')
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const testPassword = process.env.SEED_TEST_PASSWORD

if (!supabaseUrl || !secretKey || !testPassword) {
  console.error('Missing env vars. Check .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_TEST_PASSWORD')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_USERS = [
  { email: 'lucas.andrade@dzestudio.com.br', name: 'Lucas Andrade' },
  { email: 'ana.moraes@dzestudio.com.br',    name: 'Ana Moraes' },
  { email: 'beto.ramos@dzestudio.com.br',    name: 'Beto Ramos' },
  { email: 'carol.assis@dzestudio.com.br',   name: 'Carol Assis' },
  { email: 'feli.costa@dzestudio.com.br',    name: 'Feli Costa' },
  { email: 'mari.rocha@dzestudio.com.br',    name: 'Mari Rocha' },
  { email: 'duda.lima@dzestudio.com.br',     name: 'Duda Lima' },
  { email: 'tati.nunes@dzestudio.com.br',    name: 'Tati Nunes' },
]

async function seed() {
  console.log('Seeding test users...\n')
  for (const user of TEST_USERS) {
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    })
    if (error) {
      if (!error.message.includes('already been registered')) {
        console.error(`✗ ${user.email}: ${error.message}`)
      }
      // silently skip duplicates
    } else {
      console.log(`✓ ${user.email}`)
    }
  }
  console.log('\nDone.')
  process.exit(0)
}

seed()
