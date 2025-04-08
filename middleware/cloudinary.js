const cloudinary = require('cloudinary').v2;

// Configuration de Cloudinary avec les variables d'environnement
console.log('Configuration Cloudinary avec:', {
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