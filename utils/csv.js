/**
 * Shared CSV utilities (RFC 4180 compliant)
 * Used by all models that read/write CSV files.
 */

/**
 * Escape a value for CSV according to RFC 4180.
 * Quotes the field only when it contains commas, double quotes, or newlines.
 */
export function escapeCSVField(value) {
    let str = String(value ?? '');
    str = str.replace(/"/g, '""');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
    }
    return str;
}

/**
 * Parse a single CSV line into an array of field values.
 * Handles quoted fields and escaped double-quotes per RFC 4180.
 * Strips trailing \r from Windows CRLF line endings.
 */
export function parseCSVLine(line) {
    line = line.replace(/\r$/, '');
    const fields = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    fields.push(current);
    return fields;
}
