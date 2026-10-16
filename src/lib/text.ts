/** Case- and accent-insensitive key: "İstanbul Ağacı" → "istanbul agaci". */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase();
}
