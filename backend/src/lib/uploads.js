const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");
const PUBLIC_PREFIX = "/uploads/";

const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function isUploadedFile(url) {
  return typeof url === "string" && url.startsWith(PUBLIC_PREFIX);
}

function removeUploadedFile(url) {
  if (!isUploadedFile(url)) return;
  const fileName = path.basename(url);
  fs.unlink(path.join(UPLOAD_DIR, fileName), () => {});
}

module.exports = { UPLOAD_DIR, PUBLIC_PREFIX, IMAGE_TYPES, isUploadedFile, removeUploadedFile };
