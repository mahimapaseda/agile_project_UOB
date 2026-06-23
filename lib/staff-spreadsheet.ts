/** Read Google Forms export (.csv or .xlsx) as CSV text for staff import. */
export async function spreadsheetFileToCsvText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return '';
    const sheet = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }
  return file.text();
}
