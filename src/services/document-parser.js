/**
 * Document Parser Service
 * Extracts clean plain text from PDF, DOCX, DOC, and TXT files directly in the browser.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

// Configure PDF.js worker using local Vite asset URL
try {
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
} catch (e) {
  console.warn('Could not set pdf.workerSrc:', e);
}

export class DocumentParser {
  /**
   * Parse a File object and extract its text content
   * @param {File} file 
   * @param {Function} [onProgress] Callback with { stage, percent }
   * @returns {Promise<{ text: string, metadata: object }>}
   */
  static async parseFile(file, onProgress = () => {}) {
    if (!file) throw new Error('No file provided');

    const fileName = file.name.toLowerCase();
    const fileSize = file.size;

    onProgress({ stage: 'Reading file data...', percent: 20 });

    if (fileName.endsWith('.pdf')) {
      return await this._parsePdf(file, onProgress);
    } else if (fileName.endsWith('.docx')) {
      return await this._parseDocx(file, onProgress);
    } else if (fileName.endsWith('.doc')) {
      return await this._parseDocLegacy(file, onProgress);
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return await this._parseTxt(file, onProgress);
    } else {
      // Fallback: try reading as text first, or attempt docx/pdf detection
      try {
        const text = await this._readAsText(file);
        if (text && text.trim().length > 50) {
          return {
            text: this._cleanText(text),
            metadata: { fileName: file.name, fileSize, fileType: 'txt' }
          };
        }
      } catch (_) {}
      throw new Error(`Unsupported file format "${file.name}". Please upload a .pdf, .docx, or .txt file.`);
    }
  }

  /**
   * Extract text from PDF using PDF.js
   */
  static async _parsePdf(file, onProgress) {
    onProgress({ stage: 'Decoding PDF pages...', percent: 40 });
    const arrayBuffer = await file.arrayBuffer();

    try {
      if (pdfWorker && pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
      }
    } catch (_) {}

    let pdf = null;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
        stopAtErrors: false
      });
      pdf = await loadingTask.promise;
    } catch (workerErr) {
      console.warn('Vite local worker load failed, trying CDN fallback:', workerErr);
      // Try multiple CDN fallbacks using the exact installed version
      const fallbackUrls = [
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`,
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`,
      ];

      let fallbackSuccess = false;
      for (const fallbackUrl of fallbackUrls) {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = fallbackUrl;
          const retryTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            useSystemFonts: true,
            stopAtErrors: false
          });
          pdf = await retryTask.promise;
          fallbackSuccess = true;
          break;
        } catch (retryErr) {
          console.warn(`CDN fallback failed (${fallbackUrl}):`, retryErr);
        }
      }

      if (!fallbackSuccess) {
        console.warn('All worker fallbacks failed, using raw buffer text extraction...');
        const extracted = this._extractTextFromPdfBuffer(new Uint8Array(arrayBuffer));
        if (extracted && extracted.length >= 30) {
          return {
            text: extracted,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: 'pdf',
              wordCount: this._countWords(extracted)
            }
          };
        }
        throw new Error('Could not parse PDF: all parsing methods exhausted. Try converting to a text-based PDF or use the "Paste Text" tab.');
      }
    }

    const numPages = pdf.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress({
        stage: `Extracting page ${pageNum} of ${numPages}...`,
        percent: 40 + Math.floor((pageNum / numPages) * 50)
      });

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let pageText = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          // Add a newline if vertical position shifted significantly
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
      }

      fullText += pageText + '\n\n';
    }

    onProgress({ stage: 'Finalizing PDF extraction...', percent: 95 });

    const cleaned = this._cleanText(fullText);
    if (!cleaned || cleaned.length < 30) {
      // Fallback: try raw buffer extraction
      const rawFallback = this._extractTextFromPdfBuffer(new Uint8Array(arrayBuffer));
      if (rawFallback && rawFallback.length > 30) return {
        text: rawFallback,
        metadata: { fileName: file.name, fileSize: file.size, fileType: 'pdf', wordCount: this._countWords(rawFallback) }
      };
      throw new Error('Could not extract readable text from this PDF. It may contain scanned images without selectable text.');
    }

    return {
      text: cleaned,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: 'pdf',
        pages: numPages,
        wordCount: this._countWords(cleaned)
      }
    };
  }

  /**
   * Direct text buffer extractor fallback for uncompressed/lightly encoded streams
   */
  static _extractTextFromPdfBuffer(bytes) {
    let result = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(bytes);

    // Look for text operators: (...) Tj or [(...)] TJ
    const textMatches = content.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
    for (const match of textMatches) {
      const clean = match.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '').replace(/\\([()\\])/g, '$1');
      if (clean.length > 1) result += clean + ' ';
    }

    if (result.trim().length < 50) {
      // General printable ASCII run scanner
      const runs = content.match(/[A-Za-z0-9 ,.\-@:/]{4,}/g) || [];
      result = runs.join(' ');
    }

    return this._cleanText(result);
  }

  /**
   * Extract text from DOCX using Mammoth
   */
  static async _parseDocx(file, onProgress) {
    onProgress({ stage: 'Extracting DOCX document content...', percent: 60 });
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = this._cleanText(result.value);

    if (!text || text.length < 30) {
      throw new Error('The DOCX file appears to be empty or could not be read.');
    }

    onProgress({ stage: 'Processing document structure...', percent: 95 });

    return {
      text,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: 'docx',
        wordCount: this._countWords(text),
        warnings: result.messages || []
      }
    };
  }

  /**
   * Parse legacy binary .doc file
   */
  static async _parseDocLegacy(file, onProgress) {
    onProgress({ stage: 'Extracting Word document...', percent: 50 });
    const arrayBuffer = await file.arrayBuffer();

    // First try mammoth (sometimes works if it is actually docx with .doc extension)
    try {
      const res = await mammoth.extractRawText({ arrayBuffer });
      if (res.value && res.value.trim().length > 30) {
        const text = this._cleanText(res.value);
        return {
          text,
          metadata: { fileName: file.name, fileSize: file.size, fileType: 'doc', wordCount: this._countWords(text) }
        };
      }
    } catch (_) {}

    // Fallback: extract printable strings from binary stream
    const bytes = new Uint8Array(arrayBuffer);
    let extracted = '';
    let currentWord = '';

    for (let i = 0; i < bytes.length; i++) {
      const code = bytes[i];
      // Printable ASCII characters or newlines
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        currentWord += String.fromCharCode(code);
      } else {
        if (currentWord.length >= 3) {
          extracted += currentWord + ' ';
        }
        currentWord = '';
      }
    }
    if (currentWord.length >= 3) extracted += currentWord;

    const cleaned = this._cleanText(extracted);
    if (!cleaned || cleaned.length < 40) {
      throw new Error('Legacy .doc file could not be parsed. Please convert to modern .docx or .pdf for best results.');
    }

    return {
      text: cleaned,
      metadata: { fileName: file.name, fileSize: file.size, fileType: 'doc', wordCount: this._countWords(cleaned) }
    };
  }

  /**
   * Plain text / markdown parser
   */
  static async _parseTxt(file, onProgress) {
    onProgress({ stage: 'Reading text file...', percent: 80 });
    const raw = await this._readAsText(file);
    const text = this._cleanText(raw);

    if (!text || text.length < 20) {
      throw new Error('The text file appears to be empty.');
    }

    return {
      text,
      metadata: { fileName: file.name, fileSize: file.size, fileType: 'txt', wordCount: this._countWords(text) }
    };
  }

  static _readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  static _cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static _countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}
