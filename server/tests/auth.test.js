const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

beforeAll(async () => {
  console.log("La uri de test es: ", process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI, {
    driverInfo: { name: 'MongooseTest', version: '1.0.0' }
  });

  // Asegura que la colección esté vacía antes de empezar
  await User.deleteMany({});

  await User.create({
    name: 'Admin Test',
    email: 'admin@test.com',
    password: 'Password123!'
  });
});

afterAll(async () => {
  // Limpia los datos de prueba al terminar
  await User.deleteMany({});
  await mongoose.disconnect();
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