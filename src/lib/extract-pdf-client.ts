/**
 * Client-side PDF text extraction using pdfjs-dist browser build.
 * This avoids sending large PDF binaries to the server — we extract text
 * in the browser and only send the (much smaller) text to the API.
 */

import * as pdfjsLib from "pdfjs-dist";

// Point the worker to the CDN build matching our version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPDFClient(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;

    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }
    return fullText.trim();
  } catch (err) {
    console.error(`PDF extraction failed for ${file.name}:`, err);
    return "";
  }
}

export interface ExtractedFileData {
  fileName: string;
  fileType: string;
  extractedText: string;
}

/**
 * Extract text from an array of files (PDFs and text files).
 * Images are skipped since we can't OCR client-side.
 */
export async function extractAllFiles(files: File[]): Promise<ExtractedFileData[]> {
  const results: ExtractedFileData[] = [];

  for (const file of files) {
    let text = "";

    if (file.type === "application/pdf") {
      text = await extractTextFromPDFClient(file);
    } else if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      text = await file.text();
    }
    // Images are skipped — no client-side OCR

    results.push({
      fileName: file.name,
      fileType: file.type,
      extractedText: text || "[No extractable text]",
    });
  }

  return results;
}
