/**
 * File Validation Utility
 * Provides strict file type and size validation for security
 */

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
    PDF: 50 * 1024 * 1024, // 50MB
    IMAGE: 10 * 1024 * 1024, // 10MB
    DOCUMENT: 25 * 1024 * 1024, // 25MB (Word, PPT, Excel)
} as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
    PDF: ['application/pdf'],
    IMAGE: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
    ],
    WORD: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
    ],
    POWERPOINT: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
    ],
    EXCEL: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ],
} as const;

// File extensions
export const ALLOWED_EXTENSIONS = {
    PDF: ['.pdf'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
    WORD: ['.docx', '.doc'],
    POWERPOINT: ['.pptx', '.ppt'],
    EXCEL: ['.xlsx', '.xls'],
} as const;

export interface ValidationResult {
    valid: boolean;
    error?: string;
    file?: File;
}

/**
 * Validate file type by checking both MIME type and extension
 */
export function validateFileType(
    file: File,
    allowedTypes: readonly string[],
    allowedExtensions: readonly string[]
): ValidationResult {
    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Expected: ${allowedTypes.join(', ')}`,
        };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
        return {
            valid: false,
            error: `Invalid file extension. Expected: ${allowedExtensions.join(', ')}`,
        };
    }

    return { valid: true, file };
}

/**
 * Validate file size
 */
export function validateFileSize(
    file: File,
    maxSize: number
): ValidationResult {
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxSizeMB}MB, your file: ${fileSizeMB}MB`,
        };
    }

    return { valid: true, file };
}

/**
 * Validate PDF file
 */
export function validatePdfFile(file: File): ValidationResult {
    // Check type
    const typeValidation = validateFileType(
        file,
        ALLOWED_MIME_TYPES.PDF,
        ALLOWED_EXTENSIONS.PDF
    );
    if (!typeValidation.valid) return typeValidation;

    // Check size
    return validateFileSize(file, MAX_FILE_SIZES.PDF);
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): ValidationResult {
    // Check type
    const typeValidation = validateFileType(
        file,
        ALLOWED_MIME_TYPES.IMAGE,
        ALLOWED_EXTENSIONS.IMAGE
    );
    if (!typeValidation.valid) return typeValidation;

    // Check size
    return validateFileSize(file, MAX_FILE_SIZES.IMAGE);
}

/**
 * Validate document file (Word, PowerPoint, Excel)
 */
export function validateDocumentFile(
    file: File,
    docType: 'WORD' | 'POWERPOINT' | 'EXCEL'
): ValidationResult {
    // Check type
    const typeValidation = validateFileType(
        file,
        ALLOWED_MIME_TYPES[docType],
        ALLOWED_EXTENSIONS[docType]
    );
    if (!typeValidation.valid) return typeValidation;

    // Check size
    return validateFileSize(file, MAX_FILE_SIZES.DOCUMENT);
}

/**
 * Sanitize filename to prevent XSS and path traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
        .replace(/\.{2,}/g, '.') // Remove multiple dots
        .replace(/^\./, '') // Remove leading dot
        .substring(0, 255); // Limit length
}

/**
 * Validate multiple files
 */
export function validateFiles(
    files: File[],
    validator: (file: File) => ValidationResult
): { valid: File[]; invalid: Array<{ file: File; error: string }> } {
    const valid: File[] = [];
    const invalid: Array<{ file: File; error: string }> = [];

    files.forEach((file) => {
        const result = validator(file);
        if (result.valid && result.file) {
            valid.push(result.file);
        } else {
            invalid.push({ file, error: result.error || 'Unknown error' });
        }
    });

    return { valid, invalid };
}

/**
 * Check if file is potentially malicious
 * Basic checks for common attack vectors
 */
export function checkMaliciousFile(file: File): ValidationResult {
    const fileName = file.name.toLowerCase();

    // Check for double extensions (e.g., file.pdf.exe)
    const parts = fileName.split('.');
    if (parts.length > 2) {
        const suspiciousExtensions = [
            'exe',
            'bat',
            'cmd',
            'com',
            'scr',
            'vbs',
            'js',
            'jar',
        ];
        const hasSuspiciousExt = parts.some((part) =>
            suspiciousExtensions.includes(part)
        );
        if (hasSuspiciousExt) {
            return {
                valid: false,
                error: 'Potentially malicious file detected',
            };
        }
    }

    // Check for null bytes in filename
    if (file.name.includes('\0')) {
        return {
            valid: false,
            error: 'Invalid filename',
        };
    }

    return { valid: true, file };
}

/**
 * Complete file validation with all security checks
 */
export function validateFileSecure(
    file: File,
    validator: (file: File) => ValidationResult
): ValidationResult {
    // Check for malicious patterns
    const maliciousCheck = checkMaliciousFile(file);
    if (!maliciousCheck.valid) return maliciousCheck;

    // Run specific validator
    return validator(file);
}
