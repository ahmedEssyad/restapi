const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    // Génération automatique d'un numéro de commande au format ORD-YYYYMMDD-XXXX
    default: () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000);
      return `ORD-${year}${month}${day}-${random}`;
    }
  },
  customer: {
    firstName: {
      type: String,
      required: [true, 'Le prénom est requis']
    },
    lastName: {
      type: String,
      required: [true, 'Le nom est requis']
    },
    
    phone: {
      type: String,
      required: [true, 'Le numéro de téléphone est requis']
    }
  },
  shippingAddress: {
    address: {
      type: String,
      required: [true, 'L\'adresse est requise']
    },
    city: {
      type: String,
      required: [true, 'La ville est requise']
    },
    postalCode: {
      type: String,
      required: [true, 'Le code postal est requis']
    },
    country: {
      type: String,
      default: 'Mauritanie'
    },
    additionalInfo: {
      type: String
    }
  },
  items: [{
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
      min: [1, 'La quantité minimale est 1']
    },
    price: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['en attente', 'confirmée', 'en préparation', 'expédiée', 'livrée', 'payée', 'annulée'],
    default: 'en attente'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['en attente', 'confirmée', 'en préparation', 'expédiée', 'livrée', 'payée', 'annulée']
    },
    date: {
      type: Date,
      default: Date.now
    },
    comment: {
      type: String
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['paiement à la livraison'],
    default: 'paiement à la livraison'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentDate: {
    type: Date
  },
  notes: {
    type: String
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Méthode pour mettre à jour le statut avec historique
orderSchema.methods.updateStatus = function(newStatus, comment = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    date: new Date(),
    comment: comment
  });
  
  // Si le statut est "payée", mettre à jour les champs de paiement
  if (newStatus === 'payée') {
    this.isPaid = true;
    this.paymentDate = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);