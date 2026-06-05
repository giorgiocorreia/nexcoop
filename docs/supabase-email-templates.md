# Templates de E-mail — Supabase (Português Brasileiro)

Copie cada template no Supabase Dashboard em:
**Authentication → Email Templates → [tipo]**

Substitua o conteúdo do campo **Body** pelo HTML abaixo.
O campo **Subject** também está indicado em cada seção.

---

## 1. Invite User (Convite de novo usuário)

**Subject:** `Você foi convidado para o NexCoop`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite NexCoop</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e3dc;overflow:hidden;">

          <!-- Cabeçalho -->
          <tr>
            <td style="background:#635BFF;padding:28px 40px;text-align:center;">
              <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="26" rx="3" fill="white"/>
                  <rect x="22" y="3" width="7" height="26" rx="3" fill="white"/>
                  <path d="M10 3L22 29" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                </svg>
              </span>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCoop</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Gestão cooperativa inteligente</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;">Você foi convidado!</h2>
              <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
                Olá! Você recebeu um convite para acessar o NexCoop — a plataforma de gestão para cooperativas e associações.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.6;">
                Clique no botão abaixo para criar sua senha e ativar sua conta:
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;background:#635BFF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                      Aceitar convite e criar senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin:0;font-size:12px;color:#635BFF;word-break:break-all;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Aviso de segurança -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background:#f8f7f4;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">
                  🔒 Este link é válido por <strong>24 horas</strong> e pode ser usado apenas uma vez.
                  Se você não esperava este convite, ignore este e-mail com segurança.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#f8f7f4;padding:20px 40px;border-top:1px solid #e5e3dc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © 2025 NexCoop · Todos os direitos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Confirm Signup (Confirmação de cadastro)

**Subject:** `Confirme seu e-mail no NexCoop`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu e-mail — NexCoop</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e3dc;overflow:hidden;">

          <!-- Cabeçalho -->
          <tr>
            <td style="background:#635BFF;padding:28px 40px;text-align:center;">
              <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="26" rx="3" fill="white"/>
                  <rect x="22" y="3" width="7" height="26" rx="3" fill="white"/>
                  <path d="M10 3L22 29" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                </svg>
              </span>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCoop</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Gestão cooperativa inteligente</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;">Confirme seu e-mail</h2>
              <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
                Obrigado por se cadastrar no NexCoop! Para ativar sua conta, confirme seu endereço de e-mail clicando no botão abaixo.
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;background:#635BFF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                      Confirmar e-mail
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin:0;font-size:12px;color:#635BFF;word-break:break-all;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Aviso -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background:#f8f7f4;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">
                  🔒 Este link é válido por <strong>24 horas</strong>.
                  Se você não criou uma conta no NexCoop, ignore este e-mail.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#f8f7f4;padding:20px 40px;border-top:1px solid #e5e3dc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © 2025 NexCoop · Todos os direitos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password (Redefinição de senha)

**Subject:** `Redefinição de senha — NexCoop`

```html
<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
  <div style="text-align: center; margin-bottom: 2rem;">
    <img src="https://nexcoop.com.br/images/logo-nexcoop-horizontal.png" alt="NexCoop" style="height: 40px; width: auto;" />
  </div>
  <div style="background: #f8f7f4; border-radius: 12px; padding: 2rem; text-align: center;">
    <h2 style="color: #0D2B5E; margin-bottom: 1rem;">Redefinição de senha</h2>
    <p style="color: #64748B; margin-bottom: 1.5rem;">Clique no botão abaixo para redefinir sua senha. O link expira em 1 hora.</p>
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #1565C0, #06B6D4); color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
      Redefinir senha
    </a>
  </div>
  <p style="text-align: center; color: #94A3B8; font-size: 12px; margin-top: 1.5rem;">
    Se você não solicitou a redefinição, ignore este email.<br/>
    © 2026 NexCoop — nexcoop.com.br
  </p>
</div>
```

---

## 4. Magic Link (Link mágico de acesso)

**Subject:** `Seu link de acesso ao NexCoop`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link de acesso — NexCoop</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e3dc;overflow:hidden;">

          <!-- Cabeçalho -->
          <tr>
            <td style="background:#635BFF;padding:28px 40px;text-align:center;">
              <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="26" rx="3" fill="white"/>
                  <rect x="22" y="3" width="7" height="26" rx="3" fill="white"/>
                  <path d="M10 3L22 29" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                </svg>
              </span>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCoop</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Gestão cooperativa inteligente</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;">Seu link de acesso</h2>
              <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
                Clique no botão abaixo para entrar no NexCoop. Este link faz login automático — não é necessário digitar senha.
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;background:#635BFF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                      Entrar no NexCoop
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin:0;font-size:12px;color:#635BFF;word-break:break-all;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Aviso -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background:#f8f7f4;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">
                  🔒 Este link é válido por <strong>1 hora</strong> e pode ser usado apenas uma vez.
                  Se você não solicitou este link, ignore este e-mail.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#f8f7f4;padding:20px 40px;border-top:1px solid #e5e3dc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © 2025 NexCoop · Todos os direitos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Fluxo de redefinição de senha (técnico)

O `redirectTo` em `resetPasswordForEmail` aponta para `/auth/callback`. O Supabase adiciona automaticamente `?code=...&type=recovery` a essa URL. O route handler em `app/auth/callback/route.ts` troca o code por sessão via `exchangeCodeForSession` e redireciona para `/redefinir-senha`, onde o usuário define a nova senha.

---

## Notas de implementação

- **Variável `{{ .ConfirmationURL }}`** — gerada automaticamente pelo Supabase. Contém a URL completa com o token. Não altere o nome da variável.
- Os templates usam **tabelas HTML** para garantir compatibilidade com clientes de e-mail (Gmail, Outlook, Apple Mail).
- A cor primária `#635BFF` é a identidade visual do NexCoop.
- Para personalizar o remetente, vá em **Authentication → Settings → SMTP Settings** e configure o e-mail e nome do remetente (ex: `NexCoop <noreply@nexcoop.com.br>`).
