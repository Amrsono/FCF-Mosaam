import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export const getDaysDifference = (fromDate) => {
  const diffTime = Math.abs(new Date() - new Date(fromDate));
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

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [oRes, bostaRes, cRes, bRes, crRes, clRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/bosta'),
        fetch('/api/customers'),
        fetch('/api/basata'),
        fetch('/api/customer-returns'),
        fetch('/api/call-logs')
      ]);

      if (oRes.ok) setOrders(await oRes.json());
      if (bostaRes.ok) setBostaOrders(await bostaRes.json());
      if (cRes.ok) setCustomers(await cRes.json());
      if (bRes.ok) setBasataTransactions(await bRes.json());
      if (crRes.ok) setCustomerReturns(await crRes.json());
      if (clRes.ok) setCallLogs(await clRes.json());

    } catch (error) {
      console.warn("Could not fetch from database. Ensure you are running via 'vercel dev' or have configured PostgreSQL correctly.", error);
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
      } else {
        const errData = await res.text();
        alert("Database Connection Error: Could not save to Vercel Postgres. Ensure you are running 'vercel dev' and have pushed your Prisma schema. Error details: " + errData);
      }
    } catch (err) {
      console.error(err);
      alert("Network Error: Could not reach backend API. Are you running 'vercel dev'?");
    }
  };

  const bulkReceiveOrders = async (mappedOrdersList, onProgressRow = () => {}) => {
    let successCount = 0;
    for (let i = 0; i < mappedOrdersList.length; i++) {
        const row = mappedOrdersList[i];
        try {
            // Send each row individually to reuse the upsert customer/order business logic.
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
                    outlet: row.outlet || "وبور الثلج",
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
    const totalImportedValue = mappedOrdersList.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    logUserAction('Bulk Import Orders', { successCount, totalCount: mappedOrdersList.length, amount: totalImportedValue });
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
        await fetchData(); // Resync
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
      } else {
        const err = await res.json();
        return { success: false, error: err.error };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Network error' };
    }
  };

  const markOrderPickedUp = async (orderId) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'PICK_UP' })
      });
      if (res.ok) {
        await fetchData(); // Resync
        const pickedOrder = orders.find(o => o.id === orderId);
        logUserAction('Pick Up Order', { id: orderId, amount: pickedOrder?.totalValue || 0 });
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
        await fetchData(); // Resync
        const returnedOrder = orders.find(o => o.id === orderId);
        logUserAction('Return Order', { id: orderId, amount: returnedOrder?.totalValue || 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Returns daily storage rate based on package size (Jumia only)
  const getJumiaDailyRate = (order) => {
    const size = (order.size || 'M').toUpperCase();
    if (size === 'S') return 18;
    if (size === 'L') return 45;
    return 30; // Medium (default)
  };

  // Accrued storage fee: charges from day 1, every day parked (18/30/45 EGP per day)
  const calculatePenalty = (order) => {
    const days = getDaysDifference(order.receivedAt);
    if (days < 1) return 0;
    return getJumiaDailyRate(order) * days;
  };

  // Alias kept for backwards compatibility (same logic)
  const calculateStorageFee = calculatePenalty;

  const receiveBostaOrder = async (orderData) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        await fetchData();
        logUserAction('Receive Bosta Order', { id: orderData.id, phone: orderData.customerPhone, amount: Number(orderData.totalValue) || 0 });
      } else {
        alert("Database Connection Error (Bosta API).");
      }
    } catch (err) {
      alert("Network Error: Could not reach backend API for Bosta.");
    }
  };

  const markBostaOrderPickedUp = async (orderId) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, action: 'PICK_UP' })
      });
      if (res.ok) {
        await fetchData(); 
        const pickedBosta = bostaOrders.find(o => o.id === orderId);
        logUserAction('Pick Up Bosta Order', { id: orderId, amount: pickedBosta?.totalValue || 0 });
      }
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
      if (res.ok) {
        await fetchData(); 
        const returnedBosta = bostaOrders.find(o => o.id === orderId);
        logUserAction('Return Bosta Order', { id: orderId, amount: returnedBosta?.totalValue || 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logBasataService = async (category, serviceProvider, amount, extras = {}) => {
    try {
      const { transactionId, paymentMethod, percentage, performedAt } = extras;
      const res = await fetch('/api/basata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category, 
          serviceProvider, 
          amount,
          transactionId,
          paymentMethod,
          percentage,
          performedAt
        })
      });
      if (res.ok) {
        await fetchData(); // Resync
        logUserAction('Log Basata Service', { category, serviceProvider, amount, transactionId: extras.transactionId });
        return { success: true };
      } else {
        const errData = await res.text();
        console.error("Database Logging Error:", errData);
        return { success: false, error: errData };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: "Network Error" };
    }
  };

  // ── Customer Returns ─────────────────────────────────────────────
  const receiveCustomerReturn = async (returnData) => {
    try {
      const res = await fetch('/api/customer-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });
      if (res.ok) {
        await fetchData();
        logUserAction('Receive Customer Return', { orderId: returnData.orderId, phone: returnData.customerPhone });
        return { success: true };
      } else {
        const errData = await res.text();
        return { success: false, error: errData };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Network error' };
    }
  };

  const markReturnedToJumia = async (id) => {
    try {
      const res = await fetch('/api/customer-returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await fetchData();
        logUserAction('Mark Returned to Jumia', { id });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Calls Log ────────────────────────────────────────────────────────
  const createOrGetCallLog = async (orderId, orderSource, customerPhone) => {
    try {
      const res = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderSource, customerPhone })
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
      if (res.ok) {
        await fetchData();
        logUserAction('Take Call Ownership', { logId, agentName });
      }
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
      if (res.ok) {
        await fetchData();
        logUserAction('Resolve Call', { logId, resolution });
      }
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
      if (res.ok) {
        await fetchData();
        logUserAction('Close Call Log', { logId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardContext.Provider value={{ 
      orders, 
      bostaOrders,
      customers, 
      basataTransactions,
      customerReturns,
      callLogs,
      isLoading,
      receiveOrder, 
      bulkReceiveOrders,
      markOrderPickedUp, 
      returnOrder,
      receiveBostaOrder,
      markBostaOrderPickedUp,
      returnBostaOrder,
      updateCustomer,
      addCustomer,
      calculatePenalty,
      calculateStorageFee,
      logBasataService,
      receiveCustomerReturn,
      markReturnedToJumia,
      createOrGetCallLog,
      takeCallOwnership,
      resolveCall,
      closeCallLog
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
