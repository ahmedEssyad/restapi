const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const logger = require('../services/logger');

// Connexion Admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
    }

    // Vérifier si le compte est actif
    if (!admin.active) {
      return res.status(403).json({ message: 'Votre compte a été désactivé. Veuillez contacter un super administrateur.' });
    }

    // Mettre à jour la date de dernière connexion
    admin.lastLogin = new Date();
    await admin.save();

    // Créer le token d'accès avec une durée de vie plus courte
    const token = jwt.sign(
      { 
        id: admin._id,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Créer un refresh token avec une durée de vie plus longue
    const refreshToken = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET + admin.password.slice(-10), // Utiliser une combo du secret + partie du mot de passe haché
      { expiresIn: '7d' }
    );
    
    // Stocker le refreshToken dans la base de données
    admin.refreshToken = refreshToken;
    await admin.save();

    res.json({
      token,
      refreshToken,
      expiresIn: 60 * 60 * 1000, // 1 heure en millisecondes
      username: admin.username,
      role: admin.role,
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      permissions: admin.permissions
    });
  } catch (error) {
    logger.error('Erreur de connexion:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la connexion.' });
  }
});

// Mise à jour du profil admin
router.post('/update-profile', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, firstName, lastName, email } = req.body;
    
    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin introuvable.' });
    }

    // Vérifier le mot de passe actuel si un nouveau mot de passe est fourni
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
      }
    }

    const updates = {};
    
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.adminId,
      { $set: updates },
      { new: true }
    );

    res.json({
      message: 'Profil mis à jour avec succès.',
      admin: {
        username: updatedAdmin.username,
        firstName: updatedAdmin.firstName,
        lastName: updatedAdmin.lastName,
        email: updatedAdmin.email,
        role: updatedAdmin.role
      }
    });
  } catch (error) {
    logger.error('Erreur de mise à jour du profil:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour du profil.' });
  }
});

// Obtenir le profil de l'administrateur connecté
router.get('/profile', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin introuvable.' });
    }

    res.json(admin);
  } catch (error) {
    logger.error('Erreur de récupération du profil:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération du profil.' });
  }
});

// Routes pour gérer les administrateurs (réservées au superAdmin)

// Obtenir tous les administrateurs
router.get('/admins', auth, checkPermission('admins', 'read'), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (error) {
    logger.error('Erreur de récupération des administrateurs:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des administrateurs.' });
  }
});

// Créer un nouvel administrateur
router.post('/admins', auth, checkPermission('admins', 'create'), async (req, res) => {
  try {
    const { username, password, firstName, lastName, email, role } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Ce nom d\'utilisateur existe déjà.' });
    }

    const newAdmin = new Admin({
      username,
      password, // Sera hashé automatiquement par le middleware pre-save
      firstName,
      lastName,
      email,
      role: role || 'contentEditor'
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Administrateur créé avec succès.',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions
      }
    });
  } catch (error) {
    logger.error('Erreur de création d\'administrateur:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la création de l\'administrateur.' });
  }
});

// Mettre à jour un administrateur
router.put('/admins/:id', auth, checkPermission('admins', 'update'), async (req, res) => {
  try {
    const { username, password, firstName, lastName, email, role, active } = req.body;

    // Vérifier si l'administrateur existe
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur introuvable.' });
    }

    // Empêcher de modifier le dernier super administrateur actif
    if (admin.role === 'superAdmin' && active === false) {
      const superAdminCount = await Admin.countDocuments({ role: 'superAdmin', active: true });
      if (superAdminCount <= 1) {
        return res.status(400).json({ 
          message: 'Impossible de désactiver le dernier super administrateur actif.' 
        });
      }
    }

    const updates = {};
    
    if (username !== undefined) updates.username = username;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Administrateur mis à jour avec succès.',
      admin: updatedAdmin
    });
  } catch (error) {
    logger.error('Erreur de mise à jour d\'administrateur:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'administrateur.' });
  }
});

// Supprimer un administrateur
router.delete('/admins/:id', auth, checkPermission('admins', 'delete'), async (req, res) => {
  try {
    // Empêcher l'auto-suppression
    if (req.params.id === req.adminId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur introuvable.' });
    }

    // Empêcher de supprimer le dernier super administrateur
    if (admin.role === 'superAdmin') {
      const superAdminCount = await Admin.countDocuments({ role: 'superAdmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ 
          message: 'Impossible de supprimer le dernier super administrateur.' 
        });
      }
    }

    await Admin.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Administrateur supprimé avec succès.' });
  } catch (error) {
    logger.error('Erreur de suppression d\'administrateur:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de l\'administrateur.' });
  }
});

// Route pour la déconnexion
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Trouver et supprimer le refreshToken en base de données
      await Admin.findOneAndUpdate(
        { refreshToken }, 
        { refreshToken: null }
      );
    }
    
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la déconnexion' });
  }
});

// Route pour rafraîchir le token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token manquant' });
    }
    
    // Trouver l'administrateur avec ce refresh token
    const admin = await Admin.findOne({ refreshToken });
    if (!admin) {
      return res.status(403).json({ message: 'Refresh token invalide' });
    }
    
    try {
      // Vérifier la validité du refresh token avec le secret combiné
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_SECRET + admin.password.slice(-10)
      );
      
      // Créer un nouveau token d'accès
      const newToken = jwt.sign(
        { id: admin._id, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      res.json({
        token: newToken,
        expiresIn: 60 * 60 * 1000 // 1 heure
      });
    } catch (tokenError) {
      logger.error('Erreur de vérification du refresh token:', tokenError);
      
      // Supprimer le refresh token invalide
      admin.refreshToken = null;
      await admin.save();
      
      return res.status(403).json({ message: 'Session expirée, reconnexion nécessaire' });
    }
  } catch (error) {
    logger.error('Erreur lors du rafraîchissement du token:', error);
    res.status(500).json({ message: 'Une erreur est survenue' });
  }
});

// Vérifier l'authentification et récupérer les infos de l'utilisateur
router.get('/verify', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) {
      return res.status(401).json({ isAuthenticated: false });
    }

    res.json({
      isAuthenticated: true,
      admin: {
        id: admin._id,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    logger.error('Erreur de vérification d\'authentification:', error);
    res.status(500).json({ isAuthenticated: false, message: 'Erreur de vérification' });
  }
});

module.exports = router;