const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Admin = require('../models/Admin');
const { v4: uuidv4 } = require('uuid');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Fonction pour générer un mot de passe sécurisé aléatoire
function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Créer un super administrateur
async function createSuperAdmin() {
  try {
    // Connecter à MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
    });
    console.log('MongoDB connecté avec succès');

    // Vérifier si un super administrateur existe déjà
    const existingSuperAdmin = await Admin.findOne({ role: 'superAdmin' });
    if (existingSuperAdmin) {
      console.log('Un super administrateur existe déjà:');
      console.log(`Username: ${existingSuperAdmin.username}`);
      console.log('Si vous avez oublié le mot de passe, utilisez le script resetSuperAdminPassword.js');
      mongoose.disconnect();
      return;
    }

    // Paramètres du super administrateur
    const username = process.argv[2] || 'superadmin';
    let password = process.argv[3];
    
    // Si aucun mot de passe n'est fourni, en générer un
    if (!password) {
      password = generateSecurePassword();
      console.log(`Mot de passe généré: ${password}`);
    }

    // Créer le super administrateur
    const superAdmin = new Admin({
      username,
      password,
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@example.com',
      role: 'superAdmin',
      active: true
    });

    await superAdmin.save();
    console.log(`Super administrateur créé avec succès.`);
    console.log(`Username: ${superAdmin.username}`);
    console.log(`Rôle: ${superAdmin.role}`);
    if (!process.argv[3]) {
      console.log(`Mot de passe: ${password}`);
      console.log(`IMPORTANT: Notez ce mot de passe, il ne sera plus affiché.`);
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Erreur lors de la création du super administrateur:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Exécuter le script
createSuperAdmin();