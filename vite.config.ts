import { defineConfig, type Plugin } from 'vite'

// Las vistas previas al compartir (WhatsApp, redes…) necesitan la URL absoluta de la imagen.
// Compila con SITE_URL=https://tudominio.com npm run build para rellenarla.
function absoluteOgImage(): Plugin {
  return {
    name: 'absolute-og-image',
    transformIndexHtml(html) {
      const site = process.env.SITE_URL?.replace(/\/+$/, '')
      if (!site) return html
      return html
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${site}/og-image.jpg$2`)
        .replace('<meta property="og:type"', `<meta property="og:url" content="${site}/" />\n    <meta property="og:type"`)
    },
  }
}

// Rutas relativas: el build funciona en la raíz del dominio o en cualquier subcarpeta
export default defineConfig({
  base: './',
  plugins: [absoluteOgImage()],
  build: {
    chunkSizeWarningLimit: 700,
  },
})
