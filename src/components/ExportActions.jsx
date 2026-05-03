import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { useLanguage } from '../context/LanguageContext';

export default function ExportActions({ data, headers, filename }) {
  const { language } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <button 
        className="btn btn-outline" 
        onClick={() => exportToExcel(data, headers, filename)}
        title={language === 'ar' ? 'تصدير إلى إكسل' : 'Export to Excel'}
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--color-success)', borderColor: 'rgba(50,255,100,0.3)' }}
      >
        <Download size={16} /> {language === 'ar' ? 'إكسل' : 'Excel'}
      </button>
    </div>
  );
}
