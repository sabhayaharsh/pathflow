const multer = require('multer');
const fs = require('fs');

async function profileMiddleware(req, res, next) {
    const Extension = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
    };

    const maxFileSize = {
        'image/png': 5,
        'image/jpeg': 5,
        'image/jpg': 5,
    };

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // Set destination folder to temp if the file is valid
            if (Extension[file.mimetype]) {
                cb(null, "public/profile");
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
            // If file upload fails, delete the file from profile directory
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            const errorResponse = {
                success: false,
                data: { error: { file: err.message } }
            };
            return res.status(err.status || 500).json(errorResponse);
        }

        // Check file size after uploading
        const file = req.file;
        const limit = maxFileSize[file?.mimetype];
        if (limit && file.size > limit * 1024 * 1024) {
            // Delete the file if it exceeds the size limit
            if (file) {
                fs.unlinkSync(file.path);
            }
            return res.status(400).json({ success: false, data: { error: { file: 'Invalid file type or size.' } } });
        }
        next();
    });
}

module.exports = profileMiddleware;
