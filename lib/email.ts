import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function enviarEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"NexCoop" <${process.env.SMTP_USER ?? 'suporte@nexcoop.com.br'}>`,
    to,
    subject,
    html,
  })
}
