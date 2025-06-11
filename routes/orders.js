const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');


// Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    const { customer, shippingAddress, items } = req.body;
    
    // Vérifier les données obligatoires
    if (!customer || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Données de commande invalides ou incomplètes'
      });
    }
    
    let totalAmount = 0;
    const orderItems = [];
    
    // Traiter chaque élément du panier
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          message: `Produit non trouvé: ${item.product}` 
        });
      }
      
      let price = product.discountedPrice || product.oldPrice;
      let itemTotal = 0;
      let isStockAvailable = false;
      let variationData = null;
      
      // Gérer différemment selon le type de produit
      if (product.productType === 'simple') {
        // Produit simple - vérifier le stock général
        if (product.quantite < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: `Stock insuffisant pour ${product.nom}. Disponible: ${product.quantite}` 
          });
        }
        
        isStockAvailable = true;
        itemTotal = price * item.quantity;
        
      } else if (product.productType === 'variable') {
        // Produit variable - vérifier la variation spécifique
        if (!item.variationId && (!item.variation || !item.variation.color || !item.variation.size)) {
          return res.status(400).json({
            success: false,
            message: `Veuillez spécifier une variation (couleur/taille) pour le produit ${product.nom}`
          });
        }
        
        // Rechercher la variation soit par ID soit par attributs
        let variation = null;
        
        if (item.variationId) {
          variation = product.variations.find(v => v._id.toString() === item.variationId);
        } else {
          variation = product.variations.find(v => 
            v.attributes.color === item.variation.color && 
            v.attributes.size === item.variation.size
          );
        }
        
        if (!variation) {
          return res.status(404).json({
            success: false,
            message: `Variation non trouvée pour ${product.nom}`
          });
        }
        
        // Vérifier le stock pour cette variation
        if (variation.quantite < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuffisant pour ${product.nom} (${variation.attributes.color || ''}, ${variation.attributes.size || ''}). Disponible: ${variation.quantite}`
          });
        }
        
        isStockAvailable = true;
        
        // Utiliser le prix spécifique à la variation s'il existe
        if (variation.price) {
          price = variation.price;
        }
        
        itemTotal = price * item.quantity;
        variationData = {
          variationId: variation._id,
          variation: {
            color: variation.attributes.color,
            size: variation.attributes.size
          },
          sku: variation.sku,
          mainPicture: variation.mainPicture || product.mainPicture
        };
      }
      
      // Ajouter l'élément à la commande
      const orderItem = {
        product: product._id,
        productName: product.nom,
        quantity: item.quantity,
        price: price,
        totalPrice: itemTotal,
        mainPicture: product.mainPicture
      };
      
      // Ajouter les informations de variation si disponibles
      if (variationData) {
        orderItem.variationId = variationData.variationId;
        orderItem.variation = variationData.variation;
        orderItem.sku = variationData.sku;
        orderItem.mainPicture = variationData.mainPicture;
      }
      
      orderItems.push(orderItem);
      totalAmount += itemTotal;
    }
    
    const order = new Order({
      customer,
      shippingAddress,
      items: orderItems,
      totalAmount,
      paymentMethod: 'paiement à la livraison',
      statusHistory: [{ status: 'en attente', date: new Date() }]
    });
    
    await order.save();
    
    // Mettre à jour les stocks
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (product.productType === 'simple') {
        // Mettre à jour le stock du produit simple
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantite: -item.quantity } }
        );
      } else if (product.productType === 'variable') {
        // Mettre à jour le stock de la variation spécifique
        const variationId = item.variationId || 
          product.variations.find(v => 
            v.attributes.color === item.variation.color && 
            v.attributes.size === item.variation.size
          )?._id;
        
        if (variationId) {
          await Product.updateOne(
            { 
              _id: item.product,
              'variations._id': variationId
            },
            {
              $inc: { 'variations.$.quantite': -item.quantity }
            }
          );
        }
      }
    }
    
    res.status(201).json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande',
      error: error.message
    });
  }
});

// Obtenir toutes les commandes (admin)
router.get('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Vérifier explicitement le rôle et les permissions
    if (!req.adminRole) {
      return res.status(401).json({
        success: false,
        message: 'Rôle administrateur non défini'
      });
    }

    // Cette vérification est maintenant redondante car déjà gérée par le middleware isAdmin
    // mais nous la gardons pour plus de clarté et cohérence
    if (req.adminRole === 'productManager') {
      return res.status(403).json({
        success: false,
        message: 'Les responsables produits n\'ont pas accès aux commandes'
      });
    }
    
    const { status, startDate, endDate } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Vérifier si le modèle Order est correctement défini
    if (!Order || typeof Order.find !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Erreur de configuration du modèle Order'
      });
    }
    
    // Filtrer les commandes en fonction du rôle de l'administrateur
    let orders;
    try {
      if (req.adminRole === 'orderManager' || req.adminRole === 'superAdmin' || req.adminRole === 'admin') {
        // Le responsable des commandes, superAdmin et admin voient toutes les commandes
        orders = await Order.find(query)
          .sort({ createdAt: -1 })  // Tri explicite par date décroissante
          .populate('items.product', 'nom mainPicture')
          .lean();  // Optimisation performance
      } else if (req.adminRole === 'contentEditor') {
        // L'éditeur de contenu a un accès limité aux commandes
        orders = await Order.find(query)
          .select('orderNumber status createdAt totalAmount customer')
          .sort({ createdAt: -1 })
          .lean();
      } else {
        // Pour les autres rôles non spécifiés mais autorisés par le middleware
        orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .populate('items.product', 'nom mainPicture')
          .lean();
      }
      
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (dbError) {
      console.error('Erreur spécifique de MongoDB:', dbError);
      throw dbError; // rethrow pour être capturé par le catch général
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message
    });
  }
});

// Obtenir une commande par ID
router.get('/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id)
        .populate('items.product', 'nom mainPicture');
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Commande non trouvée'
        });
      }
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la commande:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la commande',
        error: error.message
      });
    }
  });
  

// Mettre à jour le statut d'une commande (admin)
router.patch('/:id/status', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { status, comment } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    await order.updateStatus(status, comment);
    
    res.status(200).json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
});

module.exports = router;