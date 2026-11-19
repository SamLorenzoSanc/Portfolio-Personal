const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdfFile' && file.mimetype === 'application/pdf') {
    cb(null, true);
  } else if (file.fieldname === 'coverImage' && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Formato de archivo no válido para el campo ${file.fieldname}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB máximo
});

module.exports = upload.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);