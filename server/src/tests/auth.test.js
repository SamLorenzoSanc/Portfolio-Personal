const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;

// Definimos un secreto de prueba para no depender del archivo .env en CI
process.env.JWT_SECRET = 'mqPbIPWMG4PBIB7PhUIFFu1SKu/KhYim8nGp1hlCFEU=';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Creamos un usuario administrador de prueba en memoria
  await User.create({
    name: 'Admin Test',
    email: 'admin@test.com',
    password: 'Password123'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Health & Autenticación JWT', () => {
  let token;

  test('GET /api/health debe responder con estado 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('POST /api/auth/login debe devolver 401 con credenciales incorrectas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  test('POST /api/auth/login debe devolver 200 y un token JWT válido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe('admin@test.com');

    token = res.body.token; // Guardamos el token para la siguiente prueba
  });

  test('GET /api/auth/me debe bloquear el acceso sin token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/auth/me debe permitir el acceso con un token válido (200)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('admin@test.com');
  });
});