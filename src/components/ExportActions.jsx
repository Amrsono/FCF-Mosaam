import React from 'react';
import { Download, FileText } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { useLanguage } from '../context/LanguageContext';

export default function ExportActions({ data, headers, filename, title }) {
  const { t, language } = useLanguage();
  
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
        onClick={() => exportToPDF(data, headers, filename, title)}
        title={language === 'ar' ? 'تصدير إلى PDF' : 'Export to PDF'}
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--color-danger)', borderColor: 'rgba(255,50,50,0.3)' }}
      >
        <FileText size={16} /> {language === 'ar' ? 'PDF' : 'PDF'}
      </button>
    </div>
  );
}
