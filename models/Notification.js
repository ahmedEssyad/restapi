const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  link: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  entity: {
    type: String,
    enum: ['product', 'order', 'category', 'subcategory', 'company', 'admin', 'system'],
    default: 'system'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  }
}, { 
  timestamps: true 
});

// Méthode pour marquer comme lu
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

// Index pour améliorer les performances des requêtes
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
