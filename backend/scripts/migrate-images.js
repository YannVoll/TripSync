require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const prisma = require("../src/prisma");
const { UPLOAD_DIR, PUBLIC_PREFIX, IMAGE_TYPES } = require("../src/lib/uploads");

async function main() {
  const properties = await prisma.property.findMany({
    where: { imageUrl: { startsWith: "data:" } },
    select: { id: true, title: true, imageUrl: true },
  });

  if (!properties.length) {
    console.log("Nenhuma imagem em base64 para migrar.");
    return;
  }

  for (const property of properties) {
    const match = property.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    const extension = match && IMAGE_TYPES[match[1]];
    if (!extension) {
      console.warn(`⚠️  Imóvel ${property.id} ("${property.title}"): formato não suportado, imagem removida.`);
      await prisma.property.update({ where: { id: property.id }, data: { imageUrl: null } });
      continue;
    }
    const fileName = `${crypto.randomUUID()}${extension}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), Buffer.from(match[2], "base64"));
    await prisma.property.update({
      where: { id: property.id },
      data: { imageUrl: `${PUBLIC_PREFIX}${fileName}` },
    });
    console.log(`✅ Imóvel ${property.id} ("${property.title}") → ${PUBLIC_PREFIX}${fileName}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
