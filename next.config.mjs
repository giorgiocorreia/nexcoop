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
};

export default nextConfig;
