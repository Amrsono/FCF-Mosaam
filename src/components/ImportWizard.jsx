import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ImportWizard({ isOpen, onClose, targetFields, onImport, title }) {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" }); // defval maps empty cells to empty strings

        if (data.length === 0) {
          setError(language === 'ar' ? "الملف المرفوع فارغ." : "The uploaded file is empty.");
          return;
        }

        const exactHeaders = Object.keys(data[0]);
        setHeaders(exactHeaders);
        setFileData(data);
        
        // Auto-guess mapping if possible (case insensitive)
        const initialMapping = {};
        targetFields.forEach(field => {
          const match = exactHeaders.find(h => h.toLowerCase().includes(field.label.toLowerCase()) || field.label.toLowerCase().includes(h.toLowerCase()));
          if (match) {
            initialMapping[field.key] = match;
          } else {
            initialMapping[field.key] = '';
          }
        });
        
        setMapping(initialMapping);
        setError('');
        setStep(2);
      } catch (err) {
        setError(language === 'ar' ? "خطأ في تحليل الملف. يرجى التأكد من أنه ملف Excel أو CSV صالح." : "Error parsing the file. Please ensure it's a valid Excel or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (targetKey, sourceHeader) => {
    setMapping(prev => ({ ...prev, [targetKey]: sourceHeader }));
  };

  const handleProceedToPreview = () => {
    // Validate required fields
    const missing = targetFields.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
       setError(`${language === 'ar' ? 'يرجى ربط الحقول المطلوبة' : 'Please map the required fields'}: ${missing.map(f => f.label).join(', ')}`);
       return;
    }
    setError('');
    setStep(3);
  };

  const getMappedData = () => {
    return fileData.map(row => {
      const mappedRow = {};
      targetFields.forEach(field => {
        const sourceCol = mapping[field.key];
        mappedRow[field.key] = sourceCol ? row[sourceCol] : '';
      });
      return mappedRow;
    });
  };

  const executeImport = async () => {
    setIsImporting(true);
    setError('');
    try {
      const finalData = getMappedData();
      await onImport(finalData, setImportProgress); // pass progress callback
      setIsImporting(false);
      onClose();
      // Reset State
      setTimeout(() => {
        setStep(1);
        setFileData([]);
        setImportProgress(0);
        setMapping({});
      }, 500);
    } catch (err) {
      setError(err.message || (language === 'ar' ? 'فشل الاستيراد.' : 'Import failed.'));
      setIsImporting(false);
    }
  };

  const previewData = getMappedData().slice(0, 3); // Max 3 rows for preview

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', maxHeight: '90vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
            <UploadCloud color="var(--color-primary)" /> {title || t('importData')} - {language === 'ar' ? `الخطوة ${step} من 3` : `Step ${step} of 3`}
          </h2>
          {!isImporting && (
             <button className="btn btn-outline" style={{ padding: '0.4rem', border: 'none' }} onClick={onClose}><X size={20} /></button>
          )}
        </div>
        
        {error && (
          <div className="badge badge-danger" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', whiteSpace: 'normal', borderRadius: 'var(--radius-sm)' }}>
             <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 1rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)' }}>
            <UploadCloud size={48} color="var(--text-muted)" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>{language === 'ar' ? 'رفع جدول بيانات' : 'Upload Spreadsheet'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {language === 'ar' ? 'يدعم ملفات .xlsx, .xls, .csv. تأكد من أن الصف الأول يحتوي على رؤوس الأعمدة.' : 'Supports .xlsx, .xls, .csv files. Ensure the first row contains column headers.'}
              </p>
            </div>
            
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
               {language === 'ar' ? 'اختر ملف' : 'Select File'}
               <input type="file" accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <p style={{ color: 'var(--text-secondary)' }}>
                {language === 'ar' ? `وجدنا ${fileData.length} سجلاً. لنقم بربط أعمدة ملفك بحقول النظام.` : `We found ${fileData.length} records. Let's map the columns from your file to the system fields.`}
             </p>
             
             <div className="table-container">
               <table className="data-table">
                 <thead>
                   <tr>
                     <th>{language === 'ar' ? 'حقل النظام' : 'System Field'}</th>
                     <th>{language === 'ar' ? 'عمود ملفك' : 'Your File Column'}</th>
                   </tr>
                 </thead>
                 <tbody>
                   {targetFields.map(field => (
                     <tr key={field.key}>
                       <td style={{ fontWeight: 500, color: field.required ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                         {field.label} {field.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                       </td>
                       <td>
                         <select 
                           className="input-field" 
                           value={mapping[field.key] || ''} 
                           onChange={(e) => handleMappingChange(field.key, e.target.value)}
                         >
                           <option value="">{language === 'ar' ? '-- تجاهل / اتركه فارغاً --' : '-- Ignored / Leave Empty --'}</option>
                           {headers.map(h => (
                             <option key={h} value={h}>{h}</option>
                           ))}
                         </select>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>{t('back')}</button>
                <button className="btn btn-primary" onClick={handleProceedToPreview}>
                   {language === 'ar' ? 'معاينة البيانات' : 'Preview Data'} <ArrowRight size={16} style={{ [language === 'ar' ? 'transform' : '']: 'rotate(180deg)', [language === 'ar' ? 'marginRight' : 'marginLeft']: '0.5rem' }} />
                </button>
             </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & IMPORT */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <p style={{ color: 'var(--text-secondary)' }}>
                {language === 'ar' ? `معاينة أول ${previewData.length} سجلات مرتبطة من أصل ${fileData.length}. يرجى التأكد من صحة البيانات قبل الاستيراد.` : `Previewing the first ${previewData.length} mapped records out of ${fileData.length}. Please confirm the data looks correct before importing.`}
             </p>
             
             <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {targetFields.map(f => <th key={f.key}>{f.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                     {previewData.map((row, idx) => (
                       <tr key={idx}>
                         {targetFields.map(f => (
                           <td key={f.key}>{row[f.key]?.toString() || '-'}</td>
                         ))}
                       </tr>
                     ))}
                  </tbody>
                </table>
             </div>

             {isImporting && (
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                   <span>{language === 'ar' ? 'جاري الاستيراد...' : 'Importing...'}</span>
                   <span>{importProgress} / {fileData.length}</span>
                 </div>
                 <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(importProgress / fileData.length) * 100}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.2s' }} />
                 </div>
               </div>
             )}

             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setStep(2)} disabled={isImporting}>{language === 'ar' ? 'العودة للربط' : 'Back to Mapping'}</button>
                <button className="btn btn-primary" onClick={executeImport} disabled={isImporting}>
                   {isImporting ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...') : <><CheckCircle size={16}/> {language === 'ar' ? `تأكيد واستيراد ${fileData.length} سجلاً` : `Confirm & Import ${fileData.length} Records`}</>}
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
