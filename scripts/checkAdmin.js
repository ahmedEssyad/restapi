const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connexion MongoDB réussie');

    const admin = await Admin.findOne({ username: 'admin' });
    console.log('Admin trouvé:', admin);

    await mongoose.connection.close();
    console.log('Connexion MongoDB fermée');
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit();
  }
}

checkAdmin();