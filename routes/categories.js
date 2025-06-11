const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/cloudinaryUpload');
const cloudinary = require('../middleware/cloudinary');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Company = require('../models/Company');
const Subcategory = require('../models/Subcategory');
const logger = require('../services/logger');

// Récupérer toutes les catégories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('subcategories_id')
      .populate('companies_id');
      const categoriesWithImages = categories.map((category) => ({
        ...category._doc,
        imageUrl: category.logo || '/uploads/placeholder.jpg',
      }));
  
      res.json(categoriesWithImages);
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue lors du chargement des catégories.' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    const subcategories = await Subcategory.find({
      categories_id: req.params.id
    });

    const products = await Product.find({ 
      categoriesa_id: req.params.id 
    }).distinct('Company_id');

    const companies = await Company.find({
      _id: { $in: products }
    });

    const categoryWithDetails = {
      ...category.toObject(),
      subcategories_id: subcategories,
      companies_id: companies
    };

    res.json(categoryWithDetails);

  } catch (error) {
    logger.error('Error fetching category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Créer une catégorie
router.post('/', auth, upload.single('logo'), async (req, res) => {
  try {
    logger.info('POST /categories - Données reçues:', req.body);
    logger.info('POST /categories - Fichier reçu:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'Aucun');

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
    }

    let logoUrl = null;
    
    // Uploader le logo sur Cloudinary si présent
    if (req.file) {
      try {
        logger.info('Tentative d\'upload sur Cloudinary:', req.file.path);
        const result = await uploadToCloudinary(req.file.path, 'categories');
        logoUrl = result.secure_url;
        logger.info('Upload Cloudinary réussi:', logoUrl);
      } catch (cloudinaryError) {
        logger.error('Erreur Cloudinary:', cloudinaryError);
        // Ne pas échouer complètement si l'upload Cloudinary échoue
        // Continuer sans logo
      }
    }

    const categoryData = {
      name,
      logo: logoUrl,
      id: uuidv4(),
      description: req.body.description || ''
    };

    logger.info('Données catégorie à sauvegarder:', categoryData);
    const category = new Category(categoryData);
    await category.save();
    logger.info('Catégorie créée avec succès:', category._id);

    res.status(201).json(category);
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      message: 'Une erreur est survenue lors de la création de la catégorie.',
      error: error.message,
      stack: error.stack
    });
  }
});

// Mettre à jour une catégorie
router.put('/:id', auth, upload.single('logo'), async (req, res) => {
  try {
    logger.info(`PUT /categories/${req.params.id} - Données reçues:`, req.body);
    logger.info(`PUT /categories/${req.params.id} - Fichier reçu:`, req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'Aucun');

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Catégorie introuvable.' });
    }

    // Si une nouvelle image est uploadée et qu'il y avait déjà une image
    if (req.file && category.logo && category.logo.includes('cloudinary')) {
      try {
        logger.info('Suppression de l\'ancienne image Cloudinary');
        // Supprimer l'ancienne image de Cloudinary
        const parts = category.logo.split('/');
        const filenameWithExtension = parts[parts.length - 1];
        const filename = filenameWithExtension.split('.')[0];
        const publicId = `categories/${filename}`;
        
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
        // Continuer même en cas d'erreur
      }
    }

    // Uploader la nouvelle image si fournie
    let logoUrl = category.logo;
    if (req.file) {
      try {
        logger.info('Tentative d\'upload sur Cloudinary:', req.file.path);
        const result = await uploadToCloudinary(req.file.path, 'categories');
        logoUrl = result.secure_url;
        logger.info('Upload Cloudinary réussi:', logoUrl);
      } catch (cloudinaryError) {
        logger.error('Erreur Cloudinary:', cloudinaryError);
        // Ne pas échouer complètement si l'upload Cloudinary échoue
        // Conserver l'ancien logo
      }
    }

    const updates = {
      ...req.body,
      logo: logoUrl
    };

    logger.info('Mises à jour à appliquer:', updates);
    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });
    logger.info('Catégorie mise à jour avec succès:', updatedCategory._id);
    
    res.json(updatedCategory);
  } catch (error) {
    logger.error('Erreur de mise à jour:', error);
    res.status(400).json({ 
      message: 'Une erreur est survenue lors de la mise à jour de la catégorie.',
      error: error.message,
      stack: error.stack
    });
  }
});

// Supprimer une catégorie
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Catégorie introuvable.' });
    }

    // Supprimer l'image de Cloudinary si elle existe
    if (category.logo && category.logo.includes('cloudinary')) {
      try {
        const parts = category.logo.split('/');
        const filenameWithExtension = parts[parts.length - 1];
        const filename = filenameWithExtension.split('.')[0];
        const publicId = `categories/${filename}`;
        
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
      }
    }

    await category.deleteOne();
    res.json({ message: 'La catégorie a été supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de la catégorie.' });
  }
});

module.exports = router;