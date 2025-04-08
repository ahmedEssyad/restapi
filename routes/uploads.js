const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { optimizeImage, resizeOnRequest } = require('../middleware/imageOptimizer');

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec UUID
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  // Accepter seulement les images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

// Configuration de l'upload
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter
});

// Route pour uploader une image et l'optimiser
router.post('/image', upload.single('image'), optimizeImage, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucune image n\'a été téléchargée' });
  }
  
  // Construire l'URL de l'image
  const imageUrl = `/uploads/${req.file.filename}`;
  
  res.status(200).json({
    message: 'Image téléchargée avec succès',
    imageUrl
  });
});

// Middleware pour servir les images optimisées à la volée
router.get('/*', resizeOnRequest, (req, res, next) => {
  // Si le middleware resizeOnRequest n'a pas traité la demande, continuer
  next();
});

module.exports = router;