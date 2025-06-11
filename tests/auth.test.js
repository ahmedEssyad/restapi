// tests/auth.test.js - Tests d'authentification
const request = require('supertest');
const app = require('../server');
const Admin = require('../models/Admin');

describe('Auth Endpoints', () => {
  let authToken;
  
  beforeEach(async () => {
    // Nettoyer la DB de test
    await Admin.deleteMany({});
    
    // Créer un admin de test
    const admin = new Admin({
      username: 'testadmin',
      password: 'testpassword',
      role: 'superAdmin'
    });
    await admin.save();
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'testpassword'
        });
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('role', 'superAdmin');
      authToken = res.body.token;
    });
    
    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'wrongpassword'
        });
        
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
  
  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      // Connecter d'abord
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'testpassword'
        });
        
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body.isAuthenticated).toBe(true);
    });
  });
});
