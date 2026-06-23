import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Carregar .env.local manualmente (tsx não carrega automaticamente)
const envContent = fs.readFileSync('.env.local', 'utf-8')
envContent.split('\n').forEach((line) => {
  const i = line.indexOf('=')
  if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
})

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Unsplash: usa o formato images.unsplash.com com w/h para refletir o aspect.
function img(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`
}

type SeedPin = {
  title: string
  collection: string
  tags: string[]
  image_url: string
  aspect: number
  source_url: string | null
  notes: string | null
}

const PINS: SeedPin[] = [
  { title: 'NIKE — FEEL IT',        collection: 'Campanhas sociais',  tags: ['sport','emotion'],      image_url: img('photo-1542291026-7eec264c27ff', 800, 1120), aspect: 1.4,  source_url: 'https://nike.com', notes: null },
  { title: 'COSMOS REBRAND',        collection: 'Identidade visual',  tags: ['minimal','identity'],   image_url: img('photo-1558655146-d09347e92766', 800, 640),  aspect: 0.8,  source_url: 'https://cosmos.so', notes: 'Referência de grid editorial.' },
  { title: 'APPLE PRIVACY',         collection: 'Campanhas sociais',  tags: ['tech','manifesto'],     image_url: img('photo-1517336714731-489689fd1ca8', 800, 1280), aspect: 1.6,  source_url: 'https://apple.com', notes: null },
  { title: 'NEUE HAAS IN USE',      collection: 'Tipografia',         tags: ['helvetica','type'],     image_url: img('photo-1561070791-2526d30994b5', 800, 800),  aspect: 1.0,  source_url: null, notes: null },
  { title: 'LINEAR DESIGN SYS',     collection: 'Dark UI',            tags: ['ui','system'],          image_url: img('photo-1551650975-87deedd944c3', 800, 960),  aspect: 1.2,  source_url: 'https://linear.app', notes: null },
  { title: 'BK WHOPPER OOH',        collection: 'OOH',                tags: ['food','outdoor'],       image_url: img('photo-1568901346375-23c9450c58cd', 800, 480),  aspect: 0.6,  source_url: null, notes: null },
  { title: 'SPOTIFY WRAPPED',       collection: 'Campanhas sociais',  tags: ['data','music'],         image_url: img('photo-1614680376573-df3480f0c6ff', 800, 1440), aspect: 1.8,  source_url: 'https://spotify.com', notes: null },
  { title: 'INTER TYPEFACE',        collection: 'Tipografia',         tags: ['open','grotesque'],     image_url: img('photo-1499346030926-9a72daac6c63', 800, 720),  aspect: 0.9,  source_url: null, notes: null },
  { title: 'PORTO ALEGRE OOH',      collection: 'OOH',                tags: ['brasil','urban'],       image_url: img('photo-1449824913935-59a10b8d2000', 800, 560),  aspect: 0.7,  source_url: null, notes: null },
  { title: 'FIGMA CONFIG 24',       collection: 'Dark UI',            tags: ['ux','conference'],      image_url: img('photo-1542751371-adc38448a05e', 800, 1040), aspect: 1.3,  source_url: 'https://figma.com', notes: null },
  { title: 'CHANEL N5 FILM',        collection: 'Motion refs',        tags: ['luxury','cinematic'],   image_url: img('photo-1490481651871-ab68de25d43d', 800, 1360), aspect: 1.7,  source_url: null, notes: null },
  { title: 'PENTAGRAM WORK',        collection: 'Identidade visual',  tags: ['branding','studio'],    image_url: img('photo-1503602642458-232111445657', 800, 880),  aspect: 1.1,  source_url: 'https://pentagram.com', notes: null },
  { title: 'GUGGENHEIM TYPE',       collection: 'Tipografia',         tags: ['museum','display'],     image_url: img('photo-1518998053901-5348d3961a04', 800, 680),  aspect: 0.85, source_url: null, notes: null },
  { title: 'OATLY WEIRD VOICE',     collection: 'Copy',               tags: ['voice','humor'],        image_url: img('photo-1550989460-0adf9ea622e2', 800, 1200), aspect: 1.5,  source_url: 'https://oatly.com', notes: 'Tom de voz irreverente.' },
  { title: 'TEENAGE DREAMS',        collection: 'Campanhas sociais',  tags: ['fashion','youth'],      image_url: img('photo-1492288991661-058aa541ff43', 800, 800),  aspect: 1.0,  source_url: null, notes: null },
  { title: 'FRAMER MOTION',         collection: 'Motion refs',        tags: ['web','interaction'],    image_url: img('photo-1550745165-9bc0b252726f', 800, 1080), aspect: 1.35, source_url: 'https://framer.com', notes: null },
  { title: 'BRUTALIST WEB',         collection: 'Dark UI',            tags: ['brutalist','bold'],     image_url: img('photo-1517245386807-bb43f82c33c4', 800, 1280), aspect: 1.6,  source_url: null, notes: null },
  { title: 'DOVE REAL BEAUTY',      collection: 'Copy',               tags: ['manifesto','brand'],    image_url: img('photo-1531123414780-f74242c2b052', 800, 600),  aspect: 0.75, source_url: null, notes: null },
  { title: 'PRADA BILLBOARD',       collection: 'OOH',                tags: ['luxury','fashion'],     image_url: img('photo-1445205170230-053b83016050', 800, 960),  aspect: 1.2,  source_url: null, notes: null },
  { title: 'VEJA COLLAB',           collection: 'Identidade visual',  tags: ['collab','street'],      image_url: img('photo-1525966222134-fcfa99b8ae77', 800, 800),  aspect: 1.0,  source_url: 'https://veja.fr', notes: null },
  { title: 'KINETIC POSTERS',       collection: 'Motion refs',        tags: ['poster','kinetic'],     image_url: img('photo-1547891654-e66ed7ebb968', 800, 1120), aspect: 1.4,  source_url: null, notes: null },
  { title: 'GUMROAD MINIMAL',       collection: 'Dark UI',            tags: ['saas','clean'],         image_url: img('photo-1467232004584-a241de8bcf5d', 800, 720),  aspect: 0.9,  source_url: null, notes: null },
  { title: 'RETRO ARCADE COPY',     collection: 'Copy',               tags: ['retro','playful'],      image_url: img('photo-1493711662062-fa541adb3fc8', 800, 1040), aspect: 1.3,  source_url: null, notes: null },
  { title: 'SWISS GRID STUDY',      collection: 'Tipografia',         tags: ['swiss','grid'],         image_url: img('photo-1524634126442-357e0eac3c14', 800, 800),  aspect: 1.0,  source_url: null, notes: null },
  { title: 'NEON CITY OOH',         collection: 'OOH',                tags: ['neon','night'],         image_url: img('photo-1492321936769-b49830bc1d1e', 800, 1200), aspect: 1.5,  source_url: null, notes: null },
]

async function seed() {
  // Buscar os 8 usuários da Fase 1
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, handle')
    .order('handle')
  if (pe || !profiles?.length) {
    console.error('Sem profiles. Rode scripts/seed.ts (Fase 1) antes.', pe?.message ?? '')
    process.exit(1)
  }

  // Idempotência: apaga todos os pins (cascata remove likes/saves)
  await supabase.from('pins').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Inserir pins, rotacionando autoria entre os usuários
  const rows = PINS.map((p, i) => ({ ...p, author_id: profiles[i % profiles.length].id }))
  const { data: inserted, error: ie } = await supabase.from('pins').insert(rows).select('id')
  if (ie) { console.error('Erro inserindo pins:', ie.message); process.exit(1) }
  console.log(`✓ ${inserted!.length} pins inseridos`)

  // Likes/saves aleatórios
  const pinIds = inserted!.map((r) => r.id)
  const likeRows: { user_id: string; pin_id: string }[] = []
  const saveRows: { user_id: string; pin_id: string }[] = []
  const seenLike = new Set<string>()
  const seenSave = new Set<string>()
  for (let n = 0; n < 30; n++) {
    const u = profiles[Math.floor(Math.random() * profiles.length)].id
    const pin = pinIds[Math.floor(Math.random() * pinIds.length)]
    const k = `${u}:${pin}`
    if (!seenLike.has(k)) { seenLike.add(k); likeRows.push({ user_id: u, pin_id: pin }) }
  }
  for (let n = 0; n < 15; n++) {
    const u = profiles[Math.floor(Math.random() * profiles.length)].id
    const pin = pinIds[Math.floor(Math.random() * pinIds.length)]
    const k = `${u}:${pin}`
    if (!seenSave.has(k)) { seenSave.add(k); saveRows.push({ user_id: u, pin_id: pin }) }
  }
  if (likeRows.length) await supabase.from('likes').insert(likeRows)
  if (saveRows.length) await supabase.from('saves').insert(saveRows)
  console.log(`✓ ${likeRows.length} likes, ${saveRows.length} saves`)
  console.log('\nDone.')
  process.exit(0)
}

seed()
