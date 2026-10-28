export function redactForProvider(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:\+?\d[\d ()-]{7,}\d)\b/g, '[phone]')
    .replace(/<@!?\d+>/g, '[user]')
    .replace(/<@&\d+>/g, '[role]')
    .slice(0, 2000);
}

export function preview(text: string): string {
  return redactForProvider(text).replace(/`/g, "'").replace(/@/g, '@\u200b').slice(0, 250);
}
