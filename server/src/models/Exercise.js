const mongoose = require('mongoose');
const AcademicItem = require('./AcademicItem');

const ExerciseSchema = new mongoose.Schema({
  programmingLanguage: { type: String, required: true },
  problemStatement: { type: String, required: true },
  codeSnippet: { type: String },
  repoFileUrl: { type: String },
  difficulty: {
    type: String,
    enum: ['Básico', 'Intermedio', 'Avanzado'],
    default: 'Intermedio'
  }
});

module.exports = AcademicItem.discriminator('Exercise', ExerciseSchema);