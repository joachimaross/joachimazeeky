// File Upload and Processing API Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const database = require('../models/database');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      
      // Video
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/webm',
      
      // Code
      'text/javascript',
      'text/html',
      'text/css',
      'application/json',
      'application/xml'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  }
});

// Document processing
router.post('/process/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const file = req.file;

    // Save file record to database
    const fileRecord = {
      userId: userId,
      filename: file.filename,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      processingStatus: 'processing'
    };

    // Process document based on type
    let processingResult = {};

    if (file.mimetype === 'application/pdf') {
      processingResult = await processPDF(file.path);
    } else if (file.mimetype.includes('word')) {
      processingResult = await processWord(file.path);
    } else if (file.mimetype === 'text/plain') {
      processingResult = await processText(file.path);
    }

    // Update database with processing result
    fileRecord.processingStatus = 'completed';
    fileRecord.processingResult = processingResult;

    // Log file upload event
    await database.logEvent(userId, 'file_upload', {
      fileType: file.mimetype,
      fileSize: file.size,
      processingTime: processingResult.processingTime || 0
    });

    res.json({
      success: true,
      data: {
        fileId: file.filename,
        originalName: file.originalname,
        type: 'document',
        result: processingResult
      }
    });

  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process document'
    });
  }
});

// Image processing
router.post('/process/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const file = req.file;

    // Process image
    const processingResult = await processImage(file.path, file.mimetype);

    await database.logEvent(userId, 'image_upload', {
      fileSize: file.size,
      dimensions: processingResult.dimensions
    });

    res.json({
      success: true,
      data: {
        fileId: file.filename,
        originalName: file.originalname,
        type: 'image',
        result: processingResult
      }
    });

  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image'
    });
  }
});

// Audio processing
router.post('/process/audio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const file = req.file;

    // Process audio
    const processingResult = await processAudio(file.path, file.mimetype);

    await database.logEvent(userId, 'audio_upload', {
      fileSize: file.size,
      duration: processingResult.duration
    });

    res.json({
      success: true,
      data: {
        fileId: file.filename,
        originalName: file.originalname,
        type: 'audio',
        result: processingResult
      }
    });

  } catch (error) {
    console.error('Audio processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process audio'
    });
  }
});

// Video processing
router.post('/process/video', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const file = req.file;

    // Process video
    const processingResult = await processVideo(file.path, file.mimetype);

    await database.logEvent(userId, 'video_upload', {
      fileSize: file.size,
      duration: processingResult.duration
    });

    res.json({
      success: true,
      data: {
        fileId: file.filename,
        originalName: file.originalname,
        type: 'video',
        result: processingResult
      }
    });

  } catch (error) {
    console.error('Video processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process video'
    });
  }
});

// Data processing (CSV, Excel)
router.post('/process/data', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const file = req.file;

    // Process data file
    const processingResult = await processDataFile(file.path, file.mimetype);

    await database.logEvent(userId, 'data_upload', {
      fileSize: file.size,
      rowCount: processingResult.rowCount
    });

    res.json({
      success: true,
      data: {
        fileId: file.filename,
        originalName: file.originalname,
        type: 'data',
        result: processingResult
      }
    });

  } catch (error) {
    console.error('Data processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process data file'
    });
  }
});

// Get file processing status
router.get('/status/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    // Get file status from database
    const fileRecord = await database.getFileRecord(userId, fileId);
    
    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      data: fileRecord
    });

  } catch (error) {
    console.error('File status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file status'
    });
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    // Get file record
    const fileRecord = await database.getFileRecord(userId, fileId);
    
    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete physical file
    try {
      await fs.unlink(fileRecord.filePath);
    } catch (unlinkError) {
      console.warn('Failed to delete physical file:', unlinkError);
    }

    // Delete database record
    await database.deleteFileRecord(userId, fileId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

// Processing functions
async function processPDF(filePath) {
  const startTime = Date.now();
  
  try {
    // Placeholder for PDF processing
    // In production, you'd use libraries like pdf-parse or pdf2pic
    const stats = await fs.stat(filePath);
    
    return {
      type: 'pdf',
      pageCount: Math.ceil(stats.size / 50000), // Rough estimate
      textExtracted: 'PDF text extraction would go here...',
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

async function processWord(filePath) {
  const startTime = Date.now();
  
  try {
    // Placeholder for Word document processing
    // In production, you'd use libraries like mammoth or docx
    const stats = await fs.stat(filePath);
    
    return {
      type: 'word',
      wordCount: Math.ceil(stats.size / 6), // Rough estimate
      textExtracted: 'Word document text extraction would go here...',
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Word processing failed: ${error.message}`);
  }
}

async function processText(filePath) {
  const startTime = Date.now();
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    return {
      type: 'text',
      content: content,
      wordCount: words.length,
      charCount: content.length,
      lineCount: content.split('\n').length,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Text processing failed: ${error.message}`);
  }
}

async function processImage(filePath, mimeType) {
  const startTime = Date.now();
  
  try {
    // Placeholder for image processing
    // In production, you'd use libraries like sharp or jimp
    const stats = await fs.stat(filePath);
    
    return {
      type: 'image',
      format: mimeType.split('/')[1],
      fileSize: stats.size,
      dimensions: {
        width: 1920, // Placeholder
        height: 1080
      },
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

async function processAudio(filePath, mimeType) {
  const startTime = Date.now();
  
  try {
    // Placeholder for audio processing
    // In production, you'd use libraries like fluent-ffmpeg
    const stats = await fs.stat(filePath);
    
    return {
      type: 'audio',
      format: mimeType.split('/')[1],
      fileSize: stats.size,
      duration: Math.ceil(stats.size / 125000), // Rough estimate in seconds
      sampleRate: 44100,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Audio processing failed: ${error.message}`);
  }
}

async function processVideo(filePath, mimeType) {
  const startTime = Date.now();
  
  try {
    // Placeholder for video processing
    // In production, you'd use libraries like fluent-ffmpeg
    const stats = await fs.stat(filePath);
    
    return {
      type: 'video',
      format: mimeType.split('/')[1],
      fileSize: stats.size,
      duration: Math.ceil(stats.size / 1000000), // Rough estimate in seconds
      resolution: {
        width: 1920,
        height: 1080
      },
      frameRate: 30,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Video processing failed: ${error.message}`);
  }
}

async function processDataFile(filePath, mimeType) {
  const startTime = Date.now();
  
  try {
    if (mimeType === 'text/csv') {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0] ? lines[0].split(',') : [];
      
      return {
        type: 'csv',
        rowCount: lines.length - 1,
        columnCount: headers.length,
        headers: headers,
        sample: lines.slice(0, 5), // First 5 rows as sample
        processingTime: Date.now() - startTime
      };
    } else {
      // Excel processing placeholder
      // In production, you'd use libraries like xlsx
      const stats = await fs.stat(filePath);
      
      return {
        type: 'excel',
        rowCount: Math.ceil(stats.size / 100), // Rough estimate
        sheetCount: 1,
        processingTime: Date.now() - startTime
      };
    }
  } catch (error) {
    throw new Error(`Data file processing failed: ${error.message}`);
  }
}

module.exports = router;