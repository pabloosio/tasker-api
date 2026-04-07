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

/**
 * Enviar email de invitación a un workspace
 */
const sendWorkspaceInviteEmail = async ({ inviteeEmail, inviteeName, inviterName, workspaceName, workspaceDesc, role }) => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const roleLabel = role === 'ADMIN' ? 'Administrador' : 'Miembro';
  const roleColor = role === 'ADMIN' ? '#7c3aed' : '#2563eb';
  const wsInitial = workspaceName.charAt(0).toUpperCase();

  const params = {
    Source: config.aws.sesFromEmail,
    Destination: { ToAddresses: [inviteeEmail] },
    Message: {
      Subject: {
        Data: `${inviterName} te agregó al tablero "${workspaceName}" en Tasker`,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <tr>
    <td style="background:#6f63c6;padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Tasker</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Gestión de tareas colaborativa</p>
    </td>
  </tr>

  <tr><td style="padding:36px 40px;">
    <h2 style="color:#111827;margin:0 0 8px;font-size:20px;">Hola${inviteeName ? ' ' + inviteeName : ''}!</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
      <strong style="color:#111827;">${inviterName}</strong> te ha agregado a un espacio de trabajo en Tasker.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f5f3ff;border:2px solid #6f63c6;border-radius:10px;margin-bottom:28px;">
      <tr><td style="padding:24px;">
        <div style="width:44px;height:44px;background:#6f63c6;border-radius:10px;text-align:center;
                    line-height:44px;font-size:20px;font-weight:700;color:#fff;margin-bottom:12px;">
          ${wsInitial}
        </div>
        <h3 style="color:#111827;margin:0 0 4px;font-size:18px;">${workspaceName}</h3>
        ${workspaceDesc ? `<p style="color:#6b7280;font-size:13px;margin:0 0 12px;">${workspaceDesc}</p>` : ''}
        <span style="display:inline-block;background:${roleColor}22;color:${roleColor};
                     padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">
          ${roleLabel}
        </span>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <span style="color:#9ca3af;font-size:13px;">Invitado por</span>
        <span style="float:right;color:#111827;font-size:13px;font-weight:600;">${inviterName}</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <span style="color:#9ca3af;font-size:13px;">Tablero</span>
        <span style="float:right;color:#111827;font-size:13px;font-weight:600;">${workspaceName}</span>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <span style="color:#9ca3af;font-size:13px;">Tu rol</span>
        <span style="float:right;color:${roleColor};font-size:13px;font-weight:700;">${roleLabel}</span>
      </td></tr>
    </table>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${appUrl}"
         style="display:inline-block;background:#6f63c6;color:#fff;padding:14px 36px;
                text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;">
        Abrir Tasker
      </a>
    </div>

    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      Si no esperabas esta invitación puedes ignorar este correo.<br>
      Ya tienes acceso al tablero con tu cuenta actual.
    </p>
  </td></tr>

  <tr>
    <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="color:#d1d5db;font-size:11px;margin:0;">
        &copy; ${new Date().getFullYear()} Tasker &middot; Este correo fue generado automáticamente
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    logger.info(`Email de invitación enviado a ${inviteeEmail} (workspace: "${workspaceName}")`, { messageId: result.MessageId });
    return result;
  } catch (error) {
    // No bloquear la invitación si el email falla
    logger.error(`Error al enviar email de invitación a ${inviteeEmail}`, error);
  }
};

/**
 * Enviar email de notificación cuando se asigna una tarea
 * @param {object} opts
 * @param {string} opts.assigneeEmail    - Email del usuario asignado
 * @param {string} opts.assigneeName     - Nombre del usuario asignado
 * @param {string} opts.assignerName     - Nombre de quien asigna
 * @param {string} opts.taskTitle        - Título de la tarea
 * @param {string} opts.taskDescription  - Descripción (puede ser null)
 * @param {string} opts.priority         - LOW | MEDIUM | HIGH
 * @param {string} opts.dueDate          - YYYY-MM-DD o null
 * @param {string} opts.workspaceName    - Nombre del workspace (puede ser null)
 * @param {string} opts.appUrl           - URL de la app
 */
const sendTaskAssignmentEmail = async ({ assigneeEmail, assigneeName, assignerName, taskTitle, taskDescription, priority, dueDate, workspaceName }) => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const PRIORITY_LABEL = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };
  const PRIORITY_COLOR = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
  const priorityLabel = PRIORITY_LABEL[priority] || priority;
  const priorityColor = PRIORITY_COLOR[priority] || '#6b7280';

  let dueDateStr = '';
  if (dueDate) {
    const [y, m, d] = dueDate.split('-').map(Number);
    dueDateStr = new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  const params = {
    Source: config.aws.sesFromEmail,
    Destination: { ToAddresses: [assigneeEmail] },
    Message: {
      Subject: {
        Data: `${assignerName} te asignó: "${taskTitle.length > 60 ? taskTitle.slice(0, 57) + '...' : taskTitle}"`,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:#6f63c6;padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Tasker</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Tienes una nueva tarea asignada</p>
    </td>
  </tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    <h2 style="color:#111827;margin:0 0 8px;font-size:20px;">Hola${assigneeName ? ' ' + assigneeName : ''}!</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
      <strong style="color:#111827;">${assignerName}</strong> te ha asignado la siguiente tarea:
    </p>

    <!-- Task info table -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">

      <!-- Título row -->
      <tr>
        <td colspan="2" style="background:#6f63c6;padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;text-transform:uppercase;
                          letter-spacing:0.8px;margin:0 0 4px;">Tarea asignada</p>
                <h3 style="color:#fff;margin:0;font-size:17px;font-weight:700;line-height:1.4;">${taskTitle}</h3>
              </td>
              <td align="right" style="vertical-align:top;padding-left:12px;white-space:nowrap;">
                <span style="display:inline-block;background:${priorityColor};color:#fff;
                             padding:4px 12px;border-radius:999px;font-size:11px;font-weight:800;
                             text-transform:uppercase;letter-spacing:0.5px;">
                  ${priorityLabel}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${taskDescription ? `
      <!-- Descripción row -->
      <tr>
        <td colspan="2" style="padding:14px 20px;background:#fafafa;border-bottom:1.5px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">${taskDescription}</p>
        </td>
      </tr>` : ''}

      <!-- Detalles: label izq, valor der -->
      <tr>
        <td style="padding:12px 20px;border-bottom:1px solid #f3f4f6;width:40%;">
          <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px;">Asignada por</p>
          <p style="color:#111827;font-size:14px;font-weight:600;margin:0;">${assignerName}</p>
        </td>
        <td style="padding:12px 20px;border-bottom:1px solid #f3f4f6;border-left:1px solid #f3f4f6;">
          <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px;">Prioridad</p>
          <p style="color:${priorityColor};font-size:14px;font-weight:700;margin:0;">${priorityLabel}</p>
        </td>
      </tr>

      ${workspaceName || dueDateStr ? `
      <tr>
        ${workspaceName ? `
        <td style="padding:12px 20px;${dueDateStr ? 'border-bottom:1px solid #f3f4f6;' : ''}">
          <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px;">Tablero</p>
          <p style="color:#111827;font-size:14px;font-weight:600;margin:0;">${workspaceName}</p>
        </td>` : '<td></td>'}
        ${dueDateStr ? `
        <td style="padding:12px 20px;border-left:1px solid #f3f4f6;${workspaceName ? '' : 'border-bottom:1px solid #f3f4f6;'}">
          <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px;">Fecha límite</p>
          <p style="color:#111827;font-size:14px;font-weight:600;margin:0;">${dueDateStr}</p>
        </td>` : '<td></td>'}
      </tr>` : ''}

    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${appUrl}"
         style="display:inline-block;background:#6f63c6;color:#fff;padding:14px 36px;
                text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;">
        Ver tarea en Tasker
      </a>
    </div>

    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      Este correo fue generado automáticamente porque te asignaron una tarea.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="color:#d1d5db;font-size:11px;margin:0;">
        &copy; ${new Date().getFullYear()} Tasker &middot; Este correo fue generado automáticamente
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    logger.info(`Email de asignación enviado a ${assigneeEmail} (tarea: "${taskTitle}")`, { messageId: result.MessageId });
    return result;
  } catch (error) {
    logger.error(`Error al enviar email de asignación a ${assigneeEmail}`, error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWorkspaceInviteEmail,
  sendTaskAssignmentEmail
};
