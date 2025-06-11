const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); 

// Sous-schéma pour les variantes de produit
const variationSchema = new mongoose.Schema({
  attributes: {
    color: { type: String, default: null },
    size: { type: String, default: null },
    // Vous pouvez ajouter d'autres attributs ici
  },
  sku: { type: String, default: () => uuidv4().substring(0, 8).toUpperCase() },
  quantite: { type: Number, default: 0 },
  price: { type: Number, default: null }, // Prix spécifique à cette variante (optionnel)
  pictures: { type: [String], default: [] },
  mainPicture: { type: String, default: null }
}, { _id: true });

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4, 
    unique: true,    
  },
  productType: {
    type: String,
    enum: ['simple', 'variable'],
    default: 'simple',
    required: true
  },
  nom: {
    type: String,
    required: [true, 'Le nom du produit est requis.'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  pictures: {
    type: [String],  // Tableau de chemins d'images
    default: []
  },
  mainPicture: {     // Image principale du produit (pour l'affichage en liste)
    type: String,
  },
  features: {
    type: String,
    trim: true,
  },
  // Pour les produits simples
  quantite: {
    type: Number,
    default: 0
  },
  // Pour les produits variables
  variations: {
    type: [variationSchema],
    default: []
  },
  // Options disponibles pour ce produit
  availableAttributes: {
    colors: [{ type: String }],
    sizes: [{ type: String }]
    // Vous pouvez ajouter d'autres attributs ici
  },
  Company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  categoriesa_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  subcategories_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }],
  oldPrice: {
    type: Number,
    required: [true, 'Le prix original est requis.'],
  },
  discountedPrice: {
    type: Number,
    default: null,
  },
  discountDuration: {
    type: Date,
    default: null,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Calcul du stock total pour les produits variables
productSchema.virtual('totalStock').get(function() {
  if (this.productType === 'simple') {
    return this.quantite || 0;
  } else {
    // Vérifier si variations existe et est un tableau avant d'utiliser reduce
    if (!this.variations || !Array.isArray(this.variations)) {
      return 0;
    }
    return this.variations.reduce((total, variation) => total + (variation.quantite || 0), 0);
  }
});

// Méthode pour vérifier la disponibilité d'une variation spécifique
productSchema.methods.checkVariationAvailability = function(color, size) {
  // Pour les produits simples, vérifier simplement la quantité générale
  if (this.productType === 'simple') {
    return {
      available: (this.quantite || 0) > 0,
      quantity: this.quantite || 0,
      variationId: null
    };
  }
  
  // Vérifier si variations existe et est un tableau
  if (!this.variations || !Array.isArray(this.variations)) {
    return {
      available: false,
      quantity: 0,
      variationId: null,
      error: 'Variations non définies'
    };
  }
  
  // Pour les produits variables, trouver la variation correspondante
  const variation = this.variations.find(v => 
    v.attributes && v.attributes.color === color && v.attributes.size === size
  );
  
  if (!variation) {
    return {
      available: false,
      quantity: 0,
      variationId: null,
      error: 'Variation non disponible'
    };
  }
  
  return {
    available: (variation.quantite || 0) > 0,
    quantity: variation.quantite || 0,
    variationId: variation._id,
    variation: variation
  };
};

// Méthode pour obtenir toutes les variations disponibles
productSchema.methods.getAvailableVariations = function() {
  if (this.productType === 'simple') {
    return [{
      available: (this.quantite || 0) > 0,
      quantity: this.quantite || 0,
      attributes: {}
    }];
  }
  
  // Vérifier si variations existe et est un tableau
  if (!this.variations || !Array.isArray(this.variations)) {
    return [];
  }
  
  return this.variations.map(variation => ({
    variationId: variation._id,
    attributes: variation.attributes || {},
    quantity: variation.quantite || 0,
    available: (variation.quantite || 0) > 0,
    price: variation.price,
    sku: variation.sku,
    mainPicture: variation.mainPicture || this.mainPicture
  }));
};

module.exports = mongoose.model('Product', productSchema);