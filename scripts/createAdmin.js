const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const readline = require('readline');
require('dotenv').config();

// Interface pour les entrées utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Fonction pour générer un mot de passe aléatoire
function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charset.length;
    password += charset[randomIndex];
  }
  
  return password;
}

async function createAdmin() {
  try {
    console.log('Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB réussie');

    // Vérifier si un superAdmin existe déjà
    const existingAdmin = await Admin.findOne({ role: 'superAdmin' });
    
    if (existingAdmin) {
      const confirmDelete = await askQuestion('Un administrateur existe déjà. Voulez-vous le remplacer? (oui/non): ');
      
      if (confirmDelete.toLowerCase() !== 'oui') {
        console.log('Opération annulée.');
        rl.close();
        await mongoose.connection.close();
        return process.exit(0);
      }
      
      // Supprimer uniquement cet administrateur
      await Admin.deleteOne({ _id: existingAdmin._id });
      console.log('Administrateur existant supprimé');
    }

    // Demander des informations ou utiliser des valeurs par défaut
    let username = await askQuestion('Nom d\'utilisateur (admin): ');
    username = username || 'admin';
    
    let password = await askQuestion('Mot de passe (laisser vide pour générer automatiquement): ');
    
    if (!password) {
      password = generateSecurePassword();
      console.log(`Mot de passe généré: ${password}`);
    }
    
    // Création d'un nouvel administrateur avec le rôle superAdmin
    const admin = new Admin({
      username,
      password,
      role: 'superAdmin',
      firstName: 'Super',
      lastName: 'Admin',
      email: await askQuestion('Email: ')
    });

    // Sauvegarder l'administrateur
    await admin.save();

    // Vérifier que l'administrateur a été créé
    const savedAdmin = await Admin.findOne({ username });
    console.log('✅ Super administrateur créé avec succès:');
    console.log({
      username: savedAdmin.username,
      role: savedAdmin.role,
      _id: savedAdmin._id
    });
    console.log(`\nIMPORTANT: Notez bien vos identifiants de connexion.`);

    // Fermer la connexion à la base de données
    rl.close();
    await mongoose.connection.close();
    console.log('Connexion MongoDB fermée');
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    if (rl) rl.close();
    if (mongoose.connection) await mongoose.connection.close();
    process.exit(1);
  }
}

// Exécuter le script
createAdmin();