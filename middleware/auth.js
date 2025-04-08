const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
  try {
    // Vérifier si le header Authorization est présent
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Rechercher l'administrateur dans la base de données pour obtenir son rôle actuel
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Administrateur non trouvé' });
    }

    // Vérifier si le compte est actif
    if (!admin.active) {
      return res.status(403).json({ message: 'Votre compte a été désactivé' });
    }

    // Mettre à jour la date de dernière connexion
    await Admin.findByIdAndUpdate(decoded.id, { lastLogin: new Date() });

    // Ajouter les informations de l'administrateur à la requête
    req.adminId = decoded.id;
    req.adminRole = admin.role;
    req.adminPermissions = admin.permissions;
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter' });
    }
    return res.status(500).json({ message: 'Erreur lors de l\'authentification' });
  }
};