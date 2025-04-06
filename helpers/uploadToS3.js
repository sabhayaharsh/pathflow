const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const heicConvert = require('heic-convert');
// AWS S3 client configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp3', 'video/mp4','video/quicktime','image/heic','application/octet-stream'
// ];
const validMimeTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/heic',
    'application/pdf',
    'application/octet-stream',
    'audio/mpeg',
    'audio/wav',
    'audio/m4a',
    'audio/mp3',
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/ogg',
    'video/x-msvideo', // AVI
    'video/quicktime', // MOV
    'video/x-ms-wmv', // WMV
    'video/x-flv', // FLV
    'video/3gpp', // 3GP
    'video/x-matroska', // MKV
    'video/mpeg' // MPEG
  ];

// const maxFileSize = {
//     'image/png': 20 * 1024 * 1024, // 20 MB
//     'image/jpg': 20 * 1024 * 1024, // 20 MB
//     'image/jpeg': 20 * 1024 * 1024, // 20 MB
//     'application/pdf': 20 * 1024 * 1024, // 20 MB
//     'audio/mpeg': 20 * 1024 * 1024, // 20 MB
//     'audio/wav': 20 * 1024 * 1024, // 20 MB
//     'audio/m4a': 20 * 1024 * 1024, // 20 MB
//     'audio/mp3': 20 * 1024 * 1024, // 20 MB
//     'video/mp4': 50 * 1024 * 1024, // 50 MB
//     'video/quicktime': 50 * 1024 * 1024, // 20 MB
//     'image/heic': 20 * 1024 * 1024, // 20 MB
//     'application/octet-stream': 20 * 1024 * 1024, // 20 MB
// };
const maxFileSize = {
    'image/png': 20 * 1024 * 1024, // 20 MB
    'image/jpg': 20 * 1024 * 1024, // 20 MB
    'image/jpeg': 20 * 1024 * 1024, // 20 MB
    'image/heic': 20 * 1024 * 1024, // 20 MB
    'application/pdf': 20 * 1024 * 1024, // 20 MB
    'application/octet-stream': 20 * 1024 * 1024, // 20 MB
    'audio/mpeg': 20 * 1024 * 1024, // 20 MB
    'audio/wav': 20 * 1024 * 1024, // 20 MB
    'audio/m4a': 20 * 1024 * 1024, // 20 MB
    'audio/mp3': 20 * 1024 * 1024, // 20 MB
    'video/mp4': 50 * 1024 * 1024, // 50 MB
    'video/webm': 50 * 1024 * 1024, // 50 MB
    'video/ogg': 50 * 1024 * 1024, // 50 MB
    'video/x-msvideo': 50 * 1024 * 1024, // 50 MB (AVI)
    'video/quicktime': 50 * 1024 * 1024, // 50 MB (MOV)
    'video/x-ms-wmv': 50 * 1024 * 1024, // 50 MB (WMV)
    'video/x-flv': 50 * 1024 * 1024, // 50 MB (FLV)
    'video/3gpp': 50 * 1024 * 1024, // 50 MB (3GP)
    'video/x-matroska': 50 * 1024 * 1024, // 50 MB (MKV)
    'video/mpeg': 50 * 1024 * 1024, // 50 MB (MPEG)
    'video/avi': 50 * 1024 * 1024 // 50 MB (MPEG)
};

// Multer memory storage configuration for size validation
const storage = multer.memoryStorage();

const uploadToS3 = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        console.log("file",file);
        if (validMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only files (png, jpg, jpeg, pdf, mp3, mp4) are allowed.'), false);
        }
    },
    limits: {
        fileSize: Math.max(...Object.values(maxFileSize)) // Set the largest allowed file size
    }
}).single('image');

// Middleware to handle file upload
// Middleware to handle file upload
const handleFileUpload = (req, res, next) => {
    uploadToS3(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    data: { error: { file: err.message } },
                });
            } else {
                return res.status(400).json({
                    success: false,
                    data: { error: { file: err.message } },
                });
            }
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                data: { error: { file: 'File is required.' } },
            });
        }
        console.log("req.file",req.file);
        // for heic converter
        if (req.file.mimetype === 'application/octet-stream' && req.file.originalname.endsWith('.heic')) {
            try {
                const jpegBuffer = await heicConvert({
                    buffer: req.file.buffer,
                    format: 'JPEG',
                    quality: 0.8 // Adjust quality as needed (0.1 - 1)
                });

                // Replace req.file buffer and update mimetype
                req.file.buffer = jpegBuffer;
                req.file.mimetype = 'image/jpeg';
                req.file.originalname = req.file.originalname.replace('.heic', '.jpeg');
            } catch (convertError) {
                console.log("convertError",convertError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to convert HEIC to JPEG.',
                    data: { error: { file: convertError.message } }
                });
            }
        }
        // Ensure file size is within limits
        const fileSizeLimit = maxFileSize[req.file.mimetype];
        if (req.file.size > fileSizeLimit) {
            return res.status(400).json({
                success: false,
                data: { error: { file: `File size must be ${fileSizeLimit / (1024 * 1024)}MB or smaller.` } },
            });
        }

        // Proceed to upload the file to S3
        const fileKey = `${Date.now().toString()}-${req.file.originalname}`;
        const uploadParams = {
            Bucket: process.env.BUCKET_NAME,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };

        s3Client.send(new PutObjectCommand(uploadParams))
            .then(() => {
                // Construct the S3 file URL
                const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

                // Attach file details to req.file
                req.file = {
                    ...req.file,
                    key: fileKey,
                    location: fileUrl
                };

                next();
            })
            .catch(err => {
                res.status(500).json({
                    success: false,
                    message: 'Failed to upload file to S3.',
                    data: { error: { file: err.message } }
                });
            });
    });
};


module.exports = handleFileUpload;
