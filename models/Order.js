const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schéma pour les articles de commande
const orderItemSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  mainPicture: {
    type: String
  },
  variationId: {
    type: mongoose.Schema.Types.ObjectId
  },
  variation: {
    color: String,
    size: String
  },
  sku: String
});

// Schéma pour l'historique des statuts
const statusHistorySchema = new Schema({
  status: {
    type: String,
    required: true,
    enum: ['en attente', 'confirmée', 'en préparation', 'expédiée', 'livrée', 'payée', 'annulée']
  },
  date: {
    type: Date,
    default: Date.now
  },
  comment: {
    type: String
  }
});

// Schéma principal pour les commandes
const orderSchema = new Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  customer: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: String,
    phone: {
      type: String,
      required: true
    }
  },
  shippingAddress: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'Mauritanie'
    },
    additionalInfo: String
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['en attente', 'confirmée', 'en préparation', 'expédiée', 'livrée', 'payée', 'annulée'],
    default: 'en attente'
  },
  statusHistory: [statusHistorySchema],
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['paiement à la livraison', 'carte bancaire', 'autre'],
    default: 'paiement à la livraison'
  },
  paymentDate: Date,
  notes: String
}, { timestamps: true });

// Génération automatique du numéro de commande
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    try {
      // Format: CMD-{ANNÉE}{MOIS}{JOUR}-{NOMBRE INCRÉMENTAL À 4 CHIFFRES}
      const today = new Date();
      const datePrefix = `CMD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      // Trouver toutes les commandes du jour
      const lastOrder = await this.constructor.findOne({
        orderNumber: { $regex: new RegExp(`^${datePrefix}`) }
      }, {}, { sort: { 'orderNumber': -1 } });
      
      // Incrémenter le compteur
      if (lastOrder) {
        const lastNumber = parseInt(lastOrder.orderNumber.split('-').pop(), 10);
        this.orderNumber = `${datePrefix}-${String(lastNumber + 1).padStart(4, '0')}`;
      } else {
        this.orderNumber = `${datePrefix}-0001`;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Méthode pour mettre à jour le statut d'une commande
orderSchema.methods.updateStatus = async function(newStatus, comment) {
  // Vérifier si le nouveau statut est différent du statut actuel
  if (this.status !== newStatus) {
    // Ajouter l'entrée à l'historique
    this.statusHistory.push({
      status: newStatus,
      date: new Date(),
      comment: comment
    });
    
    // Mettre à jour le statut actuel
    this.status = newStatus;
    
    // Mettre à jour le statut de paiement si nécessaire
    if (newStatus === 'payée') {
      this.isPaid = true;
      this.paymentDate = new Date();
    }
    
    // Sauvegarder les modifications
    await this.save();
  }
  
  return this;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;