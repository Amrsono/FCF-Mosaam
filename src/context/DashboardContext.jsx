import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export const getDaysDifference = (fromDate, toDate = new Date()) => {
  if (!fromDate) return 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffTime = Math.abs(end - start);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const DashboardProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [bostaOrders, setBostaOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [basataTransactions, setBasataTransactions] = useState([]);
  const [customerReturns, setCustomerReturns] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global Filters Persistence
  const [globalFilters, setGlobalFilters] = useState(() => {
    const saved = localStorage.getItem('fcf_global_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse saved filters", e);
      }
    }
    return {
      orders: {
        searchTerm: '',
        status: 'Inventory',
        category: 'All',
        tier: 'All',
        outlet: 'All',
        dateStart: '',
        dateEnd: '',
        paymentMethod: 'All'
      },
      bosta: {
        searchTerm: '',
        status: 'Inventory',
        category: 'All',
        outlet: 'All',
        dateStart: '',
        dateEnd: ''
      },
      analytics: {
        outlet: 'All',
        dateStart: new Date().toISOString().split('T')[0],
        dateEnd: new Date().toISOString().split('T')[0]
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('fcf_global_filters', JSON.stringify(globalFilters));
  }, [globalFilters]);

  const updateFilters = (tab, newFilters) => {
    setGlobalFilters(prev => ({
      ...prev,
      [tab]: { ...prev[tab], ...newFilters }
    }));
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [oRes, bostaRes, cRes, bRes, crRes, clRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/bosta'),
        fetch('/api/customers'),
        fetch('/api/basata'),
        fetch('/api/customer-returns'),
        fetch('/api/call-logs?all=true')
      ]);

      if (oRes.ok) setOrders(await oRes.json());
      if (bostaRes.ok) setBostaOrders(await bostaRes.json());
      if (cRes.ok) setCustomers(await cRes.json());
      if (bRes.ok) setBasataTransactions(await bRes.json());
      if (crRes.ok) setCustomerReturns(await crRes.json());
      if (clRes.ok) setCallLogs(await clRes.json());

    } catch (error) {
      console.warn("Could not fetch from database.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const logUserAction = async (action, details = null) => {
    const token = localStorage.getItem('fcf_token');
    if (!token) return;
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, details })
      });
    } catch (e) {
      console.warn("Could not log user action", e);
    }
  };

  const receiveOrder = async (orderData) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        await fetchData();
        logUserAction('Receive Order', { id: orderData.id, phone: orderData.customerPhone, amount: Number(orderData.totalValue) || 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const bulkReceiveOrders = async (mappedOrdersList, onProgressRow = () => {}) => {
    let successCount = 0;
    for (let i = 0; i < mappedOrdersList.length; i++) {
        const row = mappedOrdersList[i];
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: row.id || `ORD-IMP-${Math.floor(Math.random()*100000)}`,
                    customerPhone: row.customerPhone || '000000',
                    customerName: row.customerName || 'Imported Customer',
                    description: row.description || 'Imported Items',
                    totalValue: Number(row.totalValue) || 0,
                    category: row.category || 'General',
                    outlet: row.outlet || "eltalg",
                    size: row.size || "M",
                    paymentMethod: row.paymentMethod || "Cash",
                    orderCost: Number(row.orderCost) || 0
                })
            });
            if (res.ok) successCount++;
        } catch (e) {
            console.error("Bulk import row failed", e);
        }
        onProgressRow(i + 1);
    }
    await fetchData();
    return successCount;
  };

  const updateCustomer = async (phone, updatedData) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, data: updatedData })
      });
      if (res.ok) {
        await fetchData();
        logUserAction('Update Customer', { phone });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addCustomer = async (customerData) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      if (res.ok) {
        await fetchData();
        logUserAction('Add Customer', { phone: customerData.phone });
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false };
    }
  };

  const markOrderPickedUp = async (orderId, paymentMethod = null) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'PICK_UP', paymentMethod })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const returnOrder = async (orderId) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'RETURN' })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cancelOrder = async (orderId, reason) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'CANCEL', reason })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const deleteOrder = async (orderId, reason) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'DELETE', reason })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const revertOrderToInventory = async (orderId) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'REVERT_TO_INVENTORY' })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const calculatePenalty = (order) => {
    if (!order) return 0;
    let toDate = new Date();
    if (order.status === 'Picked Up' && order.pickedUpAt) {
      toDate = new Date(order.pickedUpAt);
    } else if ((order.status === 'Returned' || order.status === 'Cancelled') && order.returnedAt) {
      toDate = new Date(order.returnedAt);
    }
    const days = getDaysDifference(order.receivedAt, toDate);
    if (days <= 4) return 0;
    const size = (order.size || 'M').toUpperCase();
    const rate = size === 'S' ? 18 : (size === 'L' ? 45 : 30);
    return rate * (days - 4);
  };

  const calculateStorageFee = calculatePenalty;

  const receiveBostaOrder = async (orderData) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const markBostaOrderPickedUp = async (orderId) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'PICK_UP' })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const returnBostaOrder = async (orderId) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'RETURN' })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const cancelBostaOrder = async (orderId, reason) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'CANCEL', reason })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const deleteBostaOrder = async (orderId, reason) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'DELETE', reason })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const revertBostaOrderToInventory = async (orderId) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'REVERT_TO_INVENTORY' })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const updateOrder = async (orderId, updatedData) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'UPDATE_INFO', ...updatedData })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const updateBostaOrder = async (orderId, updatedData) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'UPDATE_INFO', ...updatedData })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const logBasataService = async (category, serviceProvider, amount, extras = {}) => {
    try {
      const { transactionId, paymentMethod, percentage, performedAt, outlet } = extras;
      const res = await fetch('/api/basata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, serviceProvider, amount, transactionId, paymentMethod, percentage, performedAt, outlet })
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
      return { success: false, error: await res.text() };
    } catch (err) {
      return { success: false, error: "Network Error" };
    }
  };

  const deleteBasataTransaction = async (id) => {
    try {
      const res = await fetch(`/api/basata?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false };
    }
  };

  const receiveCustomerReturn = async (returnData) => {
    try {
      const res = await fetch('/api/customer-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });
      if (res.ok) {
        await fetchData();
        return { success: true };
      }
    } catch (err) {
      return { success: false };
    }
  };

  const markReturnedToJumia = async (id) => {
    try {
      const res = await fetch('/api/customer-returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const revertCustomerReturn = async (returnId) => {
    try {
      const res = await fetch('/api/customer-returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: returnId, action: 'REVERT' })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const createOrGetCallLog = async (orderId, orderSource, customerPhone, outlet) => {
    try {
      const res = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderSource, customerPhone, outlet })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const takeCallOwnership = async (logId, agentName) => {
    try {
      const res = await fetch('/api/call-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId, action: 'TAKE', agentName })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const resolveCall = async (logId, resolution, notes) => {
    try {
      const res = await fetch('/api/call-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId, action: 'RESOLVE', resolution, notes })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const closeCallLog = async (logId) => {
    try {
      const res = await fetch('/api/call-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId, action: 'CLOSE' })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const reopenCallLog = async (logId) => {
    try {
      const res = await fetch('/api/call-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId, action: 'REOPEN' })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardContext.Provider value={{ 
      orders, bostaOrders, customers, basataTransactions, customerReturns, callLogs, isLoading,
      globalFilters, updateFilters,
      receiveOrder, bulkReceiveOrders, markOrderPickedUp, returnOrder,
      receiveBostaOrder, markBostaOrderPickedUp, returnBostaOrder,
      updateCustomer, addCustomer, calculatePenalty, calculateStorageFee,
      logBasataService, deleteBasataTransaction, receiveCustomerReturn,
      markReturnedToJumia, revertCustomerReturn, createOrGetCallLog,
      takeCallOwnership, resolveCall, closeCallLog, reopenCallLog,
      updateOrder, updateBostaOrder, cancelOrder, deleteOrder,
      cancelBostaOrder, deleteBostaOrder, revertOrderToInventory, revertBostaOrderToInventory
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
