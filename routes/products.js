const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { upload, uploadToCloudinary } = require('../middleware/cloudinaryUpload');
const cloudinary = require('../middleware/cloudinary');

// Point de terminaison pour tester la connexion
router.get('/test', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    success: true,
    database: {
      connected: dbState === 1
    }
  });
});

// --- Routes publiques (sans authentification) ---

// Récupérer les produits en promotion
router.get('/promotions', async (req, res) => {
  try {
    const today = new Date();
    
    const promotions = await Product.find({
      discountedPrice: { $ne: null },
      discountDuration: { $gte: today }
    })
    .populate('Company_id', 'nom')
    .populate('categoriesa_id', 'name')
    .populate('subcategories_id', 'name');

    if (!promotions || promotions.length === 0) {
      return res.status(200).json([]);
    }

    res.json(promotions);
  } catch (error) {
    console.error('Erreur lors de la récupération des promotions:', error);
    res.status(500).json({
      message: 'Une erreur est survenue lors du chargement des promotions',
      error: error.message
    });
  }
});

// Recherche de produits
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Le terme de recherche est requis',
      });
    }

    const products = await Product.find({
      nom: new RegExp(q, 'i'),
    })
      .populate('categoriesa_id', 'name')
      .populate('subcategories_id', 'name')
      .populate('Company_id', 'nom');

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Erreur de recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la recherche',
    });
  }
});

// Récupérer tous les produits avec filtrage - Route publique
router.get('/', async (req, res) => {
  try {
    const {
      categoryId,
      subcategories,
      companies,
      minPrice,
      maxPrice,
      features,
      hasDiscount
    } = req.query;

    let query = {};

    // Filtre par catégorie
    if (categoryId) {
      query.categoriesa_id = categoryId;
    }

    // Filtre par sous-catégorie
    if (subcategories) {
      query.subcategories_id = { $in: subcategories.split(',') };
    }

    // Filtre par entreprise
    if (companies) {
      query.Company_id = { $in: companies.split(',') };
    }

    // Filtre par prix
    if (minPrice || maxPrice) {
      query.oldPrice = {};
      if (minPrice) query.oldPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.oldPrice.$lte = parseFloat(maxPrice);
    }

    // Filtre par caractéristiques
    if (features) {
      query.features = { $in: features.split(',') };
    }

    // Filtre par réduction
    if (hasDiscount === 'true') {
      query.discountedPrice = { $ne: null };
    }

    const products = await Product.find(query)
      .populate('Company_id', 'nom')
      .populate('categoriesa_id', 'name')
      .populate('subcategories_id', 'name');

    res.json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: error.message });
  }
});

// Récupérer tous les produits - Route administrateur avec filtrage par rôle
router.get('/admin', auth, checkPermission('products', 'read'), async (req, res) => {
  try {
    // Vérifier explicitement le rôle - refuser l'accès au responsable commande pour certaines fonctions
    if (req.adminRole === 'orderManager' && req.query.action === 'edit') {
      return res.status(403).json({
        success: false,
        message: 'Les responsables de commandes n\'ont pas accès à la modification des produits'
      });
    }

    const {
      categoryId,
      subcategories,
      companies,
      minPrice,
      maxPrice,
      features,
      hasDiscount
    } = req.query;

    let query = {};

    // Filtre par catégorie
    if (categoryId) {
      query.categoriesa_id = categoryId;
    }

    // Filtre par sous-catégorie
    if (subcategories) {
      query.subcategories_id = { $in: subcategories.split(',') };
    }

    // Filtre par entreprise
    if (companies) {
      query.Company_id = { $in: companies.split(',') };
    }

    // Filtre par prix
    if (minPrice || maxPrice) {
      query.oldPrice = {};
      if (minPrice) query.oldPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.oldPrice.$lte = parseFloat(maxPrice);
    }

    // Filtre par caractéristiques
    if (features) {
      query.features = { $in: features.split(',') };
    }

    // Filtre par réduction
    if (hasDiscount === 'true') {
      query.discountedPrice = { $ne: null };
    }

    // Filtrage basé sur le rôle de l'utilisateur
    if (req.adminRole === 'productManager') {
      // Le responsable produit voit tous les produits (pas de filtrage supplémentaire nécessaire)
    } else if (req.adminRole === 'orderManager') {
      // Le responsable commande voit les produits en lecture seule pour référence
      // Pas de filtrage spécifique mais restrictions d'actions dans l'interface
    } else if (req.adminRole === 'contentEditor') {
      // L'éditeur de contenu ne voit que ce qui est pertinent pour l'édition
      // Il pourrait être limité aux champs descriptifs des produits
    }

    const products = await Product.find(query)
      .populate('Company_id', 'nom')
      .populate('categoriesa_id', 'name')
      .populate('subcategories_id', 'name');

    // Si c'est un responsable de commandes, limiter les données renvoyées
    if (req.adminRole === 'orderManager') {
      const simplifiedProducts = products.map(p => ({
        _id: p._id,
        nom: p.nom,
        mainPicture: p.mainPicture,
        oldPrice: p.oldPrice,
        discountedPrice: p.discountedPrice,
        quantite: p.quantite,
        Company_id: p.Company_id,
      }));
      
      return res.json(simplifiedProducts);
    }

    res.json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: error.message });
  }
});

