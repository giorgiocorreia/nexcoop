import { NextResponse } from 'next/server';

function decodeJwtMeta(token: string | undefined) {
  if (!token) return { presente: false };
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return {
      presente: true,
      ref: payload.ref,
      role: payload.role,
      iss: payload.iss,
    };
  } catch {
    return { presente: true, decodificavel: false, tamanho: token.length };
  }
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-diag-secret');
  if (secret !== process.env.DIAG_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const EXPECTED_REF = 'cufovlntqfobutwvfcea';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = decodeJwtMeta(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRole = decodeJwtMeta(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    supabase_url: supabaseUrl,
    supabase_url_ref_correto: supabaseUrl.includes(EXPECTED_REF),
    anon_key: anon,
    anon_ref_correto: anon.ref === EXPECTED_REF,
    anon_role_correto: anon.role === 'anon',
    service_role_key: serviceRole,
    service_role_ref_correto: serviceRole.ref === EXPECTED_REF,
    service_role_role_correto: serviceRole.role === 'service_role',
    outras_presentes: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      FOCUSNFE_TOKEN_PRODUCAO: !!process.env.FOCUSNFE_TOKEN_PRODUCAO,
      FOCUSNFE_TOKEN_HOMOLOGACAO: !!process.env.FOCUSNFE_TOKEN_HOMOLOGACAO,
      FOCUSNFE_AMBIENTE: process.env.FOCUSNFE_AMBIENTE || null,
      EVOLUTION_API_KEY: !!process.env.EVOLUTION_API_KEY,
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || null,
      SMTP_USER: process.env.SMTP_USER || null,
      SMTP_PASS: !!process.env.SMTP_PASS,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    }
  });
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-diag-secret');
  if (secret !== process.env.DIAG_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');

  const supabase = createAdminClient();
  const testId = `diag-${Date.now()}`;

  const { data, error } = await supabase
    .from('_diag_test' as any) // tabela que provavelmente não existe — isso é esperado
    .insert({ id: testId })
    .select();

  return NextResponse.json({
    tentativa_de_escrita: 'executada',
    erro_retornado: error ? { message: error.message, code: error.code, hint: error.hint } : null,
    data_retornada: data,
    interpretacao: error?.code === '42P01'
      ? 'Tabela não existe — ISSO É BOM: prova que a service_role key tem permissão real de escrita (bypassou RLS e chegou a tentar a operação)'
      : error
        ? 'Erro diferente de "tabela não existe" — investigar'
        : 'Escreveu sem erro mesmo sem a tabela existir — suspeito'
  });
}
