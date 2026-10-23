const path = require('path');
const storage = require('../config/storage');
const { BadRequestError } = require('./errors');

// file-type es solo ESM; se carga una vez de forma perezosa
let fileTypeFromBuffer = null;
const detectType = async (buffer) => {
  if (!fileTypeFromBuffer) ({ fileTypeFromBuffer } = await import('file-type'));
  return await fileTypeFromBuffer(buffer);
};

const ALLOWED_LABEL = 'imágenes (JPG, PNG, WebP, GIF), PDF, Word, Excel, PowerPoint, CSV, TXT o ZIP';

/**
 * Multer entrega el nombre en latin1; se convierte a UTF-8 para conservar acentos y ñ.
 * Se quitan rutas, caracteres de control y se limita la longitud.
 */
exports.cleanFileName = (rawName) => {
  let name = Buffer.from(rawName || '', 'latin1').toString('utf8');
  if (name.includes('�')) name = rawName || '';

  // Los caracteres bidi permiten disfrazar la extensión ("factura\u202Efdp.zip" se ve como .pdf)
  name = path.basename(name.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();

  if (!name) name = 'archivo';
  if (name.length > 200) {
    const ext = path.extname(name);
    name = name.slice(0, 200 - ext.length) + ext;
  }
  return name;
};

// Texto: UTF-16 con BOM, o sin bytes nulos al inicio (UTF-8, Latin-1 de Excel, etc.).
// No se consulta file-type: un CSV puede empezar con "MZ", "BM" o "<?xml" y ser texto válido.
const looksLikeText = (buffer) => {
  const isUtf16 = (buffer[0] === 0xFF && buffer[1] === 0xFE) || (buffer[0] === 0xFE && buffer[1] === 0xFF);
  return isUtf16 || !buffer.subarray(0, 8192).includes(0);
};

/**
 * Valida extensión y contenido real. Devuelve { ext, mime, kind, fileName }.
 * Así un .exe renombrado a .pdf se rechaza.
 * Una imagen con la extensión equivocada (un .jpg que es PNG) se acepta con su formato real;
 * en ese caso `ext`, `mime` y `fileName` reflejan el formato detectado.
 */
exports.validateFile = async (fileName, buffer) => {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const type = storage.FILE_TYPES[ext];

  if (!type) {
    throw new BadRequestError(`"${fileName}" no es un tipo de archivo permitido. Puedes subir ${ALLOWED_LABEL}.`);
  }
  if (!buffer?.length) {
    throw new BadRequestError(`"${fileName}" está vacío`);
  }

  const invalid = () => new BadRequestError(`El contenido de "${fileName}" no corresponde a un archivo .${ext} válido`);

  if (!type.detected) {
    if (!looksLikeText(buffer)) throw invalid();
    return { ext, mime: type.mime, kind: type.kind, fileName };
  }

  const detected = await detectType(buffer);
  if (!detected) throw invalid();

  if (type.kind === 'IMAGE') {
    const realExt = storage.IMAGE_FORMATS[detected.ext];
    if (!realExt) throw invalid();
    if (storage.FILE_TYPES[ext].detected.includes(detected.ext)) {
      return { ext, mime: type.mime, kind: type.kind, fileName };
    }
    const base = fileName.slice(0, fileName.length - ext.length - 1) || 'imagen';
    return { ext: realExt, mime: storage.FILE_TYPES[realExt].mime, kind: 'IMAGE', fileName: `${base}.${realExt}` };
  }

  if (!type.detected.includes(detected.ext)) throw invalid();
  return { ext, mime: type.mime, kind: type.kind, fileName };
};

exports.ALLOWED_LABEL = ALLOWED_LABEL;