// Récupérer un produit par ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue lors du chargement du produit.' });
  }
});

// Récupérer les produits par catégorie et sous-catégorie optionnelle
router.get('/category/:categoryId', async (req, res) => {
  try {
    const query = { categoriesa_id: req.params.categoryId };
    if (req.query.subcategoryId) {
      query.subcategories_id = req.query.subcategoryId;
    }
    const products = await Product.find(query)
      .populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement des produits.' });
  }
});

// --- Routes protégées (avec authentification et vérification des permissions) ---

// Créer un produit
router.post('/', auth, checkPermission('products', 'create'), upload.array('pictures', 10), async (req, res) => {
  try {
    // Uploader les images sur Cloudinary
    const picturePromises = req.files ? req.files.map(file => 
      uploadToCloudinary(file.path, 'products')
    ) : [];
    
    // Attendre que toutes les images soient uploadées
    const pictureResults = await Promise.all(picturePromises);
    
    // Récupérer les URLs des images
    const pictures = pictureResults.map(result => result.secure_url);
    const mainPicture = pictures.length > 0 ? pictures[0] : null;
    
    const productData = {
      ...req.body,
      id: uuidv4(),
      categoriesa_id: Array.isArray(req.body.categoriesa_id)
        ? req.body.categoriesa_id
        : req.body.categoriesa_id
        ? req.body.categoriesa_id.split(',')
        : [],
      subcategories_id: Array.isArray(req.body.subcategories_id)
        ? req.body.subcategories_id
        : req.body.subcategories_id
        ? req.body.subcategories_id.split(',')
        : [],
      pictures: pictures,
      mainPicture: mainPicture,
      oldPrice: parseFloat(req.body.oldPrice || 0),
      quantite: parseInt(req.body.quantite || 0)
    };

    const product = new Product(productData);
    await product.save();

    const savedProduct = await Product.findById(product._id)
      .populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(400).json({
      message: 'Une erreur est survenue lors de la création du produit.',
      error: error.message,
    });
  }
});

