const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Company = require('../models/Company');
const logger = require('../services/logger');

// Single endpoint for all homepage data to reduce multiple API calls
router.get('/homepage-data', async (req, res) => {
  try {
    const [categories, promotions, products] = await Promise.all([
      Category.find().sort({ name: 1 }).limit(4),
      Product.find({ discountedPrice: { $exists: true, $gt: 0 } })
        .populate('Company_id', 'nom')
        .sort({ discountPercentage: -1 })
        .limit(4),
      Product.find({ $or: [
          { discountedPrice: { $exists: false } },
          { discountedPrice: 0 }
        ]})
        .populate('Company_id', 'nom')
        .sort({ createdAt: -1 })
        .limit(4)
    ]);
    
    res.json({
      categories,
      promotions,
      featuredProducts: products
    });
  } catch (error) {
    logger.error('Error fetching homepage data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all promotions (paginated)
router.get('/promotions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const [promotions, total] = await Promise.all([
      Product.find({ discountedPrice: { $exists: true, $gt: 0 } })
        .populate('Company_id', 'nom')
        .sort({ discountPercentage: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments({ discountedPrice: { $exists: true, $gt: 0 } })
    ]);
    
    res.json({
      promotions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalItems: total
    });
  } catch (error) {
    logger.error('Error fetching promotions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;