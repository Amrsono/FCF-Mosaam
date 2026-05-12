import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams);
    const { code, phone, amount, excludeOrderId } = query;

    if (req.method === 'GET') {
      // Case 1: Validate a specific code for a customer
      if (code && phone) {
        const discount = await prisma.discountCode.findUnique({
          where: { code: code.toUpperCase() }
        });

        if (!discount || !discount.isActive) {
          return res.status(400).json({ error: 'Invalid or inactive discount code' });
        }

        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
          return res.status(400).json({ error: 'Discount code usage limit reached' });
        }

        if (amount && parseFloat(amount) < discount.minSpend) {
          return res.status(400).json({ error: `Minimum spend of ${discount.minSpend} EGP required` });
        }

        const excludeCondition = excludeOrderId ? { id: { not: excludeOrderId } } : {};
        const validStatuses = { notIn: ['Cancelled'] }; // Count any order that isn't cancelled

        if (discount.isFirstTimeOnly) {
          const previousOrders = await prisma.order.count({
            where: { customerPhone: phone, status: validStatuses, ...excludeCondition }
          });
          const previousBosta = await prisma.bostaOrder.count({
            where: { customerPhone: phone, status: validStatuses, ...excludeCondition }
          });

          if (previousOrders > 0 || previousBosta > 0) {
            return res.status(400).json({ error: 'Customer is not eligible for this discount' });
          }
        }

        if (discount.maxUsesPerCustomer) {
          const customerUsageJumia = await prisma.order.count({
            where: { customerPhone: phone, discountCode: code.toUpperCase(), status: validStatuses, ...excludeCondition }
          });
          const customerUsageBosta = await prisma.bostaOrder.count({
            where: { customerPhone: phone, discountCode: code.toUpperCase(), status: validStatuses, ...excludeCondition }
          });
          
          if ((customerUsageJumia + customerUsageBosta) >= discount.maxUsesPerCustomer) {
            return res.status(400).json({ error: `You have already used this code ${discount.maxUsesPerCustomer} time(s)` });
          }
        }

        return res.status(200).json(discount);
      }

      // Case 2: List all codes (Admin only ideally, but we'll fetch all for management)
      const discounts = await prisma.discountCode.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(discounts);
    }

    if (req.method === 'POST') {
      const { code, type, value, minSpend, maxUses, isFirstTimeOnly, maxUsesPerCustomer } = req.body;
      
      const newDiscount = await prisma.discountCode.create({
        data: {
          code: code.toUpperCase(),
          type,
          value: parseFloat(value || 0),
          minSpend: parseFloat(minSpend || 0),
          maxUses: (maxUses === '' || maxUses === null || maxUses === undefined) ? null : parseInt(maxUses),
          maxUsesPerCustomer: (maxUsesPerCustomer === '' || maxUsesPerCustomer === null || maxUsesPerCustomer === undefined) ? null : parseInt(maxUsesPerCustomer),
          isFirstTimeOnly: !!isFirstTimeOnly
        }
      });
      return res.status(201).json(newDiscount);
    }

    if (req.method === 'PATCH') {
      const { id, isActive, value, minSpend, maxUses, maxUsesPerCustomer } = req.body;
      const data = {};
      
      if (isActive !== undefined) data.isActive = isActive;
      if (value !== undefined && value !== '') data.value = parseFloat(value);
      if (minSpend !== undefined && minSpend !== '') data.minSpend = parseFloat(minSpend);
      
      if (maxUses !== undefined) {
        data.maxUses = (maxUses === '' || maxUses === null) ? null : parseInt(maxUses);
        if (data.maxUses !== null && isNaN(data.maxUses)) delete data.maxUses;
      }
      
      if (maxUsesPerCustomer !== undefined) {
        data.maxUsesPerCustomer = (maxUsesPerCustomer === '' || maxUsesPerCustomer === null) ? null : parseInt(maxUsesPerCustomer);
        if (data.maxUsesPerCustomer !== null && isNaN(data.maxUsesPerCustomer)) delete data.maxUsesPerCustomer;
      }

      console.log("PATCH discounts data:", data);

      const updated = await prisma.discountCode.update({
        where: { id },
        data
      });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const { id } = query;
      await prisma.discountCode.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
