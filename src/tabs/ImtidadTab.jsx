import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, Truck, Shield, Calendar, ArrowRight, CheckCircle, 
  AlertCircle, Search, RefreshCw, BarChart2, DollarSign, Package, 
  Printer, Trash2, Check, ArrowLeftRight, Plus, Eye, EyeOff
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ROUTES = [
  { from: 'cairo_hub', to: 'giza_hub', load: 'Medium' },
  { from: 'cairo_hub', to: 'eltalg', load: 'High' },
  { from: 'eltalg', to: 'tegara', load: 'Low' },
  { from: 'eltalg', to: 'mostashfa', load: 'Low' },
  { from: 'cairo_hub', to: 'tanta_hub', load: 'Medium' },
  { from: 'tanta_hub', to: 'alex_hub', load: 'High' },
  { from: 'tanta_hub', to: 'eltalg', load: 'Medium' },
];

// Pre-seed the 3 active FCF outlets — shown in dropdowns even before DB responds
// Positions spread out around Banha area so they don't overlap on the SVG map
const FCF_DEFAULT_OUTLETS = [
  { id: 'default_eltalg',     key: 'eltalg',     nameEn: 'Banha - Eltalg Station',    nameAr: 'بنها - محطة التلج',     city: 'Banha', x: 245, y: 126, baseLoad: 92, status: 'Active' },
  { id: 'default_tegara',     key: 'tegara',     nameEn: 'Banha - Tegara Station',    nameAr: 'بنها - محطة التجارة',   city: 'Banha', x: 231, y: 140, baseLoad: 45, status: 'Active' },
  { id: 'default_mostashfa',  key: 'mostashfa',  nameEn: 'Banha - Mostashfa Station', nameAr: 'بنها - محطة المستشفى', city: 'Banha', x: 258, y: 142, baseLoad: 30, status: 'Active' },
];

