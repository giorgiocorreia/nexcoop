// Redimensionamento da foto do cooperado no NAVEGADOR, antes do upload.
// Importado apenas por client components — usa canvas/createImageBitmap,
// não roda no server (nunca importar em action ou route handler).
//
// Por que existe (24/07/2026): sem isto, uma foto de celular (2–5 MB) estoura
// o limite de body de Server Action do Next.js (1 MB por padrão) e o usuário
// recebia "An unexpected response was received from the server" — erro do
// framework, disparado ANTES da action rodar, então nossa validação de
// tamanho no server nem chegava a ser executada.
//
// Redimensionar no cliente resolve na raiz e ainda deixa o PDF da carteirinha
// (fase 3) leve: um lote de 200 cartões baixa 200 fotos, e a diferença entre
// 4 MB e 150 KB por foto decide se a função serverless termina no prazo.
//
// Recorte em 3:4 (24/07/2026): a foto entrava esticada na moldura do cartão
// porque só reduzia mantendo a proporção original — qualquer proporção
// diferente de 3:4 deformava o rosto. Agora recorta em "cover" centralizado
// pra proporção de foto de documento (3:4, retrato), igual ao que a moldura
// do PDF passou a usar (lib/carteirinha/pdf.ts) — foto nova entra sem
// nenhuma faixa sobrando e sem distorção.

// Saída final: 675×900px (3:4) — cobre a impressão em alta densidade da
// moldura do cartão (45×60pt / ~16×21mm) com folga.
const SAIDA_LARGURA = 675
const SAIDA_ALTURA = 900
const QUALIDADE_JPEG = 0.85

// Recorta a imagem em "cover" centralizado (preenche a área 3:4 escalando
// pra cobrir e corta o excedente pelo centro) e devolve sempre um JPEG.
// Se qualquer etapa falhar (browser antigo, imagem corrompida), devolve o
// arquivo original — o server ainda valida tipo e tamanho, então o pior caso
// é o usuário ver a mensagem de limite, nunca um upload silenciosamente quebrado.
export async function redimensionarFoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)

    // Escala pra COBRIR a área 3:4 (a maior das duas razões, não a menor —
    // é o oposto do "contain" usado no PDF) e recorta o excedente pelo centro.
    const escalaCover = Math.max(SAIDA_LARGURA / bitmap.width, SAIDA_ALTURA / bitmap.height)
    const larguraOrigemRecortada = SAIDA_LARGURA / escalaCover
    const alturaOrigemRecortada = SAIDA_ALTURA / escalaCover
    const sx = (bitmap.width - larguraOrigemRecortada) / 2
    const sy = (bitmap.height - alturaOrigemRecortada) / 2

    const canvas = document.createElement('canvas')
    canvas.width = SAIDA_LARGURA
    canvas.height = SAIDA_ALTURA

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // Fundo branco antes de desenhar: PNG com transparência viraria preto ao
    // ser convertido pra JPEG (que não tem canal alfa).
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, SAIDA_LARGURA, SAIDA_ALTURA)
    ctx.drawImage(
      bitmap,
      sx, sy, larguraOrigemRecortada, alturaOrigemRecortada, // origem: retângulo 3:4 recortado do centro
      0, 0, SAIDA_LARGURA, SAIDA_ALTURA                       // destino: canvas inteiro
    )
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG)
    )
    if (!blob) return file

    // Diferente da versão anterior (só reduzia mantendo proporção), aqui NÃO
    // devolvemos o original quando o resultado "fica maior" — o recorte 3:4
    // corrige o enquadramento, não é uma otimização opcional de tamanho, e
    // pular o recorte deixaria a foto esticada de novo na carteirinha.

    const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
