const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock de Cloudinary antes de importar app para evitar subidas reales durante los tests
jest.mock('../src/config/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/raw/upload/v1/academic-portfolio/reports/test-doc.pdf',
    public_id: 'academic-portfolio/reports/test-doc'
  }),
  cloudinary: {
    uploader: {
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}));

const app = require('../src/app');
const User = require('../src/models/User');
const AcademicItem = require('../src/models/AcademicItem');
const { uploadToCloudinary, cloudinary } = require('../src/config/cloudinary');

let adminToken;
let createdProjectId;
let createdProjectSlug;
let createdReportId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    driverInfo: { name: 'MongooseTest', version: '1.0.0' }
  });

  // Limpiar colecciones de prueba
  await User.deleteMany({});
  await AcademicItem.deleteMany({});

  // Crear admin de prueba y generar su JWT
  const admin = await User.create({
    name: 'Admin Test',
    email: 'admin@test.com',
    password: 'Password123!'
  });

  adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await AcademicItem.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('API Entregas Académicas (Discriminadores, CRUD, PDFs y Filtros)', () => {

  // =========================================================================
  // US-03: CREACIÓN Y SEGURIDAD (RUTAS PROTEGIDAS)
  // =========================================================================

  test('POST /api/items debe bloquear peticiones sin token JWT (401)', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({ title: 'Intento no autorizado', itemType: 'Project' });

    expect(res.statusCode).toBe(401);
  });

  test('POST /api/items debe rechazar un itemType no válido (400)', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Tipo inválido',
        description: 'Descripción de prueba',
        academicStage: 'Grado',
        subject: 'Ingeniería del Software',
        academicYear: '2025-2026',
        itemType: 'InvalidType'
      });

    expect(res.statusCode).toBe(400);
  });

  test('POST /api/items debe crear un Project con sus campos específicos y generar slug (201)', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemType: 'Project',
        title: 'Sistema de Gestión Hospitalaria',
        description: 'Aplicación web full-stack con arquitectura REST.',
        academicStage: 'Grado',
        subject: 'Desarrollo Web',
        academicYear: '2025-2026',
        tags: ['React', 'Node.js', 'MongoDB'],
        featured: true,
        repoUrl: 'https://github.com/SamLorenzoSanc/hospital-app',
        techStack: ['React', 'Express', 'MongoDB'],
        methodology: 'Scrum'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.itemType).toBe('Project');
    expect(res.body.data.repoUrl).toBe('https://github.com/SamLorenzoSanc/hospital-app');
    expect(res.body.data.slug).toMatch(/^sistema-de-gestion-hospitalaria-/);

    createdProjectId = res.body.data._id;
    createdProjectSlug = res.body.data.slug;
  });

  test('POST /api/items debe crear un Report adjuntando un archivo PDF (201)', async () => {
    const fakePdfBuffer = Buffer.from('%PDF-1.4 Contenido simulado del informe académico');

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('itemType', 'Report')
      .field('title', 'Memoria Técnica de Redes Neuronales')
      .field('description', 'Análisis comparativo de arquitecturas CNN.')
      .field('academicStage', 'Máster')
      .field('subject', 'Aprendizaje Profundo')
      .field('academicYear', '2025-2026')
      .field('tags', 'IA, Python, Deep Learning')
      .field('grade', '9.5')
      .attach('pdfFile', fakePdfBuffer, {
        filename: 'memoria-redes.pdf',
        contentType: 'application/pdf'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.itemType).toBe('Report');
    expect(res.body.data.grade).toBe(9.5);
    expect(res.body.data.pdfFile.url).toContain('test-doc.pdf');
    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);

    createdReportId = res.body.data._id;
  });

  test('POST /api/items debe crear un Exercise y un StudyPlan correctamente (201)', async () => {
    const exerciseRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemType: 'Exercise',
        title: 'Algoritmo de Dijkstra en C++',
        description: 'Implementación óptima con cola de prioridad.',
        academicStage: 'Grado',
        subject: 'Estructuras de Datos',
        academicYear: '2024-2025',
        tags: ['C++', 'Grafos'],
        programmingLanguage: 'C++',
        problemStatement: 'Calcular el camino mínimo en un grafo dirigido ponderado.',
        difficulty: 'Avanzado'
      });

    expect(exerciseRes.statusCode).toBe(201);
    expect(exerciseRes.body.data.itemType).toBe('Exercise');

    const studyPlanRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemType: 'StudyPlan',
        title: 'Plan de Estudios: Sistemas Distribuidos',
        description: 'Temario completo y competencias adquiridas.',
        academicStage: 'Grado',
        subject: 'Sistemas Distribuidos',
        academicYear: '2025-2026',
        tags: ['Arquitectura', 'Microservicios'],
        creditsECTS: 6,
        modules: [
          { unitNumber: 1, title: 'Consenso y Tolerancia a Fallos', topics: ['Raft', 'Paxos'] }
        ]
      });

    expect(studyPlanRes.statusCode).toBe(201);
    expect(studyPlanRes.body.data.itemType).toBe('StudyPlan');
    expect(studyPlanRes.body.data.creditsECTS).toBe(6);
  });

  // =========================================================================
  // US-04: CONSULTAS Y FILTROS PÚBLICOS (SIN AUTENTICACIÓN)
  // =========================================================================

  test('GET /api/items debe devolver las 4 entregas sin requerir token (200)', async () => {
    const res = await request(app).get('/api/items');

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(4);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/items debe filtrar por itemType, academicStage y tag', async () => {
    const byType = await request(app).get('/api/items?itemType=Project');
    expect(byType.statusCode).toBe(200);
    expect(byType.body.count).toBe(1);
    expect(byType.body.data[0].title).toBe('Sistema de Gestión Hospitalaria');

    const byStage = await request(app).get('/api/items?academicStage=Máster');
    expect(byStage.statusCode).toBe(200);
    expect(byStage.body.count).toBe(1);
    expect(byStage.body.data[0].itemType).toBe('Report');

    const byTag = await request(app).get('/api/items?tag=react');
    expect(byTag.statusCode).toBe(200);
    expect(byTag.body.count).toBe(1);
  });

  test('GET /api/items/:idOrSlug debe obtener el detalle tanto por ID como por Slug', async () => {
    const resById = await request(app).get(`/api/items/${createdProjectId}`);
    expect(resById.statusCode).toBe(200);
    expect(resById.body.data._id).toBe(createdProjectId);

    const resBySlug = await request(app).get(`/api/items/${createdProjectSlug}`);
    expect(resBySlug.statusCode).toBe(200);
    expect(resBySlug.body.data.slug).toBe(createdProjectSlug);

    const resNotFound = await request(app).get('/api/items/slug-inexistente-123');
    expect(resNotFound.statusCode).toBe(404);
  });

  // =========================================================================
  // US-03: ACTUALIZACIÓN Y BORRADO CON LIMPIEZA EN CLOUDINARY
  // =========================================================================

  test('PUT /api/items/:id debe actualizar campos sin permitir cambiar itemType (200)', async () => {
    const res = await request(app)
      .put(`/api/items/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Sistema Hospitalario v2',
        itemType: 'Exercise' // Intento de mutar discriminador (debe ignorarse)
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Sistema Hospitalario v2');
    expect(res.body.data.itemType).toBe('Project');
  });

  test('DELETE /api/items/:id debe eliminar el informe y borrar su PDF en Cloudinary (200)', async () => {
    const res = await request(app)
      .delete(`/api/items/${createdReportId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      'academic-portfolio/reports/test-doc',
      { resource_type: 'raw' }
    );

    const checkDeleted = await request(app).get(`/api/items/${createdReportId}`);
    expect(checkDeleted.statusCode).toBe(404);
  });
});