#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script de maintenance pour nettoyer les fichiers temporaires et inutiles
 */

function cleanupProject() {
  console.log('🧹 Nettoyage du projet en cours...\n');
  
  const basePath = process.cwd();
  let cleanedFiles = 0;
  let skippedFiles = 0;
  
  // Fichiers temporaires à supprimer
  const tempPatterns = [
    '*.tmp',
    '*.temp',
    '*.bak',
    '*.old',
    '.DS_Store',
    'Thumbs.db',
    '*.log.old'
  ];
  
  // Dossiers à nettoyer
  const tempDirectories = [
    'tmp',
    '.tmp',
    'temp'
  ];
  
  // Nettoyer les logs anciens (plus de 7 jours)
  const logsDir = path.join(basePath, 'logs');
  if (fs.existsSync(logsDir)) {
    console.log('📁 Nettoyage des anciens logs...');
    const files = fs.readdirSync(logsDir);
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < sevenDaysAgo && file.endsWith('.log')) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Supprimé: logs/${file}`);
          cleanedFiles++;
        } catch (error) {
          console.log(`⚠️  Impossible de supprimer: logs/${file}`);
          skippedFiles++;
        }
      }
    });
  }
  
  // Nettoyer le dossier uploads des fichiers temporaires
  const uploadsDir = path.join(basePath, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    console.log('📁 Nettoyage des uploads temporaires...');
    const files = fs.readdirSync(uploadsDir);
    
    files.forEach(file => {
      if (tempPatterns.some(pattern => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(file);
      })) {
        try {
          const filePath = path.join(uploadsDir, file);
          fs.unlinkSync(filePath);
          console.log(`✅ Supprimé: uploads/${file}`);
          cleanedFiles++;
        } catch (error) {
          console.log(`⚠️  Impossible de supprimer: uploads/${file}`);
          skippedFiles++;
        }
      }
    });
  }
  
  // Afficher le résumé
  console.log('\n📊 Résumé du nettoyage:');
  console.log(`✅ Fichiers supprimés: ${cleanedFiles}`);
  console.log(`⚠️  Fichiers ignorés: ${skippedFiles}`);
  
  if (cleanedFiles > 0) {
    console.log('\n🎉 Nettoyage terminé avec succès !');
  } else {
    console.log('\n✨ Projet déjà propre !');
  }
}

// Fonction pour vérifier l'espace disque utilisé
function checkDiskUsage() {
  console.log('\n📊 Analyse de l\'espace disque...');
  
  const directories = ['logs', 'uploads', 'node_modules'];
  
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        const size = getDirSize(dirPath);
        console.log(`📁 ${dir}: ${formatBytes(size)}`);
      } catch (error) {
        console.log(`📁 ${dir}: Erreur de lecture`);
      }
    }
  });
}

function getDirSize(dirPath) {
  let totalSize = 0;
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      totalSize += getDirSize(itemPath);
    } else {
      totalSize += stats.size;
    }
  });
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--size')) {
    checkDiskUsage();
  } else {
    cleanupProject();
    if (args.includes('--analyze')) {
      checkDiskUsage();
    }
  }
}

module.exports = { cleanupProject, checkDiskUsage };
