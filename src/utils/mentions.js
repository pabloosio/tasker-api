/**
 * Menciones en comentarios. Se guardan como @[Nombre](id-del-usuario) para que el nombre se vea
 * aunque cambie, y el id permita avisar a la persona correcta.
 */
const MENTION_PATTERN = /@\[([^\]\n]{1,100})\]\(([0-9a-f-]{36})\)/gi;

/** Ids de usuario mencionados (sin repetir) */
exports.parseMentions = (content = '') =>
  [...new Set([...content.matchAll(MENTION_PATTERN)].map((m) => m[2].toLowerCase()))];

/** Texto legible: "@[Sofía Herrera](id)" → "@Sofía Herrera" (para historial y avisos) */
exports.mentionsToText = (content = '') => content.replace(MENTION_PATTERN, '@$1');
