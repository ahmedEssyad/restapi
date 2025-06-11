const cloudinary = require('cloudinary').v2;
const logger = require('../services/logger');

// Configuration de Cloudinary avec les variables d'environnement
logger.info('Configuration Cloudinary initialisée', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'Non défini',
  api_key: process.env.CLOUDINARY_API_KEY ? 'Défini' : 'Non défini',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Défini' : 'Non défini',
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;