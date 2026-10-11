// Exportação estática para o GitHub Pages (https://<usuário>.github.io/<repositório>/).
// O workflow define NEXT_PUBLIC_BASE_PATH=/<nome-do-repositório>; em dev fica vazio.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
