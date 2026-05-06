const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'linkup-clinic-media',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit' }],
  },
});

// Storage for PDFs (raw delivery)
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'linkup-documents',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

const uploadImage = multer({ storage: imageStorage, limits: { fileSize: 15 * 1024 * 1024 } });
const uploadPdf = multer({ storage: pdfStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/uploads/sessions/:id/media — attach image or PDF to a clinic/session
router.post('/sessions/:id/media', protect, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  // Peek at filename to decide handler
  uploadImage.single('file')(req, res, (imgErr) => {
    if (!imgErr && req.file) {
      return handleSessionMedia(req, res, 'image');
    }
    uploadPdf.single('file')(req, res, (pdfErr) => {
      if (pdfErr) return res.status(400).json({ message: 'Upload failed', error: pdfErr.message });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      handleSessionMedia(req, res, 'pdf');
    });
  });
});

async function handleSessionMedia(req, res, fileType) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const entry = {
      url: req.file.path,
      publicId: req.file.filename,
      type: fileType,
      name: req.body.name || req.file.originalname || '',
    };
    session.media.push(entry);
    await session.save();
    res.json({ media: session.media });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// DELETE /api/uploads/sessions/:id/media/:mediaId
router.delete('/sessions/:id/media/:mediaId', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const item = session.media.id(req.params.mediaId);
    if (!item) return res.status(404).json({ message: 'Media not found' });
    if (item.publicId) {
      const resourceType = item.type === 'pdf' ? 'raw' : 'image';
      await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType }).catch(() => {});
    }
    item.deleteOne();
    await session.save();
    res.json({ media: session.media });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/uploads/documents — attach image or PDF to coach profile
router.post('/documents', protect, (req, res) => {
  uploadImage.single('file')(req, res, (imgErr) => {
    if (!imgErr && req.file) return handleDocument(req, res, 'image');
    uploadPdf.single('file')(req, res, (pdfErr) => {
      if (pdfErr) return res.status(400).json({ message: 'Upload failed', error: pdfErr.message });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      handleDocument(req, res, 'pdf');
    });
  });
});

async function handleDocument(req, res, fileType) {
  try {
    const entry = {
      url: req.file.path,
      publicId: req.file.filename,
      type: fileType,
      name: req.body.name || req.file.originalname || '',
    };
    await User.findByIdAndUpdate(req.user._id, { $push: { documents: entry } });
    const user = await User.findById(req.user._id);
    res.json({ documents: user.documents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// DELETE /api/uploads/documents/:docId
router.delete('/documents/:docId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const doc = user.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.publicId) {
      const resourceType = doc.type === 'pdf' ? 'raw' : 'image';
      await cloudinary.uploader.destroy(doc.publicId, { resource_type: resourceType }).catch(() => {});
    }
    doc.deleteOne();
    await user.save();
    res.json({ documents: user.documents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
