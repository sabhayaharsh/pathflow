const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const multer = require('multer');
const path = require('path');
const heicConvert = require('heic-convert');

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = ({ validMimeTypes, fieldNames }) => {
  return fieldNames.map((fieldName) => {
    return multer({
      storage: multer.memoryStorage(), // Store file in memory for processing
      fileFilter: async (req, file, cb) => {
        let { mimetype, originalname } = file;
        const extension = path.extname(originalname).toLowerCase();

        // Convert HEIC to JPEG before proceeding
        if (extension === '.heic' || mimetype === 'application/octet-stream') {
          mimetype = 'image/jpeg'; // Override MIME type after conversion
        }

        // Validate MIME type after potential conversion
        if (validMimeTypes.includes(mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type! Only JPG, JPEG,HEIC, and PNG are allowed.'), false);
        }
      },
      limits: { fileSize: 1024 * 1024 * 5 }, // 5 MB limit
    }).single(fieldName);
  }).map((uploadMiddleware) => {
    return async (req, res, next) => {
      uploadMiddleware(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return next(new Error("No file uploaded"));

        let { buffer, originalname, mimetype } = req.file;
        let extension = path.extname(originalname).toLowerCase();
        let fileName = `${Date.now()}-${originalname}`;

        // Convert HEIC to JPEG if needed
        if (extension === '.heic' || mimetype === 'application/octet-stream') {
          try {
            buffer = await heicConvert({
              buffer,
              format: 'JPEG',
              quality: 1,
            });
            fileName = fileName.replace('.heic', '.jpeg');
            mimetype = 'image/jpeg';
          } catch (conversionErr) {
            console.error("HEIC conversion error:", conversionErr);
            return next(new Error('HEIC conversion failed'));
          }
        }

        // Upload file to S3
        try {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.BUCKET_NAME,
              Key: fileName,
              Body: buffer,
              ContentType: mimetype,
            })
          );

          req.uploadedFile = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
          next();
        } catch (uploadErr) {
          next(uploadErr);
        }
      });
    };
  });
};

module.exports = uploadToS3;
