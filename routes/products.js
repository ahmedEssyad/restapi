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
const logger = require('../services/logger');

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
    logger.error('Erreur lors de la récupération des promotions:', error);
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
    logger.error('Erreur de recherche:', error);
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
    logger.error('Erreur lors de la récupération des produits:', error);
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
    logger.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: error.message });
  }
});

// Récupérer un produit par ID
router.get('/:id', async (req, res) => {
  try {
    // Vérifier si l'ID est défini et valide
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        message: 'ID de produit non valide ou non fourni.'
      });
    }

    // Vérifier si l'ID est un ObjectId MongoDB valide
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Format d\'ID de produit non valide.'
      });
    }

    const product = await Product.findById(req.params.id)
      .populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    // Si c'est un produit variable, ajouter les informations sur les variations disponibles
    if (product.productType === 'variable') {
      const availableVariations = product.getAvailableVariations();
      res.json({
        ...product.toJSON(),
        availableVariations
      });
    } else {
      res.json(product);
    }
  } catch (error) {
    logger.error('Erreur lors du chargement du produit:', error);
    res.status(500).json({ 
      message: 'Une erreur est survenue lors du chargement du produit.',
      error: error.message 
    });
  }
});

// Vérifier la disponibilité d'une variation spécifique
router.get('/:id/check-variation', async (req, res) => {
  try {
    const { color, size } = req.query;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    const availabilityInfo = product.checkVariationAvailability(color, size);
    
    res.json({
      productId: product._id,
      productName: product.nom,
      ...availabilityInfo
    });
  } catch (error) {
    logger.error('Erreur lors de la vérification de la disponibilité:', error);
    res.status(500).json({ 
      message: 'Une erreur est survenue lors de la vérification de la disponibilité.',
      error: error.message 
    });
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
    
    const productType = req.body.productType || 'simple';
    
    const productData = {
      ...req.body,
      id: uuidv4(),
      productType,
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
      oldPrice: parseFloat(req.body.oldPrice || 0)
    };
    
    // Si c'est un produit simple, ajouter la quantité
    if (productType === 'simple') {
      productData.quantite = parseInt(req.body.quantite || 0);
    } 
    // Si c'est un produit variable, configurer les variations et attributs disponibles
    else if (productType === 'variable') {
      // Initialiser les attributs disponibles vides (seront remplis lors de l'ajout de variations)
      productData.availableAttributes = {
        colors: req.body.availableColors 
          ? req.body.availableColors.split(',').map(color => color.trim())
          : [],
        sizes: req.body.availableSizes 
          ? req.body.availableSizes.split(',').map(size => size.trim()) 
          : []
      };
      
      // Initialiser les variations comme un tableau vide
      productData.variations = [];
      
      // Si des variations initiales sont fournies, les traiter
      if (req.body.variations) {
        try {
          // Si les variations sont envoyées en tant que chaîne JSON
          const variationsData = typeof req.body.variations === 'string' 
            ? JSON.parse(req.body.variations) 
            : req.body.variations;
            
          if (Array.isArray(variationsData)) {
            productData.variations = variationsData.map(variation => ({
              attributes: {
                color: variation.color || null,
                size: variation.size || null
              },
              quantite: parseInt(variation.quantite || 0),
              price: variation.price ? parseFloat(variation.price) : null,
              sku: variation.sku || uuidv4().substring(0, 8).toUpperCase()
            }));
          }
        } catch (e) {
          logger.error('Erreur lors du parsing des variations:', e);
        }
      }
    }

    const product = new Product(productData);
    await product.save();

    const savedProduct = await Product.findById(product._id)
      .populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');

    res.status(201).json(savedProduct);
  } catch (error) {
    logger.error('Erreur lors de la création du produit:', error);
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
      pictures: pictures,
      mainPicture: mainPicture
    };
    
    // Si le type de produit est spécifié, le mettre à jour
    if (req.body.productType) {
      // Vérifier si le type de produit est valide
      if (['simple', 'variable'].includes(req.body.productType)) {
        updates.productType = req.body.productType;
      }
    }
    
    // Pour les produits simples, mettre à jour la quantité
    if (product.productType === 'simple' || updates.productType === 'simple') {
      updates.quantite = parseInt(req.body.quantite || product.quantite);
    }
    
    // Pour les produits variables, mettre à jour les attributs disponibles si fournis
    if ((product.productType === 'variable' || updates.productType === 'variable') && 
        (req.body.availableColors || req.body.availableSizes)) {
      updates.availableAttributes = {};
      
      if (req.body.availableColors) {
        updates.availableAttributes.colors = req.body.availableColors.split(',').map(color => color.trim());
      } else if (product.availableAttributes && product.availableAttributes.colors) {
        updates.availableAttributes.colors = product.availableAttributes.colors;
      }
      
      if (req.body.availableSizes) {
        updates.availableAttributes.sizes = req.body.availableSizes.split(',').map(size => size.trim());
      } else if (product.availableAttributes && product.availableAttributes.sizes) {
        updates.availableAttributes.sizes = product.availableAttributes.sizes;
      }
    }
    
    // Mise à jour des variations si fournies (pour les produits variables)
    if ((product.productType === 'variable' || updates.productType === 'variable') && 
        req.body.variations) {
      try {
        // Si les variations sont envoyées en tant que chaîne JSON
        const variationsData = typeof req.body.variations === 'string' 
          ? JSON.parse(req.body.variations) 
          : req.body.variations;
          
        if (Array.isArray(variationsData)) {
          // Mettre à jour uniquement les variations avec un ID existant
          // Ajouter les nouvelles variations sans ID
          const updatedVariations = [];
          
          // Copier les variations existantes
          if (product.variations && product.variations.length > 0) {
            updatedVariations.push(...product.variations);
          }
          
          // Traiter chaque variation envoyée
          for (const variationData of variationsData) {
            if (variationData._id) {
              // Mettre à jour une variation existante
              const existingIndex = updatedVariations.findIndex(
                v => v._id.toString() === variationData._id.toString()
              );
              
              if (existingIndex !== -1) {
                // Mettre à jour les attributs
                if (variationData.color) {
                  updatedVariations[existingIndex].attributes.color = variationData.color;
                }
                
                if (variationData.size) {
                  updatedVariations[existingIndex].attributes.size = variationData.size;
                }
                
                // Mettre à jour les autres propriétés
                if (variationData.quantite !== undefined) {
                  updatedVariations[existingIndex].quantite = parseInt(variationData.quantite);
                }
                
                if (variationData.price !== undefined) {
                  updatedVariations[existingIndex].price = parseFloat(variationData.price);
                }
                
                if (variationData.sku) {
                  updatedVariations[existingIndex].sku = variationData.sku;
                }
              }
            } else {
              // Ajouter une nouvelle variation
              updatedVariations.push({
                attributes: {
                  color: variationData.color || null,
                  size: variationData.size || null
                },
                quantite: parseInt(variationData.quantite || 0),
                price: variationData.price ? parseFloat(variationData.price) : null,
                sku: variationData.sku || uuidv4().substring(0, 8).toUpperCase(),
                pictures: [], // Les images seront ajoutées séparément
                mainPicture: null
              });
            }
          }
          
          updates.variations = updatedVariations;
        }
      } catch (e) {
        logger.error('Erreur lors du parsing des variations:', e);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('Company_id')
      .populate('categoriesa_id')
      .populate('subcategories_id');

    res.json({ message: 'Produit mis à jour avec succès.', product: updatedProduct });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du produit:', error.message);
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
        logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
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
            logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
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

// ----- Routes pour les produits variables -----

// Ajouter une nouvelle variation à un produit
router.post('/:id/variations', auth, checkPermission('products', 'update'), upload.array('pictures', 5), async (req, res) => {
  try {
    // Vérifier si l'ID est défini et valide
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        message: 'ID de produit non valide. Assurez-vous que le produit a été enregistré avant d\'ajouter des variations.'
      });
    }

    // Vérifier si l'ID est un ObjectId MongoDB valide
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Format d\'ID de produit non valide.'
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    if (product.productType !== 'variable') {
      return res.status(400).json({ 
        message: 'Impossible d\'ajouter des variations à un produit simple.'
      });
    }
    
    // Uploader les images pour cette variation sur Cloudinary si fournies
    let variationPictures = [];
    let variationMainPicture = null;
    
    if (req.files && req.files.length > 0) {
      const picturePromises = req.files.map(file => 
        uploadToCloudinary(file.path, 'products/variations')
      );
      
      const pictureResults = await Promise.all(picturePromises);
      variationPictures = pictureResults.map(result => result.secure_url);
      variationMainPicture = variationPictures.length > 0 ? variationPictures[0] : null;
    }
    
    // Créer la nouvelle variation
    const newVariation = {
      attributes: {
        color: req.body.color || null,
        size: req.body.size || null
      },
      quantite: parseInt(req.body.quantite || 0),
      price: req.body.price ? parseFloat(req.body.price) : null,
      sku: req.body.sku || uuidv4().substring(0, 8).toUpperCase(),
      pictures: variationPictures,
      mainPicture: variationMainPicture || product.mainPicture
    };
    
    // Ajouter la variation au produit
    product.variations.push(newVariation);
    
    // Mettre à jour les attributs disponibles
    if (newVariation.attributes.color && !product.availableAttributes.colors.includes(newVariation.attributes.color)) {
      product.availableAttributes.colors.push(newVariation.attributes.color);
    }
    
    if (newVariation.attributes.size && !product.availableAttributes.sizes.includes(newVariation.attributes.size)) {
      product.availableAttributes.sizes.push(newVariation.attributes.size);
    }
    
    await product.save();
    
    res.status(201).json({
      message: 'Variation ajoutée avec succès',
      product
    });
  } catch (error) {
    logger.error('Erreur lors de l\'ajout de la variation:', error);
    res.status(400).json({
      message: 'Une erreur est survenue lors de l\'ajout de la variation.',
      error: error.message
    });
  }
});

// Modifier une variation spécifique
router.put('/:id/variations/:variationId', auth, checkPermission('products', 'update'), upload.array('pictures', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    const variationIndex = product.variations.findIndex(
      v => v._id.toString() === req.params.variationId
    );
    
    if (variationIndex === -1) {
      return res.status(404).json({ message: 'Variation introuvable.' });
    }
    
    // Uploader les nouvelles images si fournies
    if (req.files && req.files.length > 0) {
      const picturePromises = req.files.map(file => 
        uploadToCloudinary(file.path, 'products/variations')
      );
      
      const pictureResults = await Promise.all(picturePromises);
      const newPictures = pictureResults.map(result => result.secure_url);
      
      // Ajouter les nouvelles images aux images existantes
      product.variations[variationIndex].pictures = [
        ...product.variations[variationIndex].pictures,
        ...newPictures
      ];
      
      // Si pas d'image principale définie, en définir une
      if (!product.variations[variationIndex].mainPicture && newPictures.length > 0) {
        product.variations[variationIndex].mainPicture = newPictures[0];
      }
    }
    
    // Mettre à jour les attributs de la variation
    if (req.body.color) {
      product.variations[variationIndex].attributes.color = req.body.color;
      
      // Mettre à jour les attributs disponibles si nécessaire
      if (!product.availableAttributes.colors.includes(req.body.color)) {
        product.availableAttributes.colors.push(req.body.color);
      }
    }
    
    if (req.body.size) {
      product.variations[variationIndex].attributes.size = req.body.size;
      
      // Mettre à jour les attributs disponibles si nécessaire
      if (!product.availableAttributes.sizes.includes(req.body.size)) {
        product.availableAttributes.sizes.push(req.body.size);
      }
    }
    
    if (req.body.quantite) {
      product.variations[variationIndex].quantite = parseInt(req.body.quantite);
    }
    
    if (req.body.price) {
      product.variations[variationIndex].price = parseFloat(req.body.price);
    }
    
    if (req.body.sku) {
      product.variations[variationIndex].sku = req.body.sku;
    }
    
    if (req.body.mainPictureIndex !== undefined) {
      const index = parseInt(req.body.mainPictureIndex);
      if (index >= 0 && index < product.variations[variationIndex].pictures.length) {
        product.variations[variationIndex].mainPicture = product.variations[variationIndex].pictures[index];
      }
    }
    
    await product.save();
    
    res.json({
      message: 'Variation mise à jour avec succès',
      product
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la variation:', error);
    res.status(400).json({
      message: 'Une erreur est survenue lors de la mise à jour de la variation.',
      error: error.message
    });
  }
});

// Supprimer une variation
router.delete('/:id/variations/:variationId', auth, checkPermission('products', 'update'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    const variationIndex = product.variations.findIndex(
      v => v._id.toString() === req.params.variationId
    );
    
    if (variationIndex === -1) {
      return res.status(404).json({ message: 'Variation introuvable.' });
    }
    
    // Supprimer la variation
    const removedVariation = product.variations.splice(variationIndex, 1)[0];
    
    // Supprimer les images Cloudinary associées à cette variation
    if (removedVariation.pictures && removedVariation.pictures.length > 0) {
      for (const picturePath of removedVariation.pictures) {
        if (picturePath.includes('cloudinary')) {
          try {
            const parts = picturePath.split('/');
            const filenameWithExtension = parts[parts.length - 1];
            const filename = filenameWithExtension.split('.')[0];
            const publicId = `products/variations/${filename}`;
            
            await cloudinary.uploader.destroy(publicId);
          } catch (error) {
            logger.error('Erreur lors de la suppression de l\'image sur Cloudinary:', error);
          }
        }
      }
    }
    
    // Recalculer les attributs disponibles
    const availableColors = new Set();
    const availableSizes = new Set();
    
    product.variations.forEach(variation => {
      if (variation.attributes.color) availableColors.add(variation.attributes.color);
      if (variation.attributes.size) availableSizes.add(variation.attributes.size);
    });
    
    product.availableAttributes.colors = Array.from(availableColors);
    product.availableAttributes.sizes = Array.from(availableSizes);
    
    await product.save();
    
    res.json({
      message: 'Variation supprimée avec succès',
      product
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la variation:', error);
    res.status(500).json({
      message: 'Une erreur est survenue lors de la suppression de la variation.',
      error: error.message
    });
  }
});

// Convertir un produit simple en produit variable
router.put('/:id/convert-to-variable', auth, checkPermission('products', 'update'), async (req, res) => {
  try {
    // Vérifier si l'ID est défini et valide
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        message: 'ID de produit non valide. Assurez-vous que le produit a été enregistré avant conversion.'
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    if (product.productType === 'variable') {
      return res.status(400).json({ message: 'Ce produit est déjà un produit variable.' });
    }
    
    // Créer une variation par défaut à partir du produit simple
    const defaultVariation = {
      attributes: {
        color: req.body.defaultColor || null,
        size: req.body.defaultSize || null
      },
      quantite: product.quantite,
      price: null, // Utilisera le prix de base du produit
      sku: req.body.sku || uuidv4().substring(0, 8).toUpperCase(),
      pictures: product.pictures,
      mainPicture: product.mainPicture
    };
    
    // Convertir le produit
    product.productType = 'variable';
    product.variations = [defaultVariation];
    product.availableAttributes = {
      colors: defaultVariation.attributes.color ? [defaultVariation.attributes.color] : [],
      sizes: defaultVariation.attributes.size ? [defaultVariation.attributes.size] : []
    };
    
    // Ne pas supprimer la quantité tout de suite au cas où la conversion échouerait
    
    await product.save();
    
    res.json({
      message: 'Produit converti en produit variable avec succès',
      product
    });
  } catch (error) {
    logger.error('Erreur lors de la conversion du produit:', error);
    res.status(400).json({
      message: 'Une erreur est survenue lors de la conversion du produit.',
      error: error.message
    });
  }
});

// Convertir un produit variable en produit simple
router.put('/:id/convert-to-simple', auth, checkPermission('products', 'update'), async (req, res) => {
  try {
    // Vérifier si l'ID est défini et valide
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        message: 'ID de produit non valide. Assurez-vous que le produit a été enregistré avant conversion.'
      });
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    
    if (product.productType === 'simple') {
      return res.status(400).json({ message: 'Ce produit est déjà un produit simple.' });
    }
    
    // Calculer la quantité totale de toutes les variations
    const totalQuantity = product.variations.reduce(
      (total, variation) => total + (variation.quantite || 0), 0
    );
    
    // Convertir le produit
    product.productType = 'simple';
    product.quantite = totalQuantity;
    
    // Conserver les images du produit principal
    
    // Supprimer les champs liés aux variations
    product.variations = [];
    product.availableAttributes = { colors: [], sizes: [] };
    
    await product.save();
    
    res.json({
      message: 'Produit converti en produit simple avec succès',
      product
    });
  } catch (error) {
    logger.error('Erreur lors de la conversion du produit:', error);
    res.status(400).json({
      message: 'Une erreur est survenue lors de la conversion du produit.',
      error: error.message
    });
  }
});

module.exports = router;