export default function ImtidadTab() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState('booking'); // booking | dashboard | analytics | outlets_mgmt
  const [heatmapMode, setHeatmapMode] = useState(true);
  
  // Dynamic Outlets & Orders — pre-seeded with default FCF outlets so dropdowns work immediately
  const [outlets, setOutlets] = useState(FCF_DEFAULT_OUTLETS);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Booking Form State — pre-select first two active outlets from defaults
  const [bookingForm, setBookingForm] = useState({
    senderName: '',
    senderPhone: '',
    senderCity: 'Banha',
    dropoffOutlet: 'eltalg',
    recipientName: '',
    recipientPhone: '',
    recipientCity: 'Banha',
    pickupOutlet: 'tegara',
    description: '',
    weight: 1.0,
    size: 'M',
    totalValue: 0,
  });

  // Outlet Creation Form State
  const [newOutletForm, setNewOutletForm] = useState({
    key: '',
    nameEn: '',
    nameAr: '',
    city: 'Banha',
    x: 200,
    y: 200,
    baseLoad: 50
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Outlet Action Feedback
  const [outletError, setOutletError] = useState('');
  const [outletSuccess, setOutletSuccess] = useState(false);
  const [outletSearchQuery, setOutletSearchQuery] = useState('');

  // Map zoom/pan state
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const mapDragRef = useRef(null);
  const mapSvgRef = useRef(null);
  const mapZoomRef = useRef(1);
  const mapPanRef = useRef({ x: 0, y: 0 });
  const [hoveredHub, setHoveredHub] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync refs so wheel handler always has fresh values without stale closures
  useEffect(() => { mapZoomRef.current = mapZoom; }, [mapZoom]);
  useEffect(() => { mapPanRef.current = mapPan; }, [mapPan]);

  const handleMapWheel = useCallback((e) => {
    e.preventDefault();
    const container = mapSvgRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Mouse position relative to container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleFactor = e.deltaY < 0 ? 1.18 : 0.85;
    const oldZoom = mapZoomRef.current;
    const newZoom = Math.min(10, Math.max(0.35, oldZoom * scaleFactor));
    const oldPan = mapPanRef.current;
    // Adjust pan so zoom origin stays under the cursor
    const newPanX = mouseX - (mouseX - oldPan.x) * (newZoom / oldZoom);
    const newPanY = mouseY - (mouseY - oldPan.y) * (newZoom / oldZoom);
    setMapZoom(newZoom);
    setMapPan({ x: newPanX, y: newPanY });
  }, []);

  const handleMapMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    mapDragRef.current = { startX: e.clientX - mapPanRef.current.x, startY: e.clientY - mapPanRef.current.y };
  }, []);

  const handleMapMouseMove = useCallback((e) => {
    if (!mapDragRef.current) return;
    setMapPan({ x: e.clientX - mapDragRef.current.startX, y: e.clientY - mapDragRef.current.startY });
  }, []);

  const handleMapMouseUp = useCallback(() => {
    mapDragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleMapZoomIn  = () => {
    const z = mapZoomRef.current;
    const newZ = Math.min(10, z * 1.35);
    // Zoom toward center
    const container = mapSvgRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const p = mapPanRef.current;
      setMapPan({ x: cx - (cx - p.x) * (newZ / z), y: cy - (cy - p.y) * (newZ / z) });
    }
    setMapZoom(newZ);
  };
  const handleMapZoomOut = () => {
    const z = mapZoomRef.current;
    const newZ = Math.max(0.35, z / 1.35);
    const container = mapSvgRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const p = mapPanRef.current;
      setMapPan({ x: cx - (cx - p.x) * (newZ / z), y: cy - (cy - p.y) * (newZ / z) });
    }
    setMapZoom(newZ);
  };
  const handleMapReset = () => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); };

  useEffect(() => {
    fetchOutlets();
    fetchOrders();
  }, []);

  const fetchOutlets = async () => {
    setLoadingOutlets(true);
    try {
      const res = await fetch('/api/imtidad-outlets');
      if (res.ok) {
        const data = await res.json();
        // Merge DB outlets with defaults — DB wins if key exists (deduplicate by key)
        const dbKeys = new Set(data.map(o => o.key));
        const mergedOutlets = [
          ...data,
          ...FCF_DEFAULT_OUTLETS.filter(d => !dbKeys.has(d.key))
        ];
        setOutlets(mergedOutlets);
        // If current form selections are valid, keep them; otherwise auto-select
        const active = mergedOutlets.filter(o => o.status === 'Active');
        if (active.length >= 1) {
          setBookingForm(prev => {
            const dropValid = active.find(o => o.key === prev.dropoffOutlet);
            const pickValid = active.find(o => o.key === prev.pickupOutlet);
            return {
              ...prev,
              dropoffOutlet: dropValid ? prev.dropoffOutlet : active[0]?.key ?? '',
              senderCity:    dropValid ? prev.senderCity    : active[0]?.city ?? '',
              pickupOutlet:  pickValid ? prev.pickupOutlet  : (active[1] ?? active[0])?.key ?? '',
              recipientCity: pickValid ? prev.recipientCity : (active[1] ?? active[0])?.city ?? '',
            };
          });
        }
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
    } finally {
      setLoadingOutlets(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/imtidad-orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching C2C orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectMapHub = (hubKey, type) => {
    const hub = outlets.find(h => h.key === hubKey);
    if (!hub || hub.status !== 'Active') return;

    if (type === 'dropoff') {
      setBookingForm(prev => ({
        ...prev,
        dropoffOutlet: hubKey,
        senderCity: hub.city
      }));
    } else {
      setBookingForm(prev => ({
        ...prev,
        pickupOutlet: hubKey,
        recipientCity: hub.city
      }));
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!bookingForm.dropoffOutlet || !bookingForm.pickupOutlet) {
      setSubmitError(isRtl ? 'الرجاء اختيار محطة الإيداع ومحطة الاستلام.' : 'Please select drop-off and pickup stations.');
      return;
    }

    if (bookingForm.dropoffOutlet === bookingForm.pickupOutlet) {
      setSubmitError(isRtl ? 'لا يمكن أن تكون محطة الإيداع هي نفسها محطة الاستلام.' : 'Drop-off station and Pickup station cannot be the same.');
      return;
    }

    try {
      const res = await fetch('/api/imtidad-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create C2C shipment.');
      }

      const orderData = await res.json();
      setCreatedOrder(orderData);
      setSubmitSuccess(true);
      setShowInvoiceModal(true);
      
      // Reset form (except sender details for convenience)
      setBookingForm(prev => ({
        ...prev,
        recipientName: '',
        recipientPhone: '',
        description: '',
        weight: 1.0,
        size: 'M',
        totalValue: 0,
      }));

      fetchOrders(); // Refresh table list
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      const res = await fetch('/api/imtidad-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذه الشحنة؟' : 'Are you sure you want to delete this shipment?')) return;
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/imtidad-orders?id=${orderId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Create Outlet
  const handleCreateOutlet = async (e) => {
    e.preventDefault();
    setOutletError('');
    setOutletSuccess(false);

    if (!newOutletForm.key || !newOutletForm.nameEn || !newOutletForm.nameAr || !newOutletForm.city) {
      setOutletError(isRtl ? 'جميع الحقول مطلوبة.' : 'All fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/imtidad-outlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOutletForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create station.');
      }

      setOutletSuccess(true);
      setNewOutletForm({
        key: '',
        nameEn: '',
        nameAr: '',
        city: 'Banha',
        x: 200,
        y: 200,
        baseLoad: 50
      });
      fetchOutlets();
    } catch (err) {
      setOutletError(err.message);
    }
  };

  // Toggle Outlet Status
  const handleToggleOutletStatus = async (outletId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch('/api/imtidad-outlets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: outletId, status: newStatus })
      });

      if (res.ok) {
        fetchOutlets();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Delete Outlet
  const handleDeleteOutlet = async (outletId) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذه المحطة نهائياً؟ قد يؤثر هذا على الشحنات المرتبطة بها.' : 'Are you sure you want to delete this station permanently? This may impact associated shipments.')) return;
    try {
      const res = await fetch(`/api/imtidad-outlets?id=${outletId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchOutlets();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete outlet.');
      }
    } catch (err) {
      console.error('Failed to delete outlet:', err);
    }
  };

  // Map Click coordinate picker
  const handleMapPlacementClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Scale client bounding box clicks to 450x420 viewBox coordinates
    const x = Math.round((clientX / rect.width) * 450);
    const y = Math.round((clientY / rect.height) * 420);
    
    setNewOutletForm(prev => ({
      ...prev,
      x: Math.max(15, Math.min(435, x)),
      y: Math.max(15, Math.min(405, y))
    }));
  };

  // Dynamic cost estimator
  const estimateCost = () => {
    const isInterCity = bookingForm.senderCity.toLowerCase().trim() !== bookingForm.recipientCity.toLowerCase().trim();
    const interCityFee = isInterCity ? 20.0 : 0.0;
    
    let sizeFee = 10.0; // Default M
    if (bookingForm.size === 'S') sizeFee = 0.0;
    if (bookingForm.size === 'L') sizeFee = 20.0;

    const baseCost = 30.0;
    const weightFee = parseFloat(bookingForm.weight || 1.0) * 5.0;

    return baseCost + interCityFee + weightFee + sizeFee;
  };

  // Dynamic self-healing visual routes calculation
  const getDynamicRoutes = () => {
    const activeOutlets = outlets.filter(o => o.status === 'Active');
    const routes = [];
    
    // 1. Add standard backbone routes if they connect active outlets
    for (const r of ROUTES) {
      const fromHub = activeOutlets.find(o => o.key === r.from);
      const toHub = activeOutlets.find(o => o.key === r.to);
      if (fromHub && toHub) {
        routes.push({ from: fromHub, to: toHub, load: r.load });
      }
    }
    
    // 2. Euclidean auto-routing: Connect any active outlet not connected by a backbone route to the nearest active node
    const connectedKeys = new Set();
    for (const r of ROUTES) {
      connectedKeys.add(r.from);
      connectedKeys.add(r.to);
    }
    
    const extraOutlets = activeOutlets.filter(o => !connectedKeys.has(o.key));
    for (const outlet of extraOutlets) {
      let closest = null;
      let minDist = Infinity;
      
      for (const other of activeOutlets) {
        if (other.key === outlet.key) continue;
        const dist = Math.sqrt(Math.pow(other.x - outlet.x, 2) + Math.pow(other.y - outlet.y, 2));
        if (dist < minDist) {
          minDist = dist;
          closest = other;
        }
      }
      
      if (closest) {
        routes.push({ from: outlet, to: closest, load: 'Low' });
      }
    }
    
    return routes;
  };

  // Capacity Load per Hub Calculator
  const getHubLoad = (hubKey) => {
    const hub = outlets.find(h => h.key === hubKey);
    if (!hub) return 0;
    const count = orders.filter(o => 
      (o.dropoffOutlet === hubKey && o.status === 'At Drop-off Station') || 
      (o.pickupOutlet === hubKey && o.status === 'Ready for Pickup')
    ).length;
    return Math.min(100, hub.baseLoad + (count * 4));
  };

  const getHeatmapColor = (loadPercentage) => {
    if (loadPercentage >= 80) return 'rgba(239, 68, 68, 0.85)'; // Red
    if (loadPercentage >= 50) return 'rgba(249, 115, 22, 0.85)'; // Orange
    return 'rgba(197, 168, 128, 0.85)'; // Gold
  };

  const getHeatmapGlow = (loadPercentage) => {
    if (loadPercentage >= 80) return 'rgba(239, 68, 68, 0.4)';
    if (loadPercentage >= 50) return 'rgba(249, 115, 22, 0.4)';
    return 'rgba(197, 168, 128, 0.3)';
  };

  const getStatusBadgeStyle = (status) => {
    const base = { padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-block' };
    switch (status) {
      case 'Pending Drop-off':
        return { ...base, background: 'rgba(253, 224, 71, 0.1)', color: '#fde047', border: '1px solid rgba(253, 224, 71, 0.2)' };
      case 'At Drop-off Station':
        return { ...base, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'In Transit':
        return { ...base, background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' };
      case 'Ready for Pickup':
        return { ...base, background: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.2)' };
      case 'Picked Up':
        return { ...base, background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' };
      case 'Cancelled':
        return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' };
      default:
        return base;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchQuery = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.senderPhone.includes(searchQuery) ||
      order.recipientPhone.includes(searchQuery);
    
    const matchStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const filteredOutlets = outlets.filter(outlet => {
    return outlet.nameEn.toLowerCase().includes(outletSearchQuery.toLowerCase()) ||
           outlet.nameAr.includes(outletSearchQuery) ||
           outlet.city.toLowerCase().includes(outletSearchQuery.toLowerCase());
  });

  const activeOutletsList = outlets.filter(o => o.status === 'Active');

  // Chart volumes preparer
  const routeChartData = outlets.map(hub => {
    const countAsDropoff = orders.filter(o => o.dropoffOutlet === hub.key).length;
    const countAsPickup = orders.filter(o => o.pickupOutlet === hub.key).length;
    return {
      name: isRtl ? hub.nameAr : hub.nameEn,
      [isRtl ? 'شحنات صادرة' : 'Outgoing Shipments']: countAsDropoff,
      [isRtl ? 'شحنات واردة' : 'Incoming Shipments']: countAsPickup
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Header Branding */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '1.5rem 2rem',
        borderLeft: '4px solid #c5a880',
        background: 'linear-gradient(135deg, rgba(7,27,45,0.85) 0%, rgba(15,45,74,0.85) 100%)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/imtidad_logo.png" alt="Imtidad Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
              {isRtl ? 'الخدمات اللوجستية لمجموعة امتداد' : 'Imtidad Group C2C Logistics'}
            </h1>
            <p style={{ color: '#c5a880', fontSize: '0.88rem', margin: '0.25rem 0 0', fontWeight: 600 }}>
              {isRtl ? 'بوابة إدارة شبكة شحن وتوصيل الطرود' : 'Parcel Shipping & Hub Management Portal'}
            </p>
          </div>
        </div>

        {/* Dynamic counters */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'إجمالي المحطات' : 'Total Stations'}</div>
            <div style={{ color: '#c5a880', fontSize: '1.4rem', fontWeight: 700, marginTop: '0.15rem' }}>{outlets.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'إجمالي الشحنات' : 'Total Shipments'}</div>
            <div style={{ color: '#c5a880', fontSize: '1.4rem', fontWeight: 700, marginTop: '0.15rem' }}>{orders.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'قيد التوصيل' : 'In Transit'}</div>
            <div style={{ color: '#c5a880', fontSize: '1.4rem', fontWeight: 700, marginTop: '0.15rem' }}>{orders.filter(o => o.status === 'In Transit').length}</div>
          </div>
        </div>
      </div>

      {/* Subtabs bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveSubTab('booking')}
          className={`btn ${activeSubTab === 'booking' ? 'btn-primary' : 'btn-outline'}`}
          style={{ 
            background: activeSubTab === 'booking' ? '#c5a880' : 'transparent', 
            borderColor: activeSubTab === 'booking' ? '#c5a880' : 'var(--border-color)',
            color: activeSubTab === 'booking' ? '#071b2d' : 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '12px',
            padding: '0.6rem 1.25rem'
          }}
        >
          <Truck size={18} />
          {t('c2cBooking')}
        </button>
        <button 
          onClick={() => setActiveSubTab('dashboard')}
          className={`btn ${activeSubTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
          style={{ 
            background: activeSubTab === 'dashboard' ? '#c5a880' : 'transparent', 
            borderColor: activeSubTab === 'dashboard' ? '#c5a880' : 'var(--border-color)',
            color: activeSubTab === 'dashboard' ? '#071b2d' : 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '12px',
            padding: '0.6rem 1.25rem'
          }}
        >
          <Package size={18} />
          {t('c2cDashboard')}
        </button>
        <button 
          onClick={() => setActiveSubTab('analytics')}
          className={`btn ${activeSubTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`}
          style={{ 
            background: activeSubTab === 'analytics' ? '#c5a880' : 'transparent', 
            borderColor: activeSubTab === 'analytics' ? '#c5a880' : 'var(--border-color)',
            color: activeSubTab === 'analytics' ? '#071b2d' : 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '12px',
            padding: '0.6rem 1.25rem'
          }}
        >
          <BarChart2 size={18} />
          {t('c2cAnalytics')}
        </button>
        <button 
          onClick={() => setActiveSubTab('outlets_mgmt')}
          className={`btn ${activeSubTab === 'outlets_mgmt' ? 'btn-primary' : 'btn-outline'}`}
          style={{ 
            background: activeSubTab === 'outlets_mgmt' ? '#c5a880' : 'transparent', 
            borderColor: activeSubTab === 'outlets_mgmt' ? '#c5a880' : 'var(--border-color)',
            color: activeSubTab === 'outlets_mgmt' ? '#071b2d' : 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '12px',
            padding: '0.6rem 1.25rem'
          }}
        >
          <MapPin size={18} />
          {t('manageOutlets')}
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. BOOKING WIZARD SUBTAB                                 */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'booking' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Interactive Network Heatmap */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyBetween: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} style={{ color: '#c5a880' }} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  {t('outletHeatmap')}
                </h2>
              </div>

              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setHeatmapMode(true)}
                  style={{
                    background: heatmapMode ? '#c5a880' : 'transparent',
                    color: heatmapMode ? '#071b2d' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isRtl ? 'حرارية' : 'Heatmap'}
                </button>
                <button
                  onClick={() => setHeatmapMode(false)}
                  style={{
                    background: !heatmapMode ? '#c5a880' : 'transparent',
                    color: !heatmapMode ? '#071b2d' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isRtl ? 'عادية' : 'Status'}
                </button>
              </div>
            </div>

            {/* ═══════════ FUTURISTIC INTERACTIVE MAP 2070 ═══════════ */}
            <div style={{
              position: 'relative',
              background: 'radial-gradient(ellipse at 40% 25%, #072038 0%, #030d18 80%, #020a12 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(197,168,128,0.3)',
              boxShadow: '0 0 60px rgba(0,180,255,0.1), 0 0 20px rgba(197,168,128,0.08), inset 0 0 100px rgba(0,0,0,0.6)',
              height: '520px',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'crosshair',
              userSelect: 'none',
            }}
              ref={mapSvgRef}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={handleMapMouseUp}
              onMouseLeave={handleMapMouseUp}
              onWheel={handleMapWheel}
            >
              {/* SVG Keyframe animations */}
              <style>{`
                @keyframes imtidad-radar { 0%{r:10;opacity:0.8} 100%{r:42;opacity:0} }
                @keyframes imtidad-route-dash { to { stroke-dashoffset: -40; } }
                @keyframes imtidad-scan-h { 0%{transform:translateY(-5%);opacity:0.6} 50%{opacity:0.9} 100%{transform:translateY(105%);opacity:0.4} }
                @keyframes imtidad-pulse-ring { 0%{r:12;opacity:0.6} 100%{r:38;opacity:0} }
                @keyframes imtidad-glow-breathe { 0%,100%{opacity:0.3} 50%{opacity:0.9} }
                @keyframes imtidad-corner-blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
                @keyframes imtidad-radar-sweep { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                @keyframes imtidad-fade-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
                @keyframes imtidad-glitch { 0%,94%,100%{transform:translate(0)} 95%{transform:translate(-2px,1px)} 97%{transform:translate(2px,-1px)} }
              `}</style>

              {/* Animated scan line */}
              <div style={{
                position:'absolute', left:0, right:0, height:'2px', pointerEvents:'none', zIndex:6,
                background:'linear-gradient(90deg,transparent 0%,rgba(0,220,255,0.6) 30%,rgba(0,255,200,0.8) 50%,rgba(0,220,255,0.6) 70%,transparent 100%)',
                boxShadow:'0 0 12px rgba(0,220,255,0.8)',
                animation:'imtidad-scan-h 4s ease-in-out infinite',
              }} />

              {/* CRT Scanline texture */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.008) 2px, rgba(0,200,255,0.008) 4px)',
              }} />
              {/* Vignette */}
              <div style={{
                position:'absolute', inset:0, pointerEvents:'none', zIndex:3,
                background:'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)'
              }} />
              {/* Corner HUD brackets */}
              {[{t:'0',l:'0',bt:'borderTop',bl:'borderLeft'},{t:'0',r:'0',bt:'borderTop',bl:'borderRight'},{b:'0',l:'0',bt:'borderBottom',bl:'borderLeft'},{b:'0',r:'0',bt:'borderBottom',bl:'borderRight'}].map((c,i) => (
                <div key={i} style={{
                  position:'absolute',
                  top:c.t, right:c.r, bottom:c.b, left:c.l,
                  width:24, height:24, pointerEvents:'none', zIndex:8,
                  [c.bt]:'2px solid rgba(0,200,255,0.7)',
                  [c.bl]:'2px solid rgba(0,200,255,0.7)',
                  animation:'imtidad-corner-blink 3s ease-in-out infinite'
                }} />
              ))}
              {/* HUD top bar */}
              <div style={{
                position:'absolute', top:0, left:0, right:0, height:'28px',
                background:'linear-gradient(180deg, rgba(0,20,35,0.95) 0%, transparent 100%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                pointerEvents:'none', zIndex:7
              }}>
                <div style={{ fontSize:'0.6rem', letterSpacing:'0.25em', color:'rgba(0,200,255,0.75)', fontFamily:'monospace', textTransform:'uppercase', animation:'imtidad-glitch 6s infinite' }}>
                  ◆ IMTIDAD LOGISTICS NETWORK  v2.1 ◆ LIVE FEED ◆
                </div>
              </div>
              {/* HUD bottom bar */}
              <div style={{
                position:'absolute', bottom:0, left:0, right:0, height:'26px',
                background:'linear-gradient(0deg, rgba(0,20,35,0.95) 0%, transparent 100%)',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'0 10px', pointerEvents:'none', zIndex:7
              }}>
                <div style={{ fontSize:'0.58rem', letterSpacing:'0.12em', color:'rgba(0,200,255,0.5)', fontFamily:'monospace' }}>
                  SYS:{outlets.length} NODES | {orders.filter(o=>o.status==='In Transit').length} IN-TRANSIT
                </div>
                <div style={{ fontSize:'0.58rem', letterSpacing:'0.12em', color:'rgba(197,168,128,0.6)', fontFamily:'monospace' }}>
                  ZOOM: {(mapZoom*100).toFixed(0)}% ◆ SCROLL·ZOOM ◆ DRAG·PAN
                </div>
              </div>

              {/* Loading overlay */}
              {loadingOutlets && (
                <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem',color:'#00c8ff',zIndex:10,background:'rgba(2,12,21,0.85)',backdropFilter:'blur(4px)' }}>
                  <RefreshCw size={32} className="spin-anim" />
                  <div style={{fontFamily:'monospace',letterSpacing:'0.1em',fontSize:'0.8rem'}}>INITIALIZING NETWORK GRID...</div>
                </div>
              )}

              {/* Main zoomable/pannable SVG */}
              <svg
                width="100%" height="100%"
                viewBox="0 0 450 480"
                style={{ display:'block', position:'relative', zIndex:2 }}
              >
                <defs>
                  <filter id="im-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                  <filter id="im-glow-gold" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="5" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                  <filter id="im-glow-red" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="7" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                  <filter id="im-nile-glow" x="-20%" y="-10%" width="140%" height="120%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                  <radialGradient id="im-hub-aura-high" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(239,68,68,0.7)"/>
                    <stop offset="100%" stopColor="rgba(239,68,68,0)"/>
                  </radialGradient>
                  <radialGradient id="im-hub-aura-med" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(249,115,22,0.6)"/>
                    <stop offset="100%" stopColor="rgba(249,115,22,0)"/>
                  </radialGradient>
                  <radialGradient id="im-hub-aura-low" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(197,168,128,0.5)"/>
                    <stop offset="100%" stopColor="rgba(197,168,128,0)"/>
                  </radialGradient>
                  <radialGradient id="im-bg-grad" cx="40%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#0a2035"/>
                    <stop offset="100%" stopColor="#020c15"/>
                  </radialGradient>
                </defs>

                {/* Pannable/zoomable group */}
                <g transform={`translate(${mapPan.x},${mapPan.y}) scale(${mapZoom})`}
                   style={{ transformOrigin: '225px 240px' }}>

                  {/* ── Background ── */}
                  <rect width="450" height="480" fill="url(#im-bg-grad)" />

                  {/* Fine grid */}
                  {Array.from({length:10},(_,i)=>(i+1)*45).map(x=>(
                    <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={480} stroke="rgba(0,200,255,0.04)" strokeWidth="0.5"/>
                  ))}
                  {Array.from({length:10},(_,i)=>(i+1)*48).map(y=>(
                    <line key={`gy${y}`} x1={0} y1={y} x2={450} y2={y} stroke="rgba(0,200,255,0.04)" strokeWidth="0.5"/>
                  ))}

                  {/* ── Egypt outline ── */}
                  <polygon
                    points="100,80 200,68 262,68 322,78 362,90 392,132 402,182 397,252 382,312 362,362 332,402 280,420 200,420 158,402 128,372 88,302 68,222 63,152 78,112"
                    fill="rgba(197,168,128,0.05)"
                    stroke="rgba(197,168,128,0.4)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    filter="url(#im-glow-gold)"
                  />
                  {/* Egypt border glow copy */}
                  <polygon
                    points="100,80 200,68 262,68 322,78 362,90 392,132 402,182 397,252 382,312 362,362 332,402 280,420 200,420 158,402 128,372 88,302 68,222 63,152 78,112"
                    fill="none"
                    stroke="rgba(197,168,128,0.12)"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />

                  {/* ── Nile River (glowing) ── */}
                  <polyline
                    points="282,420 277,382 267,352 252,312 242,272 232,232 222,192 217,157 212,122 217,97 222,78"
                    fill="none"
                    stroke="rgba(0,150,255,0.55)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#im-nile-glow)"
                  />
                  {/* Nile highlight */}
                  <polyline
                    points="282,420 277,382 267,352 252,312 242,272 232,232 222,192 217,157 212,122 217,97 222,78"
                    fill="none"
                    stroke="rgba(100,200,255,0.25)"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />

                  {/* Nile Delta */}
                  <polygon
                    points="222,78 200,68 148,73 118,83 148,118 185,128 222,118 242,108"
                    fill="rgba(0,200,120,0.07)"
                    stroke="rgba(0,230,140,0.25)"
                    strokeWidth="1"
                  />

                  {/* ── Sea labels ── */}
                  <text x="80" y="54" fontSize="7" fill="rgba(100,180,255,0.5)" fontFamily="monospace" letterSpacing="1.5">MEDITERRANEAN SEA</text>
                  <text x="330" y="240" fontSize="6.5" fill="rgba(100,180,255,0.4)" fontFamily="monospace" letterSpacing="0.5" transform="rotate(72,330,240)">RED SEA</text>
                  <text x="68" y="390" fontSize="6" fill="rgba(100,180,255,0.3)" fontFamily="monospace" letterSpacing="0.5">W. DESERT</text>

                  {/* ── City reference markers ── */}
                  {[
                    {label:'CAIRO',      x:250,y:148},
                    {label:'GIZA',       x:225,y:168},
                    {label:'BANHA',      x:241,y:133},
                    {label:'TANTA',      x:205,y:118},
                    {label:'ALEX',       x:145,y:103},
                    {label:'SUEZ',       x:307,y:163},
                    {label:'P.SAID',     x:320,y:84},
                    {label:'MANSOURA',   x:257,y:108},
                    {label:'LUXOR',      x:283,y:335},
                    {label:'ASWAN',      x:298,y:385},
                  ].map(c=>(
                    <g key={c.label} opacity="0.65">
                      <circle cx={c.x} cy={c.y} r={2} fill="rgba(0,200,255,0.3)" stroke="rgba(0,200,255,0.6)" strokeWidth="0.5"/>
                      <line x1={c.x-5} y1={c.y} x2={c.x+5} y2={c.y} stroke="rgba(0,200,255,0.3)" strokeWidth="0.6"/>
                      <line x1={c.x} y1={c.y-5} x2={c.x} y2={c.y+5} stroke="rgba(0,200,255,0.3)" strokeWidth="0.6"/>
                      <text x={c.x+7} y={c.y-3} fontSize="5.5" fill="rgba(0,220,255,0.7)" fontFamily="monospace">{c.label}</text>
                    </g>
                  ))}

                  {/* ── Route connections ── */}
                  {getDynamicRoutes().map((route, idx) => {
                    const load = route.load;
                    const strokeColor = load==='High' ? 'rgba(239,68,68,0.6)' : load==='Medium' ? 'rgba(249,115,22,0.5)' : 'rgba(0,200,255,0.35)';
                    const glowColor  = load==='High' ? 'rgba(239,68,68,0.15)' : load==='Medium' ? 'rgba(249,115,22,0.12)' : 'rgba(0,200,255,0.1)';
                    return (
                      <g key={idx}>
                        {/* Glow backdrop */}
                        <line x1={route.from.x} y1={route.from.y} x2={route.to.x} y2={route.to.y}
                          stroke={glowColor} strokeWidth={heatmapMode ? 12 : 6} />
                        {/* Animated dashed route */}
                        <line x1={route.from.x} y1={route.from.y} x2={route.to.x} y2={route.to.y}
                          stroke={strokeColor} strokeWidth={heatmapMode ? 2 : 1.5}
                          strokeDasharray="8 4"
                          style={{ animation: 'imtidad-route-dash 1.2s linear infinite' }}/>
                      </g>
                    );
                  })}

                  {/* ── Station nodes ── */}
                  {outlets.map((hub) => {
                    const isSelectedDropoff = bookingForm.dropoffOutlet === hub.key;
                    const isSelectedPickup  = bookingForm.pickupOutlet  === hub.key;
                    const isActive = hub.status === 'Active';
                    const loadVal  = getHubLoad(hub.key);
                    const isHovered = hoveredHub === hub.key;

                    const nodeColor = !isActive ? 'rgba(74,85,104,0.5)'
                      : heatmapMode
                        ? (loadVal>=80 ? '#ef4444' : loadVal>=50 ? '#f97316' : '#c5a880')
                        : (hub.key==='eltalg'||hub.key==='tegara'||hub.key==='mostashfa') ? '#f97316' : '#3b82f6';

                    const auraId = loadVal>=80 ? 'im-hub-aura-high' : loadVal>=50 ? 'im-hub-aura-med' : 'im-hub-aura-low';
                    const glowId = loadVal>=80 ? 'im-glow-red' : 'im-glow-gold';

                    return (
                      <g key={hub.id}
                        style={{ cursor: isActive ? 'pointer' : 'not-allowed' }}
                        onClick={(e) => { e.stopPropagation(); isActive && handleSelectMapHub(hub.key, isSelectedDropoff ? 'pickup' : 'dropoff'); }}
                        onMouseEnter={() => setHoveredHub(hub.key)}
                        onMouseLeave={() => setHoveredHub(null)}
                      >
                        {/* Radial aura / heat cloud */}
                        {isActive && heatmapMode && (
                          <circle cx={hub.x} cy={hub.y} r={30} fill={`url(#${auraId})`} opacity="0.6" />
                        )}

                        {/* Radar pulse ring (animated) */}
                        {isActive && (
                          <circle cx={hub.x} cy={hub.y} r={10} fill="none"
                            stroke={nodeColor} strokeWidth="1.5" opacity="0.7"
                            style={{ animation: `imtidad-radar ${loadVal>=80?'1.2s':'2s'} ease-out infinite` }}
                          />
                        )}

                        {/* Selection ring – dropoff (gold) */}
                        {isSelectedDropoff && (
                          <circle cx={hub.x} cy={hub.y} r={20} fill="none"
                            stroke="#c5a880" strokeWidth="2" strokeDasharray="5 3"
                            style={{ animation: 'spin 8s linear infinite', transformOrigin: `${hub.x}px ${hub.y}px` }}
                          />
                        )}
                        {/* Selection ring – pickup (green) */}
                        {isSelectedPickup && (
                          <circle cx={hub.x} cy={hub.y} r={22} fill="none"
                            stroke="#4ade80" strokeWidth="2" strokeDasharray="5 3"
                            style={{ animation: 'spin 10s linear infinite reverse', transformOrigin: `${hub.x}px ${hub.y}px` }}
                          />
                        )}

                        {/* Core node */}
                        <circle cx={hub.x} cy={hub.y}
                          r={isHovered ? 13 : isActive ? 10 : 7}
                          fill={nodeColor}
                          filter={isActive ? `url(#${glowId})` : 'none'}
                          stroke={isHovered ? 'white' : 'rgba(0,0,0,0.4)'}
                          strokeWidth={isHovered ? 2 : 1}
                          style={{ transition: 'r 0.2s ease' }}
                        />
                        {/* Inner dot */}
                        <circle cx={hub.x} cy={hub.y} r={3} fill="white" opacity="0.9"/>

                        {/* Label pill */}
                        <g>
                          <rect x={hub.x - 44} y={hub.y - 28} width={88} height={14} rx={3}
                            fill="rgba(2,15,28,0.92)"
                            stroke={isSelectedDropoff ? '#c5a880' : isSelectedPickup ? '#4ade80' : 'rgba(0,200,255,0.2)'}
                            strokeWidth={isSelectedDropoff||isSelectedPickup ? 1.5 : 0.8}
                          />
                          <text x={hub.x} y={hub.y - 18}
                            fill={isActive ? (isSelectedDropoff ? '#c5a880' : isSelectedPickup ? '#4ade80' : 'rgba(220,240,255,0.95)') : 'rgba(150,150,150,0.6)'}
                            fontSize="7.5" fontWeight="700" textAnchor="middle" fontFamily="monospace"
                          >
                            {isRtl ? hub.nameAr.split(' ').slice(0,2).join(' ') : hub.nameEn}
                            {!isActive && ' [OFF]'}
                          </text>
                        </g>

                        {/* Hover tooltip */}
                        {isHovered && isActive && (
                          <g>
                            <rect x={hub.x - 60} y={hub.y + 16} width={120} height={32} rx={5}
                              fill="rgba(2,15,28,0.97)" stroke="rgba(0,200,255,0.4)" strokeWidth={1}/>
                            <text x={hub.x} y={hub.y + 29} fontSize="7" fill="rgba(0,220,255,0.9)" textAnchor="middle" fontFamily="monospace">
                              LOAD: {loadVal}% | {hub.city}
                            </text>
                            <text x={hub.x} y={hub.y + 41} fontSize="6.5" fill="rgba(197,168,128,0.8)" textAnchor="middle" fontFamily="monospace">
                              {isSelectedDropoff ? '◆ DROP-OFF SELECTED' : isSelectedPickup ? '◆ PICKUP SELECTED' : 'CLICK TO SELECT'}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* ── Zoom Controls ── */}
              <div style={{
                position:'absolute', top:'50%', right:14, transform:'translateY(-50%)',
                display:'flex', flexDirection:'column', gap:6, zIndex:10
              }}>
                {[
                  { label:'+', action: handleMapZoomIn,  title:'Zoom In' },
                  { label:'⊙', action: handleMapReset,   title:'Reset View' },
                  { label:'−', action: handleMapZoomOut, title:'Zoom Out' },
                ].map(btn=>(
                  <button key={btn.label} onClick={btn.action} title={btn.title} style={{
                    width:34, height:34,
                    background:'rgba(0,30,50,0.92)',
                    border:'1px solid rgba(0,200,255,0.35)',
                    borderRadius:8,
                    color:'rgba(0,200,255,0.9)',
                    fontSize: btn.label==='⊙' ? '1rem' : '1.4rem',
                    fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    backdropFilter:'blur(8px)',
                    transition:'all 0.2s',
                    boxShadow:'0 0 8px rgba(0,200,255,0.15)'
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,200,255,0.15)'; e.currentTarget.style.boxShadow='0 0 14px rgba(0,200,255,0.4)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,30,50,0.92)'; e.currentTarget.style.boxShadow='0 0 8px rgba(0,200,255,0.15)'; }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* ── Map Legend ── */}
              <div style={{
                position:'absolute', bottom:20, left:14,
                background:'rgba(2,12,21,0.92)',
                border:'1px solid rgba(0,200,255,0.2)',
                padding:'0.6rem 0.8rem',
                borderRadius:'10px',
                display:'flex', flexDirection:'column', gap:'0.35rem',
                fontSize:'0.68rem', color:'white',
                backdropFilter:'blur(12px)',
                zIndex:5,
                fontFamily:'monospace'
              }}>
                <div style={{fontWeight:700, color:'rgba(0,200,255,0.8)', borderBottom:'1px solid rgba(0,200,255,0.15)', paddingBottom:'0.2rem', marginBottom:'0.15rem', letterSpacing:'0.1em'}}>
                  {isRtl ? 'مفتاح الخريطة' : 'NETWORK LEGEND'}
                </div>
                {heatmapMode ? (
                  <>
                    {[['#ef4444','High Load (Busy)','حجم مرتفع'],['#f97316','Medium Load','حجم متوسط'],['#c5a880','Low Load','حجم منخفض']].map(([col,en,ar])=>(
                      <div key={col} style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:col,boxShadow:`0 0 6px ${col}`}}/>
                        <span style={{color:'rgba(200,225,255,0.8)'}}>{isRtl?ar:en}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[['#f97316','FCF Live Stations','فروع FCF'],['#3b82f6','Regional Hubs','محاور إقليمية'],['rgba(74,85,104,0.7)','Inactive','غير نشط']].map(([col,en,ar])=>(
                      <div key={en} style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:col,boxShadow:`0 0 4px ${col}`}}/>
                        <span style={{color:'rgba(200,225,255,0.8)'}}>{isRtl?ar:en}</span>
                      </div>
                    ))}
                  </>
                )}
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:2}}>
                  <div style={{width:8,height:8,borderRadius:'50%',border:'1.5px solid #c5a880'}}/>
                  <span style={{color:'#c5a880'}}>{isRtl?'محطة التسليم':'Drop-off'}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',border:'1.5px solid #4ade80'}}/>
                  <span style={{color:'#4ade80'}}>{isRtl?'محطة الاستلام':'Pickup'}</span>
                </div>
              </div>
            </div>
          </div>





          {/* Booking Form Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} style={{ color: '#c5a880' }} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {t('bookingWizard')}
              </h2>
            </div>

            {submitError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Dynamic Drop-off & Pickup Station selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{t('dropoffOutlet')}</label>
                  <select 
                    className="input-field" 
                    value={bookingForm.dropoffOutlet}
                    onChange={(e) => handleSelectMapHub(e.target.value, 'dropoff')}
                    style={{ border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  >
                    <option value="">{isRtl ? '-- اختر محطة --' : '-- Select Station --'}</option>
                    {activeOutletsList.map(h => (
                      <option key={h.id} value={h.key}>{isRtl ? h.nameAr : h.nameEn} ({h.city})</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('pickupOutlet')}</label>
                  <select 
                    className="input-field" 
                    value={bookingForm.pickupOutlet}
                    onChange={(e) => handleSelectMapHub(e.target.value, 'pickup')}
                    style={{ border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  >
                    <option value="">{isRtl ? '-- اختر محطة --' : '-- Select Station --'}</option>
                    {activeOutletsList.map(h => (
                      <option key={h.id} value={h.key}>{isRtl ? h.nameAr : h.nameEn} ({h.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sender details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c5a880' }}>{t('senderDetails')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <input 
                      required 
                      type="text" 
                      className="input-field" 
                      placeholder={isRtl ? 'اسم المرسل' : 'Sender Name'}
                      value={bookingForm.senderName}
                      onChange={(e) => setBookingForm({ ...bookingForm, senderName: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <input 
                      required 
                      type="tel" 
                      className="input-field" 
                      placeholder={isRtl ? 'رقم هاتف المرسل' : 'Sender Phone'}
                      value={bookingForm.senderPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, senderPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Recipient details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c5a880' }}>{t('recipientDetails')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <input 
                      required 
                      type="text" 
                      className="input-field" 
                      placeholder={isRtl ? 'اسم المستلم' : 'Recipient Name'}
                      value={bookingForm.recipientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, recipientName: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <input 
                      required 
                      type="tel" 
                      className="input-field" 
                      placeholder={isRtl ? 'رقم هاتف المستلم' : 'Recipient Phone'}
                      value={bookingForm.recipientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, recipientPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c5a880' }}>{t('packageDetails')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                  <div className="input-group">
                    <input 
                      required 
                      type="text" 
                      className="input-field" 
                      placeholder={isRtl ? 'وصف محتويات الطرد' : 'Package Content Description'}
                      value={bookingForm.description}
                      onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.7rem' }}>{t('weightKg')}</label>
                    <input 
                      required 
                      type="number" 
                      step="0.1" 
                      min="0.1"
                      className="input-field" 
                      value={bookingForm.weight}
                      onChange={(e) => setBookingForm({ ...bookingForm, weight: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.7rem' }}>{t('packageSize')}</label>
                    <select 
                      className="input-field" 
                      value={bookingForm.size}
                      onChange={(e) => setBookingForm({ ...bookingForm, size: e.target.value })}
                    >
                      <option value="S">{t('small')}</option>
                      <option value="M">{t('medium')}</option>
                      <option value="L">{t('big')}</option>
                    </select>
                  </div>
                </div>
                
                <div className="input-group" style={{ marginTop: '0.5rem' }}>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder={isRtl ? 'قيمة المحتويات المصرح بها (بالجنيه المصري)' : 'Declared Value of Contents (EGP)'}
                    value={bookingForm.totalValue || ''}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalValue: parseFloat(e.target.value || 0) })}
                  />
                </div>
              </div>

              {/* Bottom pricing section */}
              <div style={{ 
                marginTop: '1rem', 
                borderTop: '1px dashed var(--border-color)', 
                paddingTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.15)',
                margin: '1rem -1.75rem -1.75rem',
                padding: '1.25rem 1.75rem',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRtl ? 'سعر الشحن التقريبي:' : 'Estimated Shipping Cost:'}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c5a880' }}>
                    {estimateCost()} <span style={{ fontSize: '0.9rem' }}>EGP</span>
                  </span>
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  disabled={!bookingForm.dropoffOutlet || !bookingForm.pickupOutlet}
                  style={{ 
                    background: '#c5a880', 
                    color: '#071b2d', 
                    fontWeight: 700, 
                    padding: '0.85rem 2rem', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(197, 168, 128, 0.25)',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: (!bookingForm.dropoffOutlet || !bookingForm.pickupOutlet) ? 0.5 : 1
                  }}
                >
                  {isRtl ? 'تأكيد وحجز الشحنة' : 'Book & Dispatch Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. SHIPMENTS DASHBOARD TABLE TAB                        */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'dashboard' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={isRtl ? 'ابحث برقم التتبع، الاسم، الهاتف...' : 'Search by tracking ID, names, phones...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem', border: '1px solid var(--border-color)' }}
                />
              </div>

              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '180px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
              >
                <option value="All">{isRtl ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="Pending Drop-off">{isRtl ? 'بانتظار الإيداع' : 'Pending Drop-off'}</option>
                <option value="At Drop-off Station">{isRtl ? 'تم الإيداع بالمحطة' : 'At Drop-off Station'}</option>
                <option value="In Transit">{isRtl ? 'قيد التوصيل' : 'In Transit'}</option>
                <option value="Ready for Pickup">{isRtl ? 'جاهز للاستلام' : 'Ready for Pickup'}</option>
                <option value="Picked Up">{isRtl ? 'تم الاستلام' : 'Picked Up'}</option>
                <option value="Cancelled">{isRtl ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>

            <button 
              className="btn btn-outline" 
              onClick={fetchOrders}
              disabled={loadingOrders}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}
            >
              <RefreshCw size={16} className={loadingOrders ? 'spin-anim' : ''} />
              {isRtl ? 'تحديث البيانات' : 'Refresh'}
            </button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>{t('trackingId')}</th>
                  <th style={{ padding: '1rem' }}>{isRtl ? 'المسار (من -> إلى)' : 'Route (From -> To)'}</th>
                  <th style={{ padding: '1rem' }}>{t('sender')}</th>
                  <th style={{ padding: '1rem' }}>{isRtl ? 'المستلم' : 'Recipient'}</th>
                  <th style={{ padding: '1rem' }}>{t('value')} / {t('weightKg')}</th>
                  <th style={{ padding: '1rem' }}>{t('shippingCost')}</th>
                  <th style={{ padding: '1rem' }}>{t('status')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{isRtl ? 'تعديل الحالة' : 'Modify Status'}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 1rem' }} />
                      <div>{isRtl ? 'جاري تحميل شحنات امتداد...' : 'Loading Imtidad Shipments...'}</div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const dropoffHub = outlets.find(h => h.key === order.dropoffOutlet);
                    const pickupHub = outlets.find(h => h.key === order.pickupOutlet);
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: '#c5a880' }}>{order.id}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <span>{dropoffHub ? (isRtl ? dropoffHub.nameAr.split(' ')[0] : dropoffHub.nameEn) : 'Unknown'}</span>
                            <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{pickupHub ? (isRtl ? pickupHub.nameAr.split(' ')[0] : pickupHub.nameEn) : 'Unknown'}</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {order.senderCity} {' \u2192 '} {order.recipientCity}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{order.senderName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.senderPhone}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{order.recipientName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.recipientPhone}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                          <div>{order.description}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {order.weight} kg | Size: {order.size}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{order.shippingCost} EGP</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={getStatusBadgeStyle(order.status)}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            disabled={actionLoading === order.id}
                            style={{ 
                              padding: '0.35rem 0.5rem', 
                              borderRadius: '8px', 
                              background: 'var(--bg-overlay)', 
                              color: 'white', 
                              border: '1px solid var(--border-color)',
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Pending Drop-off">Pending Drop-off</option>
                            <option value="At Drop-off Station">At Drop-off Station</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Ready for Pickup">Ready for Pickup</option>
                            <option value="Picked Up">Picked Up</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setCreatedOrder(order);
                                setShowInvoiceModal(true);
                              }}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem', borderRadius: '8px' }}
                              title={isRtl ? 'طباعة البوليسة' : 'Print Label'}
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={actionLoading === order.id}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem', borderRadius: '8px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. LOGISTICS STATS & NETWORK CHARTS                     */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(197, 168, 128, 0.1)', color: '#c5a880', borderRadius: '12px' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'عائدات الشحن الإجمالية' : 'Total Shipping Revenue'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.2rem' }}>
                  {orders.reduce((acc, curr) => acc + curr.shippingCost, 0)} <span style={{ fontSize: '0.85rem' }}>EGP</span>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', borderRadius: '12px' }}>
                <Truck size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'متوسط وزن الطرد' : 'Average Package Weight'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.2rem' }}>
                  {orders.length > 0 
                    ? (orders.reduce((acc, curr) => acc + curr.weight, 0) / orders.length).toFixed(2)
                    : '0.00'} <span style={{ fontSize: '0.85rem' }}>kg</span>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderRadius: '12px' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'معدل نجاح التسليم' : 'Success Delivery Rate'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.2rem' }}>
                  {orders.length > 0
                    ? Math.round((orders.filter(o => o.status === 'Picked Up').length / orders.length) * 100)
                    : 0}%
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '12px' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{isRtl ? 'شحنات ملغاة' : 'Cancelled Shipments'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.2rem' }}>
                  {orders.filter(o => o.status === 'Cancelled').length}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {isRtl ? 'حجم طرود المحطات النشطة' : 'Active Hub Shipments Volume'}
              </h3>
              <div style={{ width: '100%', height: '280px' }}>
                {loadingOutlets ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw className="spin-anim" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={routeChartData}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px' }} />
                      <Bar dataKey={isRtl ? 'شحنات صادرة' : 'Outgoing Shipments'} fill="#c5a880" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={isRtl ? 'شحنات واردة' : 'Incoming Shipments'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '340px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {isRtl ? 'حالة السعة الاستيعابية للفروع' : 'Hub Outlets Capacity Status'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {outlets.map(hub => {
                  const loadVal = getHubLoad(hub.key);
                  return (
                    <div key={hub.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>{isRtl ? hub.nameAr : hub.nameEn}</span>
                        <span style={{ color: getHeatmapColor(loadVal), fontWeight: 'bold' }}>{loadVal}% {isRtl ? 'مستغل' : 'Occupied'}</span>
                      </div>
                      
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${loadVal}%`, 
                          background: getHeatmapColor(loadVal), 
                          borderRadius: '4px',
                          boxShadow: `0 0 8px ${getHeatmapGlow(loadVal)}`,
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. OUTLETS MANAGEMENT TAB                                */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'outlets_mgmt' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Outlets List Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {isRtl ? 'قائمة الفروع المسجلة' : 'Registered Stations Network'}
              </h2>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder={isRtl ? 'بحث بالفروع...' : 'Search stations...'}
                  value={outletSearchQuery}
                  onChange={(e) => setOutletSearchQuery(e.target.value)}
                  style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '2.2rem', paddingHeight: '32px', height: '34px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem' }}>{isRtl ? 'الرمز' : 'Key'}</th>
                    <th style={{ padding: '0.75rem' }}>{isRtl ? 'اسم الفرع' : 'Name'}</th>
                    <th style={{ padding: '0.75rem' }}>{isRtl ? 'المدينة' : 'City'}</th>
                    <th style={{ padding: '0.75rem' }}>{isRtl ? 'الإحداثيات' : 'Coords'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('status')}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOutlets ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        <RefreshCw className="spin-anim" style={{ margin: '0 auto' }} />
                      </td>
                    </tr>
                  ) : filteredOutlets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        {t('noData')}
                      </td>
                    </tr>
                  ) : (
                    filteredOutlets.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: o.status === 'Active' ? 1 : 0.6 }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{o.key}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div>{o.nameEn}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.nameAr}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{o.city}</td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>X:{o.x}, Y:{o.y}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleToggleOutletStatus(o.id, o.status)}
                            className="btn btn-outline"
                            style={{ 
                              padding: '0.2rem 0.5rem', 
                              fontSize: '0.7rem', 
                              borderColor: o.status === 'Active' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)',
                              color: o.status === 'Active' ? '#34d399' : '#f87171',
                              background: o.status === 'Active' ? 'rgba(52,211,153,0.02)' : 'rgba(239,68,68,0.02)',
                              borderRadius: '8px'
                            }}
                          >
                            {o.status === 'Active' ? <Eye size={12} style={{ marginRight: '2px' }} /> : <EyeOff size={12} style={{ marginRight: '2px' }} />}
                            {o.status}
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {/* Live stations cannot be deleted to avoid breaking operations */}
                          {(o.key === 'eltalg' || o.key === 'tegara' || o.key === 'mostashfa') ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{isRtl ? 'أساسي' : 'Live Static'}</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteOutlet(o.id)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem', borderRadius: '6px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.15)' }}
                              title="Delete Station"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add New Station Form with Click-to-Place Picker Map */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} style={{ color: '#c5a880' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {t('addOutlet')}
              </h2>
            </div>

            {outletError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                {outletError}
              </div>
            )}

            {outletSuccess && (
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#a7f3d0', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <CheckCircle size={16} />
                {isRtl ? 'تم إضافة محطة الشحن بنجاح!' : 'Logistics station added successfully!'}
              </div>
            )}

            <form onSubmit={handleCreateOutlet} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{t('stationKey')}</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    placeholder="e.g. cairo_east"
                    value={newOutletForm.key}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, key: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('cityEn')}</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    placeholder="e.g. Cairo"
                    value={newOutletForm.city}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{t('stationNameEn')}</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    placeholder="e.g. Cairo East Station"
                    value={newOutletForm.nameEn}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, nameEn: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('stationNameAr')}</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    placeholder="مثال: محطة شرق القاهرة"
                    value={newOutletForm.nameAr}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, nameAr: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">X Coords</label>
                  <input
                    required
                    type="number"
                    className="input-field"
                    value={newOutletForm.x}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, x: parseInt(e.target.value || 200) })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Y Coords</label>
                  <input
                    required
                    type="number"
                    className="input-field"
                    value={newOutletForm.y}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, y: parseInt(e.target.value || 200) })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('baseLoadPercentage')}</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    value={newOutletForm.baseLoad}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, baseLoad: parseInt(e.target.value || 50) })}
                  />
                </div>
              </div>

              {/* Click-to-Place Map Picker (Form Helper) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span className="input-label">{isRtl ? 'انقر على الخريطة لتحديد الموقع تلقائياً:' : 'Click on the map to set X & Y layout position:'}</span>
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '240px', 
                  background: '#04101b', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  overflow: 'hidden'
                }}>
                  <svg width="100%" height="100%" viewBox="0 0 450 420" onClick={handleMapPlacementClick} style={{ cursor: 'crosshair', display: 'block' }}>
                    {/* Ocean/background */}
                    <rect width="450" height="420" fill="#061624" />

                    {/* Subtle coordinate grid */}
                    {[50,100,150,200,250,300,350,400].map(x => (
                      <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={420} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    ))}
                    {[50,100,150,200,250,300,350,400].map(y => (
                      <line key={`gy${y}`} x1={0} y1={y} x2={450} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    ))}

                    {/* Mediterranean Sea label */}
                    <text x="90" y="55" fontSize="8" fill="rgba(100,180,255,0.5)" fontFamily="sans-serif" letterSpacing="1">MEDITERRANEAN SEA</text>
                    {/* Red Sea label */}
                    <text x="330" y="230" fontSize="7" fill="rgba(100,180,255,0.45)" fontFamily="sans-serif" letterSpacing="0.5" transform="rotate(70,330,230)">RED SEA</text>

                    {/* Egypt simplified polygon outline */}
                    <polygon
                      points="
                        100,80  200,70  260,70  320,80  360,90
                        390,130 400,180 395,250 380,310
                        360,360 330,400 280,415
                        200,415 160,400 130,370
                        90,300  70,220  65,150  80,110
                      "
                      fill="rgba(197,168,128,0.08)"
                      stroke="rgba(197,168,128,0.35)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />

                    {/* Nile River (simplified) */}
                    <polyline
                      points="280,415 275,380 265,350 250,310 240,270 230,230 220,190 215,155 210,120 215,95 220,80"
                      fill="none"
                      stroke="rgba(100,180,255,0.3)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Nile Delta fan */}
                    <polygon
                      points="220,80 200,70 150,75 120,85 150,120 185,130 220,120 240,110"
                      fill="rgba(100,200,120,0.07)"
                      stroke="rgba(100,200,120,0.2)"
                      strokeWidth="1"
                    />

                    {/* City reference crosshair markers */}
                    {[
                      { label: 'Alexandria', x: 120, y: 90, abbr: 'ALX' },
                      { label: 'Cairo', x: 230, y: 140, abbr: 'CAI' },
                      { label: 'Giza', x: 215, y: 160, abbr: 'GIZ' },
                      { label: 'Tanta', x: 200, y: 110, abbr: 'TAN' },
                      { label: 'Banha', x: 230, y: 125, abbr: 'BNH' },
                      { label: 'Suez', x: 280, y: 155, abbr: 'SUZ' },
                      { label: 'Luxor', x: 260, y: 320, abbr: 'LXR' },
                      { label: 'Aswan', x: 280, y: 370, abbr: 'ASW' },
                      { label: 'Port Said', x: 290, y: 80, abbr: 'PSD' },
                      { label: 'Mansoura', x: 240, y: 100, abbr: 'MAN' },
                    ].map(city => (
                      <g key={city.abbr}>
                        <line x1={city.x - 5} y1={city.y} x2={city.x + 5} y2={city.y} stroke="rgba(197,168,128,0.4)" strokeWidth="0.8" />
                        <line x1={city.x} y1={city.y - 5} x2={city.x} y2={city.y + 5} stroke="rgba(197,168,128,0.4)" strokeWidth="0.8" />
                        <circle cx={city.x} cy={city.y} r={2.5} fill="rgba(197,168,128,0.3)" />
                        <text x={city.x + 6} y={city.y - 4} fontSize="6.5" fill="rgba(197,168,128,0.7)" fontFamily="sans-serif">{city.label}</text>
                      </g>
                    ))}

                    {/* Existing outlet stations (labeled, larger) */}
                    {outlets.map(o => (
                      <g key={o.id}>
                        <circle
                          cx={o.x} cy={o.y} r={8}
                          fill={o.status === 'Active' ? 'rgba(197,168,128,0.25)' : 'rgba(100,100,100,0.15)'}
                          stroke={o.status === 'Active' ? 'rgba(197,168,128,0.7)' : 'rgba(130,130,130,0.35)'}
                          strokeWidth="1.5"
                          style={o.status === 'Active' ? { filter: 'drop-shadow(0 0 4px rgba(197,168,128,0.5))' } : {}}
                        />
                        <circle cx={o.x} cy={o.y} r={3} fill={o.status === 'Active' ? '#c5a880' : '#555'} />
                        <text
                          x={o.x + 11} y={o.y + 4}
                          fontSize="7.5"
                          fill={o.status === 'Active' ? 'rgba(255,230,180,0.9)' : 'rgba(160,160,160,0.6)'}
                          fontFamily="sans-serif"
                          fontWeight="600"
                        >
                          {o.nameEn.length > 14 ? o.nameEn.substring(0, 14) + '…' : o.nameEn}
                        </text>
                      </g>
                    ))}

                    {/* New placement indicator */}
                    <circle
                      cx={newOutletForm.x} cy={newOutletForm.y} r={10}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      style={{ filter: 'drop-shadow(0 0 5px #ef4444)' }}
                    />
                    <circle
                      cx={newOutletForm.x} cy={newOutletForm.y} r={5}
                      fill="#ef4444"
                      style={{ filter: 'drop-shadow(0 0 8px #ef4444)' }}
                    />
                    <line x1={newOutletForm.x - 14} y1={newOutletForm.y} x2={newOutletForm.x + 14} y2={newOutletForm.y} stroke="#ef4444" strokeWidth="1" opacity="0.7" />
                    <line x1={newOutletForm.x} y1={newOutletForm.y - 14} x2={newOutletForm.x} y2={newOutletForm.y + 14} stroke="#ef4444" strokeWidth="1" opacity="0.7" />
                    <text x={newOutletForm.x + 13} y={newOutletForm.y - 8} fontSize="7" fill="#ef4444" fontFamily="sans-serif" fontWeight="700">
                      {newOutletForm.nameEn || 'New Station'}
                    </text>
                  </svg>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '6px', 
                    left: '6px', 
                    right: '6px', 
                    background: 'rgba(7,27,45,0.85)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '4px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.68rem', 
                    color: 'white', 
                    textAlign: 'center', 
                    pointerEvents: 'none',
                    backdropFilter: 'blur(4px)'
                  }}>
                    {t('clickMapToPlace')} (X: {newOutletForm.x}, Y: {newOutletForm.y})
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn" 
                style={{ 
                  background: '#c5a880', 
                  color: '#071b2d', 
                  fontWeight: 700, 
                  padding: '0.75rem', 
                  borderRadius: '12px',
                  width: '100%',
                  marginTop: '0.5rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {t('addOutlet')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHIPPING INVOICE MODAL */}
      {showInvoiceModal && createdOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{ 
            width: '100%', 
            maxWidth: '520px', 
            background: 'var(--bg-main)', 
            padding: '2rem', 
            borderRadius: '20px',
            border: '2px solid #c5a880',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '0.75rem', borderRadius: '50%', marginBottom: '0.5rem' }}>
                <Check size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>
                {isRtl ? 'تم حجز وتسجيل الشحنة بنجاح!' : 'Shipment Booked Successfully!'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                {isRtl ? 'البوليسة والملصق جاهزين للطباعة الآن' : 'Shipping label and receipt are generated below.'}
              </p>
            </div>

            <div id="imtidad-print-label" style={{ 
              background: 'white', 
              color: '#071b2d', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              border: '2px solid #071b2d',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #071b2d', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img src="/imtidad_logo.png" alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>IMTIDAD C2C</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{createdOrder.id}</div>
                  <div style={{ fontSize: '0.65rem', color: '#555' }}>
                    {new Date(createdOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#555' }}>{isRtl ? 'منفذ الإيداع' : 'Drop-off Outlet'}</div>
                  <div>{outlets.find(h => h.key === createdOrder.dropoffOutlet)?.nameEn.toUpperCase() || 'UNKNOWN'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>({createdOrder.senderCity})</div>
                </div>
                <ArrowLeftRight size={18} style={{ color: '#071b2d' }} />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#555' }}>{isRtl ? 'منفذ الاستلام' : 'Pickup Outlet'}</div>
                  <div>{outlets.find(h => h.key === createdOrder.pickupOutlet)?.nameEn.toUpperCase() || 'UNKNOWN'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>({createdOrder.recipientCity})</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid #071b2d', paddingBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '0.15rem', marginBottom: '0.25rem' }}>{isRtl ? 'المرسل:' : 'SENDER:'}</div>
                  <div>{createdOrder.senderName}</div>
                  <div>{createdOrder.senderPhone}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '0.15rem', marginBottom: '0.25rem' }}>{isRtl ? 'المستلم:' : 'RECIPIENT:'}</div>
                  <div>{createdOrder.recipientName}</div>
                  <div>{createdOrder.recipientPhone}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#555' }}>{isRtl ? 'الوصف' : 'Description'}</div>
                  <div>{createdOrder.description}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#555' }}>{isRtl ? 'الوزن' : 'Weight'}</div>
                  <div>{createdOrder.weight} kg</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#555' }}>{isRtl ? 'الحجم' : 'Size'}</div>
                  <div>Size: {createdOrder.size}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #071b2d', paddingTop: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <span>{isRtl ? 'التكلفة الإجمالية:' : 'TOTAL COST:'}</span>
                <span>{createdOrder.shippingCost} EGP</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px dashed #555', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', height: '30px', width: '180px', background: 'black', marginBottom: '0.25rem', gap: '2px', padding: '0 4px', boxSizing: 'border-box' }}>
                  <div style={{ width: '4px', background: 'white' }} />
                  <div style={{ width: '8px', background: 'white' }} />
                  <div style={{ width: '2px', background: 'white' }} />
                  <div style={{ width: '12px', background: 'white' }} />
                  <div style={{ width: '4px', background: 'white' }} />
                  <div style={{ width: '6px', background: 'white' }} />
                  <div style={{ width: '10px', background: 'white' }} />
                  <div style={{ width: '2px', background: 'white' }} />
                  <div style={{ width: '14px', background: 'white' }} />
                  <div style={{ width: '6px', background: 'white' }} />
                  <div style={{ width: '8px', background: 'white' }} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px' }}>{createdOrder.id}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => {
                  const printContents = document.getElementById('imtidad-print-label').innerHTML;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Imtidad Shipping Label</title>
                        <style>
                          body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: monospace; }
                        </style>
                      </head>
                      <body onload="window.print(); window.close();">
                        <div style="width: 480px; border: 2px solid black; padding: 20px;">
                          ${printContents}
                        </div>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="btn btn-outline" 
                style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Printer size={18} />
                {isRtl ? 'اطبع بوليسة الشحن' : 'Print Label'}
              </button>
              <button 
                onClick={() => {
                  setShowInvoiceModal(false);
                  setCreatedOrder(null);
                }}
                className="btn" 
                style={{ 
                  flex: 1, 
                  background: '#c5a880', 
                  color: '#071b2d', 
                  fontWeight: 700, 
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '12px'
                }}
              >
                {isRtl ? 'إغلاق المجلد' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