// Modifier un produit
router.put('/:id', auth, checkPermission('products', 'update'), upload.array('pictures', 10), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    // Récupérer les images existantes
    let pictures = product.pictures || [];
    let mainPicture = product.mainPicture;
    
    // Uploader les nouvelles images sur Cloudinary si elles existent
    if (req.files && req.files.length > 0) {
      const picturePromises = req.files.map(file => 
        uploadToCloudinary(file.path, 'products')
      );
      
      // Attendre que toutes les images soient uploadées
      const pictureResults = await Promise.all(picturePromises);
      
      // Ajouter les nouvelles URLs d'images
      const newPictures = pictureResults.map(result => result.secure_url);
      pictures = [...pictures, ...newPictures];
      
      // Si c'est la première image, définir comme image principale
      if (!mainPicture && newPictures.length > 0) {
        mainPicture = newPictures[0];
      }
    }
    
    // Si on demande à changer l'image principale
    if (req.body.mainPictureIndex !== undefined) {
      const index = parseInt(req.body.mainPictureIndex);
      if (index >= 0 && index < pictures.length) {
        mainPicture = pictures[index];
      }
    }

    const updates = {
      nom: req.body.nom,
      description: req.body.description || '',
      features: req.body.features || '',
      Company_id: req.body.Company_id,
      categoriesa_id: Array.isArray(req.body.categoriesa_id)
        ? req.body.categoriesa_id
        : req.body.categoriesa_id?.split(',') || [],
      subcategories_id: Array.isArray(req.body.subcategories_id)
        ? req.body.subcategories_id
        : req.body.subcategories_id?.split(',') || [],
      oldPrice: parseFloat(req.body.oldPrice || product.oldPrice),
      quantite: parseInt(req.body.quantite || product.quantite),
      pictures: pictures,
      mainPicture: mainPicture
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');

    res.json({ message: 'Produit mis à jour avec succès.', product: updatedProduct });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error.message);
    res.status(400).json({
      message: 'Une erreur est survenue lors de la mise à jour du produit.',
      error: error.message,
    });
  }
});

// Supprimer une image d'un produit
router.delete('/:id/image/:imageIndex', auth, checkPermission('products', 'update'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    const imageIndex = parseInt(req.params.imageIndex);
    
    if (imageIndex < 0 || imageIndex >= product.pictures.length) {
      return res.status(400).json({ message: 'Index d\'image invalide.' });
    }
    
    const imageToDelete = product.pictures[imageIndex];
    
    // Extraire l'ID Cloudinary de l'URL (si c'est une URL Cloudinary)
    if (imageToDelete.includes('cloudinary')) {
      try {
        // Exemple d'URL Cloudinary: https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/products/image-id.jpg
        const parts = imageToDelete.split('/');
        const filenameWithExtension = parts[parts.length - 1];
        const filename = filenameWithExtension.split('.')[0];
        const publicId = `products/${filename}`;
        
        // Supprimer l'image de Cloudinary
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
      }
    }
    
    // Mettre à jour la liste des images
    product.pictures.splice(imageIndex, 1);
    
    // Si l'image principale était celle supprimée, choisir une nouvelle image principale
    if (product.mainPicture === imageToDelete) {
      product.mainPicture = product.pictures.length > 0 ? product.pictures[0] : null;
    }
    
    await product.save();
    
    res.json({
      message: 'Image supprimée avec succès',
      product
    });
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la suppression de l\'image',
      error: error.message
    });
  }
});

// Supprimer un produit
router.delete('/:id', auth, checkPermission('products', 'delete'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    // Supprimer toutes les images de Cloudinary
    if (product.pictures && product.pictures.length > 0) {
      for (const picturePath of product.pictures) {
        if (picturePath.includes('cloudinary')) {
          try {
            const parts = picturePath.split('/');
            const filenameWithExtension = parts[parts.length - 1];
            const filename = filenameWithExtension.split('.')[0];
            const publicId = `products/${filename}`;
            
            await cloudinary.uploader.destroy(publicId);
          } catch (error) {
            console.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
          }
        }
      }
    }

    await product.deleteOne();
    res.json({ message: 'Le produit a été supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression du produit.' });
  }
});

// Ajouter ou modifier une remise
router.put('/:id/discount', auth, checkPermission('products', 'update'), async (req, res) => {
  try {
    const { discountedPrice, discountDuration } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    product.discountedPrice = discountedPrice || null;
    product.discountDuration = discountDuration ? new Date(discountDuration) : null;
    await product.save();

    res.json({ message: 'La remise a été appliquée avec succès.', product });
  } catch (error) {
    res.status(400).json({
      message: 'Une erreur est survenue lors de l\'ajout de la remise.',
      error: error.message,
    });
  }
});

// Supprimer une remise
router.delete('/:id/discount', auth, checkPermission('products', 'update'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    product.discountedPrice = null;
    product.discountDuration = null;
    await product.save();

    res.json({ message: 'La remise a été supprimée avec succès.', product });
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de la remise.', error: error.message });
  }
});

module.exports = router;