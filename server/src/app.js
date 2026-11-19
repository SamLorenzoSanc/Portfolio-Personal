const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de verificación (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API del Portfolio Académico operativa',
    timestamp: new Date().toISOString()
  });
});

// Ruta de la API (Rutas)
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.originalUrl}` });
});

module.exports = app;