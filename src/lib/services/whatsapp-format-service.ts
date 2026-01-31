/**
 * Convierte HTML (del editor TipTap) al formato de texto enriquecido de WhatsApp.
 *
 * Conversiones:
 *   <strong>  →  *bold*
 *   <em>      →  _italic_
 *   <s>       →  ~strikethrough~
 *   <ul><li>  →  • item
 *   <ol><li>  →  1. item
 *   <p>       →  text + newline
 *   <br>      →  newline
 *   <h2>,<h3> →  *bold heading* + newline
 */
export function htmlToWhatsApp(html: string): string {
  if (!html) return '';

  let text = html;

  // Normalizar saltos de línea existentes
  text = text.replace(/\r\n/g, '\n');

  // Headings → bold con newline
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_match, content) => {
    const cleaned = stripInlineTags(content);
    return `*${cleaned.trim()}*\n`;
  });

  // Listas desordenadas
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, items) => {
    return processListItems(items, 'ul') + '\n';
  });

  // Listas ordenadas
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, items) => {
    return processListItems(items, 'ol') + '\n';
  });

  // Párrafos → texto + newline
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_match, content) => {
    const processed = processInlineFormatting(content);
    return processed.trim() + '\n';
  });

  // <br> → newline
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Limpiar cualquier tag HTML restante
  text = text.replace(/<[^>]+>/g, '');

  // Decodificar entidades HTML comunes
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Limpiar múltiples newlines (máximo 2 seguidas)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function processInlineFormatting(html: string): string {
  let text = html;

  // Bold: <strong> o <b>
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Italic: <em> o <i>
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '_$2_');

  // Strikethrough: <s>, <del>, <strike>
  text = text.replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/\1>/gi, '~$2~');

  // Code inline: <code>
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Links: <a href="url">text</a> → text (url)
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)');

  // Limpiar tags restantes
  text = text.replace(/<[^>]+>/g, '');

  return text;
}

function processListItems(html: string, type: 'ul' | 'ol'): string {
  const items: string[] = [];
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  let index = 1;

  while ((match = regex.exec(html)) !== null) {
    const content = processInlineFormatting(match[1]).trim();
    if (type === 'ul') {
      items.push(`• ${content}`);
    } else {
      items.push(`${index}. ${content}`);
      index++;
    }
  }

  return items.join('\n');
}

function stripInlineTags(html: string): string {
  return processInlineFormatting(html).replace(/<[^>]+>/g, '');
}
