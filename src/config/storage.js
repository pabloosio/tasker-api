require('dotenv').config();

/**
 * Configuración de archivos adjuntos (S3).
 * Si no hay S3_BUCKET la funcionalidad queda deshabilitada y el resto de la API funciona igual.
 */
const MB = 1024 * 1024;

// Extensión → tipo MIME guardado y tipos reales aceptados (detectados por los primeros bytes).
// `detected: null` = formatos de texto sin firma binaria (se valida que parezca texto).
// docx/xlsx/pptx protegidos con contraseña se guardan como `cfb`; un PNG animado se detecta como `apng`.
const FILE_TYPES = {
  jpg:  { mime: 'image/jpeg', kind: 'IMAGE', detected: ['jpg'] },
  jpeg: { mime: 'image/jpeg', kind: 'IMAGE', detected: ['jpg'] },
  png:  { mime: 'image/png', kind: 'IMAGE', detected: ['png', 'apng'] },
  webp: { mime: 'image/webp', kind: 'IMAGE', detected: ['webp'] },
  gif:  { mime: 'image/gif', kind: 'IMAGE', detected: ['gif'] },
  pdf:  { mime: 'application/pdf', kind: 'DOCUMENT', detected: ['pdf'] },
  doc:  { mime: 'application/msword', kind: 'DOCUMENT', detected: ['cfb'] },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'DOCUMENT', detected: ['docx', 'zip', 'cfb'] },
  xls:  { mime: 'application/vnd.ms-excel', kind: 'DOCUMENT', detected: ['cfb'] },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'DOCUMENT', detected: ['xlsx', 'zip', 'cfb'] },
  ppt:  { mime: 'application/vnd.ms-powerpoint', kind: 'DOCUMENT', detected: ['cfb'] },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'DOCUMENT', detected: ['pptx', 'zip', 'cfb'] },
  csv:  { mime: 'text/csv', kind: 'DOCUMENT', detected: null },
  txt:  { mime: 'text/plain', kind: 'DOCUMENT', detected: null },
  zip:  { mime: 'application/zip', kind: 'OTHER', detected: ['zip'] }
};

// Formato real detectado → extensión con la que se guarda una imagen.
// Así un .jpg que en realidad es PNG o WebP se acepta y se guarda con su formato correcto.
const IMAGE_FORMATS = { jpg: 'jpg', png: 'png', apng: 'png', webp: 'webp', gif: 'gif' };

const bucket = process.env.S3_BUCKET || '';

module.exports = {
  isEnabled: Boolean(bucket),
  bucket,
  region: process.env.S3_REGION || process.env.AWS_SES_REGION || 'us-east-1',
  // Clave IAM propia para S3 (opcional). Si no se pone, el SDK usa AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
  // (las de SES) o el rol IAM del servidor.
  credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
    : null,
  // Solo para pruebas locales con un S3 compatible (MinIO/LocalStack). En AWS se deja vacío.
  endpoint: process.env.S3_ENDPOINT || null,
  // Sin "/" al inicio ni al final: tasker/dev
  prefix: (process.env.S3_PREFIX || 'tasker/dev').replace(/^\/+|\/+$/g, ''),

  maxFileBytes: (parseInt(process.env.ATTACHMENTS_MAX_FILE_MB) || 20) * MB,
  maxPerTask: parseInt(process.env.ATTACHMENTS_MAX_PER_TASK) || 15,
  maxPerRequest: 5,
  // Subidas por usuario por minuto (POST de adjuntos)
  uploadsPerMinute: parseInt(process.env.ATTACHMENTS_UPLOADS_PER_MINUTE) || 20,

  // Vigencia de las URLs firmadas (segundos)
  downloadUrlTtl: 5 * 60,
  thumbUrlTtl: 60 * 60,

  image: {
    maxSide: 1920,
    quality: 80,
    thumbSide: 400,
    thumbQuality: 70,
    // Límite antes de decodificar (evita que una imagen de 16000×16000 sature la memoria)
    maxPixels: 40e6,
    // Total de todos los cuadros de un GIF/WebP animado
    maxAnimatedPixels: 150e6
  },

  FILE_TYPES,
  IMAGE_FORMATS,
  ALLOWED_EXTENSIONS: Object.keys(FILE_TYPES)
};
