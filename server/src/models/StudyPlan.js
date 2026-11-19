const mongoose = require('mongoose');
const AcademicItem = require('./AcademicItem');

const StudyPlanSchema = new mongoose.Schema({
  creditsECTS: { type: Number },
  syllabusPdfUrl: { type: String },
  modules: [{
    unitNumber: Number,
    title: String,
    topics: [String],
    completed: { type: Boolean, default: true }
  }],
  keyCompetencies: [String]
});

module.exports = AcademicItem.discriminator('StudyPlan', StudyPlanSchema);