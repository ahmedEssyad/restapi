const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Récupérer toutes les notifications de l'utilisateur connecté
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, read } = req.query;
    const query = { recipient: req.adminId };
    
    // Filtrer par statut de lecture si spécifié
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.adminId, 
      read: false 
    });
    
    res.json({
      success: true,
      data: notifications,
      total,
      unreadCount
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications',
      error: error.message
    });
  }
});

// Marquer une notification comme lue
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.adminId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la notification',
      error: error.message
    });
  }
});

// Marquer toutes les notifications comme lues
router.patch('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.adminId, read: false },
      { $set: { read: true } }
    );
    
    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des notifications',
      error: error.message
    });
  }
});

// Supprimer une notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      recipient: req.adminId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la notification',
      error: error.message
    });
  }
});

// Créer une notification (pour les tests ou usage interne)
router.post('/', auth, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est un superAdmin
    if (req.adminRole !== 'superAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul un super administrateur peut créer des notifications manuellement.'
      });
    }
    
    const { recipient, message, type, link, entity, entityId } = req.body;
    
    const notification = new Notification({
      recipient,
      message,
      type,
      link,
      entity,
      entityId
    });
    
    await notification.save();
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la notification',
      error: error.message
    });
  }
});

module.exports = router;
