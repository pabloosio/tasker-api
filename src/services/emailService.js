const AWS = require('aws-sdk');
const config = require('../config/env');
const logger = require('../utils/logger');

// Configurar AWS SES
const ses = new AWS.SES({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.sesRegion
});

/**
 * Enviar email de verificación
 */
const sendVerificationEmail = async (email, verificationToken, userName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const params = {
    Source: config.aws.sesFromEmail,
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: 'Verifica tu correo electrónico - Tasker',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">¡Hola ${userName}!</h2>
              <p>Gracias por registrarte en Tasker. Para completar tu registro, por favor verifica tu correo electrónico.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Verificar Correo
                </a>
              </div>

              <p>O copia y pega este enlace en tu navegador:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>

              <p>Este enlace expirará en 24 horas.</p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                Si no solicitaste este correo, puedes ignorarlo de forma segura.
              </p>
            </div>
          `,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    logger.info(`Email de verificación enviado a ${email}`, { messageId: result.MessageId });
    return result;
  } catch (error) {
    logger.error(`Error al enviar email de verificación a ${email}`, error);
    throw error;
  }
};

/**
 * Enviar email de reinicio de contraseña
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const params = {
    Source: config.aws.sesFromEmail,
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: 'Reinicia tu contraseña - Tasker',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Hola ${userName},</h2>
              <p>Recibimos una solicitud para reiniciar tu contraseña en Tasker.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Reiniciar Contraseña
                </a>
              </div>

              <p>O copia y pega este enlace en tu navegador:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>

              <p style="color: #e74c3c;">Este enlace expirará en 1 hora.</p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                Si no solicitaste este correo, tu contraseña permanece segura.
                Por favor ignora este mensaje o contacta a soporte si crees que es un error.
              </p>
            </div>
          `,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    logger.info(`Email de reinicio de contraseña enviado a ${email}`, { messageId: result.MessageId });
    return result;
  } catch (error) {
    logger.error(`Error al enviar email de reinicio a ${email}`, error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
