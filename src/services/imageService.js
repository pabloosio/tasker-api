const storage = require('../config/storage');
const { AppError, BadRequestError } = require('../utils/errors');

const { maxSide, quality, thumbSide, thumbQuality, maxPixels, maxAnimatedPixels } = storage.image;

// sharp es un binario nativo: se carga solo al procesar una imagen para que,
// si no está disponible, el resto de la API siga funcionando
let sharpLib = null;
const getSharp = () => {
  if (!sharpLib) {
    try {
      sharpLib = require('sharp');
    } catch {
      throw new AppError('El servidor no puede procesar imágenes en este momento', 503);
    }
  }
  return sharpLib;
};

const TOO_BIG = `La imagen es demasiado grande (máx. ${Math.round(maxPixels / 1e6)} megapíxeles)`;

/**
 * Comprime una imagen y genera su miniatura.
 * - Respeta la rotación EXIF (fotos de celular) y siempre quita los metadatos (GPS, cámara).
 * - Nunca agranda; reduce a máx. 1920 px por lado.
 * - GIF y WebP animados conservan la animación; la miniatura es el primer cuadro.
 * - Rechaza imágenes de más de 40 megapíxeles antes de decodificarlas.
 *
 * @returns {{ buffer, thumb, width, height }}
 */
exports.processImage = async (buffer, ext) => {
  const sharp = getSharp();

  let meta;
  try {
    // metadata() solo lee el encabezado, no decodifica la imagen
    meta = await sharp(buffer, { limitInputPixels: false }).metadata();
  } catch {
    throw new BadRequestError('La imagen está dañada o no se puede leer');
  }

  const pageHeight = meta.pageHeight || meta.height;
  const pages = meta.pages || 1;
  const animated = pages > 1 && (ext === 'gif' || ext === 'webp');
  if (meta.width * pageHeight > maxPixels || (animated && meta.width * pageHeight * pages > maxAnimatedPixels)) {
    throw new BadRequestError(TOO_BIG);
  }

  try {
    const thumb = await sharp(buffer, { limitInputPixels: maxPixels, animated: false })
      .rotate()
      .resize({ width: thumbSide, height: thumbSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: thumbQuality })
      .toBuffer();

    const resize = { width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true };
    let pipeline = animated
      ? sharp(buffer, { limitInputPixels: maxAnimatedPixels, animated: true }).resize(resize)
      : sharp(buffer, { limitInputPixels: maxPixels }).rotate().resize(resize);

    if (ext === 'gif') pipeline = pipeline.gif();
    else if (ext === 'webp') pipeline = pipeline.webp({ quality });
    else if (ext !== 'png') pipeline = pipeline.jpeg({ quality, mozjpeg: true });

    let output;
    if (ext === 'png') {
      // La paleta reduce mucho capturas y diagramas; si pesa más, se usa PNG sin pérdida
      output = await pipeline.clone().png({ compressionLevel: 9, palette: true, quality }).toBuffer({ resolveWithObject: true });
      if (output.data.length > buffer.length) {
        output = await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
      }
    } else {
      output = await pipeline.toBuffer({ resolveWithObject: true });
    }

    // Siempre se guarda la versión reprocesada: el original puede traer GPS u otros metadatos
    return {
      buffer: output.data,
      thumb,
      width: output.info.width,
      height: output.info.pageHeight || output.info.height
    };
  } catch (error) {
    if (/pixel limit/i.test(error.message)) throw new BadRequestError(TOO_BIG);
    throw new BadRequestError('La imagen está dañada o no se puede leer');
  }
};
