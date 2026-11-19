const mongoose = require('mongoose');
const AcademicItem = require('./AcademicItem');

const ReportSchema = new mongoose.Schema({
  pdfFile: {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    fileSizeKB: Number
  },
  abstract: { type: String },
  grade: { type: Number, min: 0, max: 10 }
});

module.exports = AcademicItem.discriminator('Report', ReportSchema);