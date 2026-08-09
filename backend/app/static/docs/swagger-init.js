// Initialisation de Swagger UI depuis un fichier servi par l'API plutôt que
// depuis un <script> inline : la CSP de /api/docs reste ainsi en
// script-src 'self', sans 'unsafe-inline' ni hash à resynchroniser.
//
// Le preset SwaggerUIStandalonePreset du gabarit FastAPI n'est pas repris : il
// vit dans swagger-ui-standalone-preset.js, qui n'est pas chargé ici, et vaut
// donc `undefined` dans la page d'origine. Ne pas le passer ne change rien à
// l'affichage.
window.ui = SwaggerUIBundle({
  url: '/api/openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  showExtensions: true,
  showCommonExtensions: true,
  presets: [SwaggerUIBundle.presets.apis],
})
