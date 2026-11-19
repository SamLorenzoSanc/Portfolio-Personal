const mongoose = require('mongoose');
const AcademicItem = require('./AcademicItem');

const ProjectSchema = new mongoose.Schema({
  repoUrl: { type: String, required: true },
  liveDemoUrl: { type: String },
  techStack: [{ type: String, required: true }],
  methodology: { type: String, default: 'Scrum' },
  gallery: [{ url: String, caption: String }]
});

module.exports = AcademicItem.discriminator('Project', ProjectSchema);