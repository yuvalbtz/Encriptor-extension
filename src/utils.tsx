// Function to normalize text for processing
export function normalizeText(text: string): string {
    return text
        .normalize('NFKC') // Normalize to composed form
        .replace(/[\u0591-\u05F4]/g, '') // Remove Hebrew diacritics
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

// Function to normalize mapping keys
export function normalizeMapping(text: string): string {
    return text
        .normalize('NFKC') // Normalize to composed form
        .replace(/[\u0591-\u05F4]/g, '') // Remove Hebrew diacritics
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
} 