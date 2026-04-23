import React, { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { useLanguage } from '../context/LanguageContext';

export default function ExportActions({ data, headers, filename, title }) {
  const { t, language } = useLanguage();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePdfExport = async () => {
    setPdfLoading(true);
    try {
      await exportToPDF(data, headers, filename, title);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <button 
        className="btn btn-outline" 
        onClick={() => exportToExcel(data, headers, filename)}
        title={language === 'ar' ? 'تصدير إلى إكسل' : 'Export to Excel'}
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--color-success)', borderColor: 'rgba(50,255,100,0.3)' }}
      >
        <Download size={16} /> {language === 'ar' ? 'إكسل' : 'Excel'}
      </button>
      <button 
        className="btn btn-outline" 
        onClick={handlePdfExport}
        disabled={pdfLoading}
        title={language === 'ar' ? 'تصدير إلى PDF' : 'Export to PDF'}
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--color-danger)', borderColor: 'rgba(255,50,50,0.3)', opacity: pdfLoading ? 0.6 : 1, cursor: pdfLoading ? 'wait' : 'pointer' }}
      >
        {pdfLoading 
          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 
          : <FileText size={16} />
        } {language === 'ar' ? 'PDF' : 'PDF'}
      </button>
    </div>
  );
}
