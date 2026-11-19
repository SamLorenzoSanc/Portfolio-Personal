const mongoose = require('mongoose');

const baseOptions = {
  discriminatorKey: 'itemType',
  collection: 'academic_items',
  timestamps: true
};

const AcademicItemSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'El título es obligatorio'], trim: true },
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  description: { type: String, required: [true, 'La descripción es obligatoria'] },
  academicStage: {
    type: String,
    enum: ['Ciclo Formativo', 'Grado', 'Máster', 'Personal'],
    required: true
  },
  subject: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  featured: { type: Boolean, default: false },
  coverImage: {
    url: String,
    publicId: String
  }
}, baseOptions);

AcademicItemSchema.index({ title: 'text', description: 'text', tags: 'text', subject: 'text' });

// Genera un slug amigable automáticamente antes de guardar
AcademicItemSchema.pre('save', function () {
  if (this.isModified('title') && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }
});

module.exports = mongoose.model('AcademicItem', AcademicItemSchema);