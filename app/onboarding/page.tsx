import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parceiros não precisam de onboarding — redirecionam para /escritorio
  const { data: prof } = await supabase
    .from('profissionais_parceiros')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  if (prof) redirect('/escritorio')

  return <OnboardingForm />
}
