import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Set worker path using Vite's URL import for the worker file in the package
// @ts-ignore - Vite specific import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFUploaderProps {
  onTextExtracted: (text: string) => void;
  className?: string;
}

export function PDFUploader({ onTextExtracted, className }: PDFUploaderProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setSuccess(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      onTextExtracted(fullText);
      setSuccess(true);
    } catch (err) {
      console.error('PDF extraction failed:', err);
      setError('Failed to read PDF. Try copy-pasting the text instead.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={isExtracting}
          className="hidden"
          id="pdf-upload"
        />
        <label
          htmlFor="pdf-upload"
          className={cn(
            "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer",
            isExtracting ? "bg-zinc-900 border-zinc-800 opacity-50 cursor-wait" : 
            success ? "bg-emerald-500/5 border-emerald-500/50" :
            "bg-zinc-950 border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900"
          )}
        >
          {isExtracting ? (
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          ) : success ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
          ) : (
            <Upload className="w-8 h-8 text-zinc-600 mb-2" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {isExtracting ? 'Extracting Data...' : success ? 'Resume Parsed' : 'Drop PDF Resume'}
          </span>
          <span className="text-[10px] text-zinc-700 mt-1 uppercase tracking-tighter">
            (Max 5MB)
          </span>
        </label>
      </div>
      
      {error && (
        <p className="text-[10px] text-red-400 font-bold uppercase tracking-tighter text-center">
          {error}
        </p>
      )}
    </div>
  );
}
