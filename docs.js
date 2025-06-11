const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Charger la documentation Swagger
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Créer un router pour la documentation
const docsRouter = express.Router();

// Configuration Swagger UI
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .btn.authorize { 
      background-color: #10b981; 
      border-color: #10b981; 
    }
    .swagger-ui .btn.authorize:hover { 
      background-color: #059669; 
      border-color: #059669; 
    }
  `,
  customSiteTitle: "API Documentation - REST API",
  customfavIcon: "/favicon.ico"
};

// Route pour servir la documentation Swagger
docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Route pour obtenir le fichier JSON de l'API
docsRouter.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// Route pour obtenir le fichier YAML de l'API
docsRouter.get('/yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(path.join(__dirname, 'swagger.yaml'));
});

module.exports = docsRouter;
