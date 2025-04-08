const Admin = require('../models/Admin');

// Middleware de vérification des permissions
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const adminId = req.adminId;
      if (!adminId) {
        return res.status(401).json({ message: 'Authentification requise' });
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(401).json({ message: 'Administrateur introuvable' });
      }

      // Vérifier si l'administrateur est actif
      if (!admin.active) {
        return res.status(403).json({ message: 'Votre compte est désactivé' });
      }

      // Pour les super admins, autoriser tout
      if (admin.role === 'superAdmin') {
        req.adminRole = admin.role;
        req.adminPermissions = admin.permissions;
        return next();
      }

      // Vérifier les permissions spécifiques
      if (!admin.permissions || 
          !admin.permissions[resource] || 
          !admin.permissions[resource][action]) {
        return res.status(403).json({ 
          message: 'Vous n\'avez pas les permissions nécessaires pour cette action' 
        });
      }

      // Mettre à jour les informations du rôle pour les utiliser dans les contrôleurs
      req.adminRole = admin.role;
      req.adminPermissions = admin.permissions;
      req.adminId = admin._id;
      next();
    } catch (error) {
      console.error('Erreur de vérification des permissions:', error);
      return res.status(500).json({ message: 'Erreur lors de la vérification des permissions' });
    }
  };
};

// Middleware pour filtrer les données selon le rôle de l'utilisateur
const filterDataByRole = () => {
  return (req, res, next) => {
    // Stocker la fonction d'envoi originale
    const originalSend = res.send;
    
    res.send = function(data) {
      // Si le résultat est un JSON et que l'utilisateur n'est pas superAdmin
      if (req.adminRole && req.adminRole !== 'superAdmin' && typeof data === 'string') {
        try {
          let jsonData = JSON.parse(data);
          
          // Appliquer le filtrage selon le rôle
          if (Array.isArray(jsonData)) {
            // Pour les tableaux de résultats
            if (req.adminRole === 'productManager') {
              // Le responsable produit ne voit que ses produits
              // (Pas de filtrage spécial pour l'instant car tous les produits doivent être visibles)
            } else if (req.adminRole === 'orderManager') {
              // Le responsable commande ne voit que les commandes
              // (Pas de filtrage spécial pour l'instant car toutes les commandes doivent être visibles)
            } else if (req.adminRole === 'contentEditor') {
              // L'éditeur de contenu voit les catégories et contenus éditoriaux
              // (Pas de filtrage spécial pour l'instant car tout le contenu éditorial doit être visible)
            }
          } else if (jsonData && typeof jsonData === 'object') {
            // Pour les objets simples
            if (req.adminRole === 'productManager') {
              // Logique de filtrage pour les responsables produit
            } else if (req.adminRole === 'orderManager') {
              // Logique de filtrage pour les responsables commande
            } else if (req.adminRole === 'contentEditor') {
              // Logique de filtrage pour les éditeurs
            }
          }
          
          // Renvoyer les données filtrées
          return originalSend.call(this, JSON.stringify(jsonData));
        } catch (e) {
          // Si ce n'est pas un JSON valide, renvoyer les données originales
          return originalSend.call(this, data);
        }
      }
      
      // Si aucun filtrage n'est nécessaire, renvoyer les données originales
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = { checkPermission, filterDataByRole };