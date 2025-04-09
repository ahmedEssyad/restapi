const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');


// Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    const { customer, shippingAddress, items } = req.body;
    
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
    // Vérifier explicitement le rôle - refuser l'accès au responsable produit
    if (req.adminRole === 'productManager') {
      return res.status(403).json({
        success: false,
        message: 'Les responsables produits n\'ont pas accès aux commandes'
      });
    }
    
    const { status, startDate, endDate, sort = '-createdAt' } = req.query;
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
    
    // Filtrer les commandes en fonction du rôle de l'administrateur
    let orders;
    if (req.adminRole === 'orderManager') {
      // Le responsable des commandes voit toutes les commandes
      orders = await Order.find(query)
        .sort(sort)
        .populate('items.product', 'nom mainPicture');
    } else if (req.adminRole === 'contentEditor') {
      // L'éditeur de contenu n'a qu'un accès limité
      orders = await Order.find(query)
        .select('orderNumber status createdAt totalAmount')
        .sort(sort);
    } else {
      // Pour le superAdmin ou autres rôles non spécifiés
      orders = await Order.find(query)
        .sort(sort)
        .populate('items.product', 'nom mainPicture');
    }
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
    
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
router.get('/', authMiddleware, isAdmin, async (req, res) => {
    try {
      const { status, startDate, endDate, sort = '-createdAt' } = req.query;
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
      
      const orders = await Order.find(query)
        .sort(sort)
        .populate('items.product', 'nom mainPicture');
      
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des commandes',
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