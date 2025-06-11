const path = require('path');
const fs = require('fs');
const logger = require('../../services/logger');
// Remove sharp dependency until it can be properly installed
// const sharp = require('sharp');

/**
 * Middleware pour optimiser les images uploaded (version simplifiée sans sharp)
 */
const optimizeImage = async (req, res, next) => {
  try {
    // Vérifier si un fichier a été uploadé
    if (!req.file) {
      return next();
    }

    // Passer au middleware suivant sans traitement
    logger.info('Image optimization skipped - sharp not installed');
    next();
  } catch (error) {
    logger.error('Erreur d\'optimisation d\'image:', error);
    next(error);
  }
};

/**
 * Middleware pour redimensionner les images à la volée (version simplifiée sans sharp)
 */
const resizeOnRequest = async (req, res, next) => {
  try {
    // Vérifier si des paramètres de redimensionnement sont présents
    const { w, h } = req.query;
    
    if (!w && !h) {
      return next();
    }

    // Passer au middleware suivant sans traitement
    logger.info('Image resizing skipped - sharp not installed');
    next();
  } catch (error) {
    logger.error('Erreur de redimensionnement d\'image:', error);
    next(error);
  }
};

module.exports = {
  optimizeImage,
  resizeOnRequest
};