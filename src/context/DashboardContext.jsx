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
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [oRes, bostaRes, cRes, bRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/bosta'),
        fetch('/api/customers'),
        fetch('/api/basata')
      ]);

      if (oRes.ok) setOrders(await oRes.json());
      if (bostaRes.ok) setBostaOrders(await bostaRes.json());
      if (cRes.ok) setCustomers(await cRes.json());
      if (bRes.ok) setBasataTransactions(await bRes.json());

    } catch (error) {
      console.warn("Could not fetch from database. Ensure you are running via 'vercel dev' or have configured PostgreSQL correctly.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const receiveOrder = async (orderData) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) await fetchData();
      else {
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
                    category: row.category || 'General'
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
      if (res.ok) await fetchData(); // Resync
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
      if (res.ok) await fetchData(); // Resync
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
      if (res.ok) await fetchData(); // Resync
    } catch (err) {
      console.error(err);
    }
  };

  const calculatePenalty = (order) => {
    // "Inventory" in DB is either "Inventory" or "Picked_Up" (Prisma default is Inventory)
    if (order.status !== 'Inventory') return 0;
    const days = getDaysDifference(order.receivedAt);
    return days * 5; 
  };

  const receiveBostaOrder = async (orderData) => {
    try {
      const res = await fetch('/api/bosta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) await fetchData();
      else {
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
        await fetchData(); // Resync Basata
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

  return (
    <DashboardContext.Provider value={{ 
      orders, 
      bostaOrders,
      customers, 
      basataTransactions,
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
      logBasataService
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
