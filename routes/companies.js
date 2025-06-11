const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/cloudinaryUpload');
const cloudinary = require('../middleware/cloudinary');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const logger = require('../services/logger');

// Récupérer toutes les entreprises
router.get('/', async (req, res) => {
  try {
    const companies = await Company.find()
      .populate('categories_id')
      .populate('subcategories_id');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Une erreur est survenue lors du chargement des entreprises.',
      error: error.message 
    });
  }
});

// Récupérer une entreprise par son ID
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('categories_id')
      .populate('subcategories_id');
    
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Entreprise introuvable.' 
      });
    }
    
    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'entreprise:', error);
    res.status(500).json({ 
      success: false,
      message: 'Une erreur est survenue lors de la récupération de l\'entreprise.',
      error: error.message
    });
  }
});

// Créer une entreprise
router.post('/', auth, upload.single('logo'), async (req, res) => {
  try {
    let logoUrl = null;
    
    // Uploader le logo sur Cloudinary si présent
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'companies');
      logoUrl = result.secure_url;
    }
    
    const companyData = {
      ...req.body,
      id: uuidv4(),
      categories_id: Array.isArray(req.body.categories_id)
        ? req.body.categories_id
        : req.body.categories_id
        ? req.body.categories_id.split(',')
        : [],
      subcategories_id: Array.isArray(req.body.subcategories_id)
        ? req.body.subcategories_id
        : req.body.subcategories_id
        ? req.body.subcategories_id.split(',')
        : [],
      logo: logoUrl,
    };

    const company = new Company(companyData);
    await company.save();

    const savedCompany = await Company.findById(company._id)
      .populate('categories_id')
      .populate('subcategories_id');

    res.status(201).json({
      success: true,
      data: savedCompany
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'entreprise:', error.message);
    res.status(400).json({ 
      success: false,
      message: 'Une erreur est survenue lors de l\'enregistrement de l\'entreprise.',
      error: error.message,
    });
  }
});

// Mettre à jour une entreprise
router.put('/:id', auth, upload.single('logo'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Entreprise introuvable.' 
      });
    }

    // Si une nouvelle image est uploadée et qu'il y avait déjà une image
    if (req.file && company.logo && company.logo.includes('cloudinary')) {
      try {
        // Supprimer l'ancienne image de Cloudinary
        const parts = company.logo.split('/');
        const filenameWithExtension = parts[parts.length - 1];
        const filename = filenameWithExtension.split('.')[0];
        const publicId = `companies/${filename}`;
        
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
      }
    }

    // Uploader la nouvelle image si fournie
    let logoUrl = company.logo;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'companies');
      logoUrl = result.secure_url;
    }

    // Traiter les mises à jour
    const updates = {
      ...req.body,
      categories_id: Array.isArray(req.body.categories_id)
        ? req.body.categories_id
        : req.body.categories_id
        ? req.body.categories_id.split(',')
        : company.categories_id,
      subcategories_id: Array.isArray(req.body.subcategories_id)
        ? req.body.subcategories_id
        : req.body.subcategories_id
        ? req.body.subcategories_id.split(',')
        : company.subcategories_id,
      logo: logoUrl,
    };

    // Mettre à jour l'entreprise
    const updatedCompany = await Company.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('categories_id')
      .populate('subcategories_id');

    res.json({
      success: true,
      data: updatedCompany
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'entreprise:', error.message);
    res.status(400).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour de l\'entreprise.',
      error: error.message,
    });
  }
});

// Supprimer une entreprise
router.delete('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Entreprise introuvable.' 
      });
    }

    // Supprimer l'image de Cloudinary si elle existe
    if (company.logo && company.logo.includes('cloudinary')) {
      try {
        const parts = company.logo.split('/');
        const filenameWithExtension = parts[parts.length - 1];
        const filename = filenameWithExtension.split('.')[0];
        const publicId = `companies/${filename}`;
        
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
      }
    }

    await company.deleteOne();
    res.json({ 
      success: true,
      message: 'L\'entreprise a été supprimée avec succès.' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Une erreur est survenue lors de la suppression de l\'entreprise.',
      error: error.message
    });
  }
});

// Récupérer les entreprises par catégorie
router.get('/by-category/:categoryId', async (req, res) => {
  try {
    // D'abord trouver les produits de cette catégorie
    const products = await Product.find({
      categories_id: req.params.categoryId
    }).distinct('Company_id');

    // Ensuite récupérer ces entreprises
    const companies = await Company.find({
      _id: { $in: products }
    }).populate('categories_id')
      .populate('subcategories_id');

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    logger.error('Erreur dans la route des entreprises:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des entreprises',
      error: error.message 
    });
  }
});

module.exports = router;