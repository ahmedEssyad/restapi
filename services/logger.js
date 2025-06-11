const winston = require('winston');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration des formats de log
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Configuration des transports
const transports = [
  // Fichier pour les erreurs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat
  }),
  
  // Fichier pour tous les logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: logFormat
  })
];

// En développement, ajouter la console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'rest-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  // Ne pas quitter sur les erreurs non capturées
  exitOnError: false
});

// Capturer les erreurs non gérées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Méthodes utilitaires
logger.database = (message, meta = {}) => {
  logger.info(message, { category: 'database', ...meta });
};

logger.auth = (message, meta = {}) => {
  logger.info(message, { category: 'auth', ...meta });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { category: 'api', ...meta });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { category: 'performance', ...meta });
};

module.exports = logger;
