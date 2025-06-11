// middleware/cache.js - Système de cache Redis
const redis = require('redis');
const client = redis.createClient();

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Intercepter la réponse
      const originalSend = res.send;
      res.send = function(data) {
        // Mettre en cache
        client.setex(key, duration, data);
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

module.exports = { cacheMiddleware };
