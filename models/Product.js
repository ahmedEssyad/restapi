const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); 

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4, 
    unique: true,    
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
  quantite: {
    type: Number,
    default: 0,
    required: [true, 'La quantité du produit est requise.'],
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

module.exports = mongoose.model('Product', productSchema);