const multer = require('multer');
const fs = require('fs');

async function multerMiddleware(req, res, next) {
    const Extension = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "application/pdf": "pdf",
        "video/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/m4a": "m4a",
        'audio/mp3': 10,
        "application/x-zip-compressed": "zip",
    };

    const maxFileSize = {
        'image/png': 5,
        'image/jpeg': 5,
        'image/jpg': 5,
        'application/pdf': 5,
        'audio/mpeg': 10,
        'audio/wav': 10,
        'audio/m4a': 10,
        'audio/mp3': 10,
        "video/mp4": 50,
        "application/x-zip-compressed": 0
    };

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // Set destination folder to temp if the file is valid
            if (Extension[file.mimetype]) {
                cb(null, "public/temp");
            } else {
                // If file is not valid, do not store it
                cb(null, null);
            }
        },
        filename: (req, file, cb) => {
            try {
                const name = file.originalname.replace(/\s+/g, '');
                const ext = Extension[file.mimetype];
                if (!ext) {
                    throw new Error("Invalid file type.");
                }
                cb(null, name + Date.now() + "." + ext);
            } catch (error) {
                cb(error);
            }
        }
    });

    const upload = multer({
        storage: storage,
        limits: {
            // Do not set fileSize limit here
        }
    }).single('image');

    // Middleware to handle multer errors
    upload(req, res, async (err) => {
        if (err) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            const errorResponse = {
                success: false,
                data: {
                    error: { file: err?.message || 'Invalid file type or size.' }
                }
            };
            return res.status(err.status || 500).json(errorResponse);
        }

        // Check file size after uploading
        const file = req.file;
        const limit = maxFileSize[file?.mimetype];
        if (limit && file.size > limit * 1024 * 1024) {
            // Delete the file if it exceeds the size limit
            fs.unlinkSync(file.path);
            return res.status(400).json({ success: false, data: { error: { file: 'Invalid file type or size.' } } });
        }
        next();
    });
}

module.exports = multerMiddleware;
