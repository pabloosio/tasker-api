const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const storage = require('../config/storage');
const logger = require('../utils/logger');

/**
 * Único punto de contacto con S3. El resto de la app no sabe dónde viven los archivos.
 *
 * Credenciales: S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY si existen; si no, el SDK usa
 * AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY o la cadena por defecto (rol IAM del servidor, perfil local, etc.).
 */
let client = null;

const getClient = () => {
  if (!client) {
    client = new S3Client({
      region: storage.region,
      ...(storage.credentials && { credentials: storage.credentials }),
      ...(storage.endpoint && { endpoint: storage.endpoint, forcePathStyle: true })
    });
  }
  return client;
};

/**
 * Carpeta de un adjunto: {prefijo}/tasks/{taskId}/{attachmentId}/
 */
exports.attachmentFolder = (taskId, attachmentId) =>
  `${storage.prefix}/tasks/${taskId}/${attachmentId}`;

exports.putObject = async (key, body, contentType) => {
  await getClient().send(new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
};

/**
 * URL firmada de lectura.
 * @param {object} [options]
 * @param {string} [options.fileName] - Nombre con el que se descarga
 * @param {boolean} [options.inline]  - true = se abre en el navegador (imágenes, PDF)
 */
exports.getSignedUrl = async (key, { fileName, inline = false, contentType, expiresIn = storage.downloadUrlTtl } = {}) => {
  const params = { Bucket: storage.bucket, Key: key };

  if (fileName) {
    // filename= para navegadores viejos (solo ASCII) y filename*= con el nombre real en UTF-8
    const ascii = fileName.normalize('NFD').replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '') || 'archivo';
    params.ResponseContentDisposition =
      `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  }
  if (contentType) params.ResponseContentType = contentType;

  return await getSignedUrl(getClient(), new GetObjectCommand(params), { expiresIn });
};

/**
 * Borrar varias keys. Nunca lanza: los datos ya se borraron de la BD
 * y un archivo huérfano en S3 no debe bloquear al usuario.
 */
exports.deleteObjects = async (keys) => {
  const list = keys.filter(Boolean);
  for (let i = 0; i < list.length; i += 1000) {
    const chunk = list.slice(i, i + 1000);
    try {
      const result = await getClient().send(new DeleteObjectsCommand({
        Bucket: storage.bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true }
      }));
      if (result.Errors?.length) {
        logger.error(`S3: no se pudieron borrar ${result.Errors.length} archivos: ${result.Errors.map(e => `${e.Key} (${e.Code})`).join(', ')}`);
      }
    } catch (error) {
      logger.error(`S3: error al borrar ${chunk.length} archivos: ${error.message}`);
    }
  }
};
