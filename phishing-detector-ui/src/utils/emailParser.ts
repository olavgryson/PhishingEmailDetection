import type { EmailData } from '../types';
import PostalMime from 'postal-mime';

/**
 * Parse .eml file content using postal-mime
 */
export async function parseEmlFile(file: File): Promise<EmailData> {
    const arrayBuffer = await file.arrayBuffer();
    const parser = new PostalMime();
    const email = await parser.parse(arrayBuffer);

    return {
        subject: 'Subject extraction disabled',
        from: 'Sender extraction disabled',
        to: 'Recipient extraction disabled',
        date: new Date().toISOString(),
        body: email.text || '',
        htmlBody: email.html || ''
    };
}

/**
 * Parse .msg file content
 * Note: MSG files are more complex (OLE/CFB format)
 * For a complete solution, use a library like @pnp/sp or msg-reader
 */
export async function parseMsgFile(file: File): Promise<EmailData> {
    // MSG parsing requires specialized libraries
    // For this demo, we'll try to extract basic content
    const text = await file.text();

    return {
        subject: 'Subject extraction disabled',
        from: 'Sender extraction disabled',
        to: 'Recipient extraction disabled',
        date: new Date().toISOString(),
        body: text,
        htmlBody: ''
    };
}

/**
 * Parse email file based on extension
 */
export async function parseEmailFile(file: File): Promise<EmailData> {
    const extension = file.name.toLowerCase().split('.').pop();

    if (extension === 'eml') {
        return parseEmlFile(file);
    } else if (extension === 'msg') {
        return parseMsgFile(file);
    } else {
        throw new Error(`Unsupported file format: .${extension}. Please upload .eml or .msg files.`);
    }
}

/**
 * Validate file type
 */
export function isValidEmailFile(file: File): boolean {
    const validExtensions = ['eml', 'msg'];
    const extension = file.name.toLowerCase().split('.').pop();
    return validExtensions.includes(extension || '');
}
