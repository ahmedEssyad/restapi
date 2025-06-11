const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const logger = require('../services/logger');

/**
 * Service pour la gestion des notifications
 */
class NotificationService {
  /**
   * Crée une notification pour un administrateur spécifique
   * @param {Object} data - Données de la notification
   * @param {string} data.recipientId - ID de l'administrateur destinataire
   * @param {string} data.message - Message de la notification
   * @param {string} data.type - Type de notification (info, warning, error, success)
   * @param {string} data.link - Lien optionnel associé à la notification
   * @param {string} data.entity - Entité concernée (product, order, etc.)
   * @param {string} data.entityId - ID de l'entité concernée
   * @returns {Promise<Object>} La notification créée
   */
  static async createNotification(data) {
    try {
      const notification = new Notification({
        recipient: data.recipientId,
        message: data.message,
        type: data.type || 'info',
        link: data.link || null,
        entity: data.entity || 'system',
        entityId: data.entityId || null
      });
      
      return await notification.save();
    } catch (error) {
      logger.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  }
  
  /**
   * Crée une notification pour tous les administrateurs ayant un rôle spécifique
   * @param {Object} data - Données de la notification
   * @param {string} data.role - Rôle des administrateurs à notifier (superAdmin, productManager, etc.)
   * @param {string} data.message - Message de la notification
   * @param {string} data.type - Type de notification (info, warning, error, success)
   * @param {string} data.link - Lien optionnel associé à la notification
   * @param {string} data.entity - Entité concernée (product, order, etc.)
   * @param {string} data.entityId - ID de l'entité concernée
   * @returns {Promise<Array>} Les notifications créées
   */
  static async notifyByRole(data) {
    try {
      // Trouver tous les administrateurs ayant le rôle spécifié
      const admins = await Admin.find({ role: data.role, active: true });
      
      const notificationPromises = admins.map(admin => 
        this.createNotification({
          recipientId: admin._id,
          message: data.message,
          type: data.type || 'info',
          link: data.link || null,
          entity: data.entity || 'system',
          entityId: data.entityId || null
        })
      );
      
      return await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('Erreur lors de la notification par rôle:', error);
      throw error;
    }
  }
  
  /**
   * Crée une notification pour tous les administrateurs ayant une permission spécifique
   * @param {Object} data - Données de la notification
   * @param {Object} data.permission - Permission requise { resource: 'products', action: 'read' }
   * @param {string} data.message - Message de la notification
   * @param {string} data.type - Type de notification (info, warning, error, success)
   * @param {string} data.link - Lien optionnel associé à la notification
   * @param {string} data.entity - Entité concernée (product, order, etc.)
   * @param {string} data.entityId - ID de l'entité concernée
   * @returns {Promise<Array>} Les notifications créées
   */
  static async notifyByPermission(data) {
    try {
      // Trouver tous les administrateurs ayant la permission spécifiée
      const { resource, action } = data.permission;
      const permissionPath = `permissions.${resource}.${action}`;
      
      const admins = await Admin.find({
        [permissionPath]: true,
        active: true
      });
      
      const notificationPromises = admins.map(admin => 
        this.createNotification({
          recipientId: admin._id,
          message: data.message,
          type: data.type || 'info',
          link: data.link || null,
          entity: data.entity || 'system',
          entityId: data.entityId || null
        })
      );
      
      return await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('Erreur lors de la notification par permission:', error);
      throw error;
    }
  }
  
  /**
   * Récupère le nombre de notifications non lues pour un administrateur
   * @param {string} adminId - ID de l'administrateur
   * @returns {Promise<number>} Le nombre de notifications non lues
   */
  static async getUnreadCount(adminId) {
    try {
      return await Notification.countDocuments({
        recipient: adminId,
        read: false
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération du nombre de notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
