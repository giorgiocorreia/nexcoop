// Geração do QR code de verificação da carteirinha — sem I/O de rede/disco
// (a lib `qrcode` só faz cálculo em memória), por isso não precisa de
// 'use server' nem createClient. Usado tanto no server component da
// carteirinha digital (fase 2) quanto no PDF individual (fase 3).
//
// Formato SVG (não PNG/canvas): escala sem borrar em qualquer tamanho de
// tela ou impressão, e `qrcode` gera SVG em Node puro — nada de dependência
// nativa (`canvas`) que quebraria no runtime serverless da Vercel.

import QRCode from 'qrcode'

// Nível de correção de erro 'M' (~15%) — suficiente pra escaneio e mantém o
// código menos denso que 'H', mais fácil de ler impresso pequeno no cartão físico.
export async function gerarQrCodeSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
  })
}
