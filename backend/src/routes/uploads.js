const crypto = require("crypto");
const multer = require("multer");
const router = require("express").Router();
const auth = require("../middleware/auth");
const { UPLOAD_DIR, PUBLIC_PREFIX, IMAGE_TYPES } = require("../lib/uploads");

const MAX_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${IMAGE_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
    const error = new Error("Envie uma imagem JPG, PNG, WEBP ou GIF.");
    error.status = 400;
    cb(error);
  },
});

router.post("/image", auth, (req, res) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Imagem deve ter no máximo 5MB." });
      }
      return res.status(error.status || 400).json({ error: error.message || "Falha no upload." });
    }
    if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada." });
    res.status(201).json({ url: `${PUBLIC_PREFIX}${req.file.filename}` });
  });
});

module.exports = router;
