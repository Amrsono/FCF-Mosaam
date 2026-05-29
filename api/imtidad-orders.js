import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams);

    // GET /api/imtidad-orders
    if (req.method === 'GET') {
      const { trackingId, phone, status } = query;

      const where = {};
      if (trackingId) {
        where.id = { contains: trackingId, mode: 'insensitive' };
      }
      if (phone) {
        where.OR = [
          { senderPhone: { contains: phone } },
          { recipientPhone: { contains: phone } }
        ];
      }
      if (status && status !== 'All') {
        where.status = status;
      }

      const orders = await prisma.imtidadOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(orders);
    }

    // POST /api/imtidad-orders
    if (req.method === 'POST') {
      const {
        senderName,
        senderPhone,
        senderCity,
        dropoffOutlet,
        recipientName,
        recipientPhone,
        recipientCity,
        pickupOutlet,
        description,
        weight,
        size,
        totalValue
      } = req.body;

      if (!senderName || !senderPhone || !recipientName || !recipientPhone || !description) {
        return res.status(400).json({ error: 'Missing required shipping fields.' });
      }

      // Generate a unique tracking ID: IMT-YYYYMMDD-XXXX where XXXX is random hex
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = Math.floor(1000 + Math.random() * 9000); // 4-digit number
      const trackingId = `IMT-${dateStr}-${randHex}`;

      const parsedWeight = parseFloat(weight || 1);
      const parsedValue = parseFloat(totalValue || 0);

      // Pricing logic:
      // Base cost = 30 EGP
      // Inter-city surcharge if senderCity != recipientCity = 20 EGP
      // Weight surcharge = weight * 5 EGP
      // Size surcharge = S: 0, M: 10, L: 20
      const isInterCity = senderCity.toLowerCase().trim() !== recipientCity.toLowerCase().trim();
      const interCityFee = isInterCity ? 20.0 : 0.0;
      
      let sizeFee = 10.0; // Default M
      if (size === 'S') sizeFee = 0.0;
      if (size === 'L') sizeFee = 20.0;

      const shippingCost = 30.0 + interCityFee + (parsedWeight * 5.0) + sizeFee;

      const newOrder = await prisma.imtidadOrder.create({
        data: {
          id: trackingId,
          senderName,
          senderPhone,
          senderCity,
          dropoffOutlet,
          recipientName,
          recipientPhone,
          recipientCity,
          pickupOutlet,
          description,
          weight: parsedWeight,
          size: size || 'M',
          totalValue: parsedValue,
          shippingCost,
          status: 'Pending Drop-off'
        }
      });

      // Log the action in UserLog
      try {
        await prisma.userLog.create({
          data: {
            username: 'admin', // C2C is admin-only, we can grab this from session or default
            action: 'Create C2C Shipment',
            details: `Created shipment ${trackingId} from ${senderCity} to ${recipientCity}. Cost: ${shippingCost} EGP.`
          }
        });
      } catch (logErr) {
        console.error('Failed to log C2C shipment creation:', logErr);
      }

      return res.status(201).json(newOrder);
    }

    // PATCH /api/imtidad-orders
    if (req.method === 'PATCH') {
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Missing order ID or new status.' });
      }

      const updatedOrder = await prisma.imtidadOrder.update({
        where: { id },
        data: { status }
      });

      // Log the status change
      try {
        await prisma.userLog.create({
          data: {
            username: 'admin',
            action: 'Update C2C Shipment Status',
            details: `Updated shipment ${id} status to: ${status}.`
          }
        });
      } catch (logErr) {
        console.error('Failed to log C2C status change:', logErr);
      }

      return res.status(200).json(updatedOrder);
    }

    // DELETE /api/imtidad-orders
    if (req.method === 'DELETE') {
      const { id } = query;

      if (!id) {
        return res.status(400).json({ error: 'Missing shipment ID.' });
      }

      await prisma.imtidadOrder.delete({
        where: { id }
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('[Imtidad Orders API Error]:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
