const mongoose = require('mongoose');
const AcademicItem = require('../models/AcademicItem');
const Project = require('../models/Project');
const Report = require('../models/Report');
const Exercise = require('../models/Exercise');
const StudyPlan = require('../models/StudyPlan');
const { cloudinary, uploadToCloudinary } = require('../config/cloudinary');

const modelMap = { Project, Report, Exercise, StudyPlan };

// Convierte campos enviados como JSON string o texto separado por comas en FormData
const parseArrayField = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
};

// @desc    Obtener entregas con filtros públicos (US-04)
// @route   GET /api/items
exports.getItems = async (req, res) => {
  try {
    const { academicStage, itemType, tag, featured, search } = req.query;
    const filter = {};

    if (academicStage) filter.academicStage = academicStage;
    if (itemType) filter.itemType = itemType;
    if (tag) filter.tags = { $in: [new RegExp(`^${tag}$`, 'i')] };
    if (featured === 'true') filter.featured = true;
    if (search) filter.$text = { $search: search };

    const items = await AcademicItem.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las entregas', error: error.message });
  }
};

// @desc    Obtener detalle por ID o Slug (US-04)
// @route   GET /api/items/:idOrSlug
exports.getItemByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const item = await AcademicItem.findOne(query);
    if (!item) return res.status(404).json({ message: 'Entrega académica no encontrada' });

    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar el detalle', error: error.message });
  }
};

// @desc    Crear nueva entrega (Proyecto, Informe PDF, Ejercicio o Plan) (US-03)
// @route   POST /api/items
exports.createItem = async (req, res) => {
  try {
    const { itemType } = req.body;
    const TargetModel = modelMap[itemType];

    if (!TargetModel) {
      return res.status(400).json({
        message: 'Tipo de entrega inválido. Usa: Project, Report, Exercise o StudyPlan'
      });
    }

    const payload = { ...req.body };
    if (payload.tags) payload.tags = parseArrayField(payload.tags);
    if (payload.techStack) payload.techStack = parseArrayField(payload.techStack);
    if (payload.keyCompetencies) payload.keyCompetencies = parseArrayField(payload.keyCompetencies);
    if (typeof payload.modules === 'string') payload.modules = JSON.parse(payload.modules);

    // Subir portada si se adjunta
    if (req.files?.coverImage?.[0]) {
      const imgResult = await uploadToCloudinary(req.files.coverImage[0].buffer, 'covers', 'image');
      payload.coverImage = { url: imgResult.secure_url, publicId: imgResult.public_id };
    }

    // Subir PDF si se adjunta (obligatorio para Report)
    if (req.files?.pdfFile?.[0]) {
      const pdfFile = req.files.pdfFile[0];
      const pdfResult = await uploadToCloudinary(pdfFile.buffer, 'reports', 'raw');
      payload.pdfFile = {
        url: pdfResult.secure_url,
        publicId: pdfResult.public_id,
        fileSizeKB: Math.round(pdfFile.size / 1024)
      };
    }

    const newItem = await TargetModel.create(payload);
    res.status(201).json({ message: 'Entrega creada correctamente', data: newItem });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear la entrega', error: error.message });
  }
};

// @desc    Actualizar entrega existente (US-03)
// @route   PUT /api/items/:id
exports.updateItem = async (req, res) => {
  try {
    const item = await AcademicItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Entrega no encontrada' });

    const updates = { ...req.body };
    delete updates.itemType; // Evita cambiar el tipo discriminador tras crearse
    if (updates.tags) updates.tags = parseArrayField(updates.tags);
    if (updates.techStack) updates.techStack = parseArrayField(updates.techStack);

    const updatedItem = await AcademicItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({ message: 'Entrega actualizada', data: updatedItem });
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar la entrega', error: error.message });
  }
};

// @desc    Eliminar entrega y limpiar archivos en Cloudinary (US-03)
// @route   DELETE /api/items/:id
exports.deleteItem = async (req, res) => {
  try {
    const item = await AcademicItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Entrega no encontrada' });

    if (item.coverImage?.publicId) {
      await cloudinary.uploader.destroy(item.coverImage.publicId, { resource_type: 'image' });
    }
    if (item.pdfFile?.publicId) {
      await cloudinary.uploader.destroy(item.pdfFile.publicId, { resource_type: 'raw' });
    }

    await item.deleteOne();
    res.status(200).json({ message: 'Entrega eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la entrega', error: error.message });
  }
};