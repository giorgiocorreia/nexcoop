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

// Lado maior da imagem final. Na carteirinha impressa a foto ocupa ~46×58pt
// (~16×20mm); 900px cobre isso com folga mesmo em impressão de alta densidade.
const LADO_MAXIMO = 900
const QUALIDADE_JPEG = 0.85

// Reduz a imagem mantendo proporção e devolve sempre um JPEG.
// Se qualquer etapa falhar (browser antigo, imagem corrompida), devolve o
// arquivo original — o server ainda valida tipo e tamanho, então o pior caso
// é o usuário ver a mensagem de limite, nunca um upload silenciosamente quebrado.
export async function redimensionarFoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)

    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
    const largura = Math.round(bitmap.width * escala)
    const altura = Math.round(bitmap.height * escala)

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // Fundo branco antes de desenhar: PNG com transparência viraria preto ao
    // ser convertido pra JPEG (que não tem canal alfa).
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, largura, altura)
    ctx.drawImage(bitmap, 0, 0, largura, altura)
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG)
    )
    if (!blob) return file

    // Se o "redimensionado" ficou maior que o original (imagem já pequena e
    // muito comprimida), mantém o original.
    if (blob.size >= file.size) return file

    const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
