/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      // Padrão do Next é 1 MB — pequeno demais pra upload de foto (o usuário
      // recebia "An unexpected response was received from the server", erro
      // do framework disparado antes da action rodar).
      // As fotos já são reduzidas no navegador (lib/cooperados/foto-imagem.ts),
      // então isto é só rede de segurança pra browser onde o canvas falhar.
      // Não adianta subir muito: a Vercel corta requisição acima de ~4,5 MB.
      bodySizeLimit: '4mb',
    },
  },
  async headers() {
    return [
      // Espelho da COOPAIBI acessado pelo CAMINHO (/sites/coopaibi/*) não
      // pode ser indexado: seria conteúdo duplicado do coopaibi.com.br que
      // está no ar, disputando SEO com ele — mesma preocupação que motivou a
      // flag site_config.indexavel (ver migration 085 e layout do (site-org)).
      // Como os arquivos são cópia byte a byte, não dá pra injetar <meta
      // name="robots"> sem quebrar a fidelidade; o header resolve por fora.
      //
      // Por que isto NÃO afeta o domínio próprio: headers() casa contra o
      // caminho da requisição que CHEGA, antes de qualquer rewrite. Em
      // coopaibi.com.br o caminho que chega é "/" (o middleware é que o
      // traduz pra /sites/coopaibi/index.html depois), então não casa aqui e
      // o site indexa normalmente quando o DNS virar.
      {
        source: '/sites/coopaibi/:caminho*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Espelho fiel da COOPAIBI (public/sites/coopaibi) — complemento do
        // rewrite feito no middleware.ts, que resolve host e caminhos.
        //
        // Por que esta regra existe SEPARADA: o matcher do middleware pula
        // requisições que terminam em extensão de imagem (svg|png|jpg|jpeg|
        // ...), então o middleware nunca vê /assets/logo-coopaibi.jpeg no
        // domínio próprio e os dois logos do site cairiam em 404. Rewrite de
        // next.config não passa pelo matcher, então cobre exatamente esse
        // vão. É deliberadamente estreito (/assets/*, e só nos hosts da
        // COOPAIBI) pra não colidir com o rewrite do middleware: o que ele
        // já reescreveu vira /sites/coopaibi/... e deixa de casar aqui.
        {
          source: '/assets/:arquivo*',
          has: [{ type: 'host', value: '(www\\.)?coopaibi\\.com\\.br' }],
          destination: '/sites/coopaibi/assets/:arquivo*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
