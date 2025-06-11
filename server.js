const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const logger = require('./services/logger');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const companyRoutes = require('./routes/companies');
const subcategoryRoutes = require('./routes/subcategories');
const statsRoutes = require('./routes/stats');
const orderRoutes = require('./routes/orders');
const homeRoutes = require('./routes/home');
const uploadsRoutes = require('./routes/uploads');
const notificationsRoutes = require('./routes/notifications');
const docsRouter = require('./docs');

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', 
      'https://ahmedessyad.github.io'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Configurer le middleware pour parser le JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Utiliser le router uploads au lieu du static middleware simple
// pour permettre l'optimisation des images à la volée
app.use('/uploads', uploadsRoutes);

// Connecter à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  retryWrites: true,
})
.then(() => {
  logger.database('MongoDB connecté avec succès');
})
.catch((err) => {
  logger.error("Erreur de connexion MongoDB:", { error: err.message });
  process.exit(1);
});

// Configurer les routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/notifications', notificationsRoutes);

// Route pour la documentation API
app.use('/api-docs', docsRouter);

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  logger.error('Erreur système:', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method 
  });
  res.status(500).json({ message: 'Une erreur est survenue dans le système' });
});

// Définir le port et démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`, { port: PORT, env: process.env.NODE_ENV });
});
