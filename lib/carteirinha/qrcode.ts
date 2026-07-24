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

// Versão em PNG — usada só pelo gerador de PDF (fase 3), que não sabe
// embutir SVG (pdf-lib só embute PNG/JPEG). Largura generosa (600px):
// o PDF sempre reescala o QR pra um tamanho menor no cartão físico, e um
// PNG pequeno reescalado pra cima fica pixelado a ponto de não ler no
// leitor de código da loja/portaria.
export async function gerarQrCodePngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 600,
  })
}
