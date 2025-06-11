const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

const isAdmin = (req, res, next) => {
  // Vérifier si l'utilisateur a un rôle administrateur valide
  const validAdminRoles = ['superAdmin', 'admin', 'orderManager', 'contentEditor'];
  
  if (!req.adminRole || !validAdminRoles.includes(req.adminRole)) {
    return res.status(403).json({ 
      message: 'Accès non autorisé',
      role: req.adminRole 
    });
  }
  
  next();
};

module.exports = { authMiddleware, isAdmin };