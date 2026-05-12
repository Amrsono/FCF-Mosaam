import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Gift, Plus, Trash2, CheckCircle, XCircle, 
  Search, Percent, Calendar
} from 'lucide-react';

export default function DiscountsTab() {
  const { discountCodes, addDiscountCode, toggleDiscountActive, deleteDiscountCode, updateDiscountCode } = useDashboard();
  const { language } = useLanguage();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    type: 'FIXED',
    value: '',
    minSpend: '0',
    maxUses: '',
    maxUsesPerCustomer: '1',
    isFirstTimeOnly: false
  });

  const [editingCode, setEditingCode] = useState(null);
  const [editForm, setEditForm] = useState({
    value: '',
    minSpend: '',
    maxUses: '',
    maxUsesPerCustomer: ''
  });

  const filteredCodes = discountCodes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newDiscount.code || !newDiscount.value) return alert('Please fill in required fields');
    try {
      const res = await addDiscountCode(newDiscount);
      if (res.success) {
        setShowAddModal(false);
        setNewDiscount({
          code: '',
          type: 'FIXED',
          value: '',
          minSpend: '0',
          maxUses: '',
          maxUsesPerCustomer: '1',
          isFirstTimeOnly: false
        });
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingCode) return;
    try {
      const res = await updateDiscountCode(editingCode.id, editForm);
      if (res.success) {
        setEditingCode(null);
      } else {
        alert(res.error || 'Failed to update');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingBottom: '2rem' }}>
      
      {/* Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0 }}>
          <Gift size={24} color="var(--color-primary)" />
          {language === 'ar' ? 'إدارة أكواد الخصم' : 'Discount Management'}
        </h2>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-container" style={{ width: '250px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              className="search-input" 
              placeholder={language === 'ar' ? 'بحث عن كود...' : 'Search code...'} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px' }}>
            <Plus size={18} />
            {language === 'ar' ? 'كود جديد' : 'New Code'}
          </button>
        </div>
      </div>

      {/* Codes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {filteredCodes.map(code => (
          <div key={code.id} className="glass-panel" style={{ 
            background: 'var(--bg-panel)', 
            border: '1px solid var(--border-color)', 
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '1px' }}>{code.code}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {language === 'ar' ? 'أنشئ في: ' : 'Created: '} {new Date(code.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => {
                    setEditingCode(code);
                    setEditForm({
                      value: code.value,
                      minSpend: code.minSpend,
                      maxUses: code.maxUses || '',
                      maxUsesPerCustomer: code.maxUsesPerCustomer || ''
                    });
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                >
                  <Calendar size={18} />
                </button>
                <button 
                  onClick={() => toggleDiscountActive(code.id, !code.isActive)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: code.isActive ? 'var(--color-success)' : 'var(--text-muted)' }}
                >
                  {code.isActive ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </button>
                <button 
                  onClick={() => { if(window.confirm('Delete this code?')) deleteDiscountCode(code.id) }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'ar' ? 'القيمة' : 'Value'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {code.type === 'PERCENT' ? <Percent size={14} /> : 'EGP'}
                  {code.value}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'ar' ? 'الاستخدام الكلي' : 'Total Usage'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {code.usedCount} / {code.maxUses || '∞'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'ar' ? 'لكل عميل' : 'Per Customer'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {code.maxUsesPerCustomer || '∞'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'ar' ? 'الحد الأدنى' : 'Min Spend'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{code.minSpend} EGP</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'ar' ? 'الجمهور' : 'Target'}</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  background: code.isFirstTimeOnly ? 'rgba(var(--color-primary-rgb), 0.1)' : 'rgba(255,255,255,0.05)',
                  color: code.isFirstTimeOnly ? 'var(--color-primary)' : 'var(--text-muted)',
                  width: 'fit-content',
                  fontWeight: 600
                }}>
                  {code.isFirstTimeOnly ? (language === 'ar' ? 'أول طلب فقط' : 'First-time customers only') : (language === 'ar' ? 'الجميع' : 'Everyone')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
              <Plus color="var(--color-primary)" />
              {language === 'ar' ? 'إنشاء كود خصم جديد' : 'Create New Discount'}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">{language === 'ar' ? 'الكود' : 'Code'}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="EX: SUMMER2024"
                  value={newDiscount.code} 
                  onChange={e => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })} 
                />
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'النوع' : 'Type'}</label>
                <select className="input-field" value={newDiscount.type} onChange={e => setNewDiscount({ ...newDiscount, type: e.target.value })}>
                  <option value="FIXED">{language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                  <option value="PERCENT">{language === 'ar' ? 'نسبة مئوية' : 'Percentage'}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'القيمة' : 'Value'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newDiscount.value} 
                  onChange={e => setNewDiscount({ ...newDiscount, value: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'الحد الأدنى' : 'Min Spend'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newDiscount.minSpend} 
                  onChange={e => setNewDiscount({ ...newDiscount, minSpend: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'إجمالي الاستخدام' : 'Total Max Uses'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="∞"
                  value={newDiscount.maxUses} 
                  onChange={e => setNewDiscount({ ...newDiscount, maxUses: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">{language === 'ar' ? 'استخدام لكل عميل' : 'Max Uses Per Customer'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newDiscount.maxUsesPerCustomer} 
                  onChange={e => setNewDiscount({ ...newDiscount, maxUsesPerCustomer: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', gridColumn: 'span 2' }}>
                <input 
                  type="checkbox" 
                  id="first-time"
                  checked={newDiscount.isFirstTimeOnly} 
                  onChange={e => setNewDiscount({ ...newDiscount, isFirstTimeOnly: e.target.checked })} 
                />
                <label htmlFor="first-time" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>{language === 'ar' ? 'للعملاء الجدد فقط' : 'First-time customers only'}</label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', gridColumn: 'span 2' }}>
                <button className="btn btn-primary" onClick={handleAdd} style={{ flex: 1, height: '48px', borderRadius: '14px' }}>
                  {language === 'ar' ? 'إنشاء' : 'Create Discount'}
                </button>
                <button className="btn btn-neutral" onClick={() => setShowAddModal(false)} style={{ flex: 1, height: '48px', borderRadius: '14px' }}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCode && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
              <Gift color="var(--color-primary)" />
              {language === 'ar' ? `تعديل ${editingCode.code}` : `Edit ${editingCode.code}`}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'القيمة' : 'Value'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={editForm.value} 
                    onChange={e => setEditForm({ ...editForm, value: e.target.value })} 
                  />
                  <span>{editingCode.type === 'PERCENT' ? '%' : 'EGP'}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'الحد الأدنى للإنفاق' : 'Min Spend (EGP)'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editForm.minSpend} 
                  onChange={e => setEditForm({ ...editForm, minSpend: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'إجمالي عدد مرات الاستخدام' : 'Total Max Uses (Empty for ∞)'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editForm.maxUses} 
                  onChange={e => setEditForm({ ...editForm, maxUses: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="input-label">{language === 'ar' ? 'استخدام لكل عميل' : 'Max Uses Per Customer'}</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editForm.maxUsesPerCustomer} 
                  onChange={e => setEditForm({ ...editForm, maxUsesPerCustomer: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={handleUpdate} style={{ flex: 1, height: '48px', borderRadius: '14px' }}>
                  {language === 'ar' ? 'حفظ' : 'Save Changes'}
                </button>
                <button className="btn btn-neutral" onClick={() => setEditingCode(null)} style={{ flex: 1, height: '48px', borderRadius: '14px' }}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
