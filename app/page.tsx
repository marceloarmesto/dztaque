import { redirect } from 'next/navigation'

// A rota raiz sempre manda pro feed.
// Usuários não autenticados são capturados pelo middleware e redirecionados para /login.
export default function RootPage() {
  redirect('/feed')
}
