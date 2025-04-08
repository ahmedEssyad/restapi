const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['superAdmin', 'productManager', 'orderManager', 'contentEditor'],
    default: 'contentEditor'
  },
  permissions: {
    products: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    categories: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    orders: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    companies: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    admins: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  lastLogin: {
    type: Date
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Méthode statique pour définir les permissions en fonction du rôle
adminSchema.statics.setDefaultPermissions = function(role) {
  const permissions = {
    products: { create: false, read: true, update: false, delete: false },
    categories: { create: false, read: true, update: false, delete: false },
    orders: { create: false, read: true, update: false, delete: false },
    companies: { create: false, read: true, update: false, delete: false },
    admins: { create: false, read: false, update: false, delete: false }
  };

  switch (role) {
    case 'superAdmin':
      // Accès complet à tout
      Object.keys(permissions).forEach(resource => {
        Object.keys(permissions[resource]).forEach(action => {
          permissions[resource][action] = true;
        });
      });
      break;
    case 'productManager':
      // Gestion complète des produits
      permissions.products = { create: true, read: true, update: true, delete: true };
      permissions.categories.read = true;
      permissions.companies.read = true;
      break;
    case 'orderManager':
      // Gestion complète des commandes
      permissions.orders = { create: true, read: true, update: true, delete: true };
      permissions.products.read = true;
      break;
    case 'contentEditor':
      // Édition des catégories et descriptions
      permissions.categories = { create: true, read: true, update: true, delete: false };
      permissions.companies = { create: true, read: true, update: true, delete: false };
      permissions.products.read = true;
      permissions.products.update = true;
      break;
  }

  return permissions;
};

// Middleware pre-validate pour s'assurer que les permissions sont définies
adminSchema.pre('validate', function(next) {
  if (this.isNew || this.isModified('role')) {
    this.permissions = this.constructor.setDefaultPermissions(this.role);
  }
  next();
});

module.exports = mongoose.model('Admin', adminSchema);