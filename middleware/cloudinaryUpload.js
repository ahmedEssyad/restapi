const multer = require('multer');
const path = require('path');
const cloudinary = require('./cloudinary');
const fs = require('fs');
const logger = require('../services/logger');

// Configuration du stockage temporaire pour Multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadsDir = 'tmp';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtre pour vérifier que le fichier est une image
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Le fichier doit être une image.'), false);
  }
};

// Configurer Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limite
});

// Fonction pour uploader une image sur Cloudinary
const uploadToCloudinary = async (filePath, folder = 'products') => {
  logger.info('Uploading to Cloudinary:', filePath, 'to folder:', folder);
  console.log('Cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: 'XXXXX', // Masqué pour la sécurité
    api_secret: 'XXXXX', // Masqué pour la sécurité
  });
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder: folder },
      (error, result) => {
        // Supprimer le fichier local temporaire
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fsError) {
          logger.error('Erreur lors de la suppression du fichier temporaire:', fsError);
        }
        
        if (error) {
          logger.error('Erreur Cloudinary:', error);
          return reject(error);
        }
        logger.info('Upload Cloudinary réussi:', result.secure_url);
        return resolve(result);
      }
    );
  });
};

module.exports = { upload, uploadToCloudinary };