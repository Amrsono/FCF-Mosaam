import { prisma } from './_lib/prisma.js';

const DEFAULT_OUTLETS = [
  // 3 active FCF pickup stations — spread positions so they don't overlap on the SVG map
  { key: 'eltalg',     nameEn: 'Banha - Eltalg Station',    nameAr: 'بنها - محطة التلج',     city: 'Banha',      x: 245, y: 126, baseLoad: 92, status: 'Active'   },
  { key: 'tegara',     nameEn: 'Banha - Tegara Station',    nameAr: 'بنها - محطة التجارة',   city: 'Banha',      x: 231, y: 140, baseLoad: 45, status: 'Active'   },
  { key: 'mostashfa',  nameEn: 'Banha - Mostashfa Station', nameAr: 'بنها - محطة المستشفى', city: 'Banha',      x: 258, y: 142, baseLoad: 30, status: 'Active'   },
  // Regional routing hubs (Inactive by default — admin can activate)
  { key: 'cairo_hub',  nameEn: 'Cairo Hub',                 nameAr: 'مركز القاهرة الرئيسي', city: 'Cairo',      x: 242, y: 155, baseLoad: 88, status: 'Inactive' },
  { key: 'giza_hub',   nameEn: 'Giza Station',              nameAr: 'محطة الجيزة',           city: 'Giza',       x: 215, y: 162, baseLoad: 65, status: 'Inactive' },
  { key: 'alex_hub',   nameEn: 'Alexandria Hub',            nameAr: 'منفذ الإسكندرية',       city: 'Alexandria', x: 120, y:  88, baseLoad: 75, status: 'Inactive' },
  { key: 'tanta_hub',  nameEn: 'Tanta Hub',                 nameAr: 'منفذ طنطا',             city: 'Tanta',      x: 200, y: 110, baseLoad: 50, status: 'Inactive' },
];

export default async function handler(req, res) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const query = Object.fromEntries(url.searchParams);

    // ==========================================
    // SECTION 1: imtidad-outlets
    // ==========================================
    if (url.pathname.includes('/imtidad-outlets')) {
      // GET /api/imtidad-outlets
      if (req.method === 'GET') {
        let outlets = await prisma.imtidadOutlet.findMany({
          orderBy: { nameEn: 'asc' }
        });

        // If empty, auto-seed with default FCF and regional stations
        if (outlets.length === 0) {
          console.log('[Outlets API] Outlets table is empty. Initializing defaults...');
          for (const outlet of DEFAULT_OUTLETS) {
            try {
              await prisma.imtidadOutlet.create({
                data: outlet
              });
            } catch (err) {
              console.error(`Failed to seed outlet: ${outlet.key}`, err);
            }
          }

          // Fetch again after seeding
          outlets = await prisma.imtidadOutlet.findMany({
            orderBy: { nameEn: 'asc' }
          });
        }

        return res.status(200).json(outlets);
      }

      // POST /api/imtidad-outlets
      if (req.method === 'POST') {
        const { key, nameEn, nameAr, city, x, y, baseLoad } = req.body;

        if (!key || !nameEn || !nameAr || !city) {
          return res.status(400).json({ error: 'Missing key, names, or city.' });
        }

        const normalizedKey = key.toLowerCase().trim();
        const existing = await prisma.imtidadOutlet.findUnique({
          where: { key: normalizedKey }
        });

        if (existing) {
          return res.status(400).json({ error: 'A station with this unique key already exists.' });
        }

        const newOutlet = await prisma.imtidadOutlet.create({
          data: {
            key: normalizedKey,
            nameEn: nameEn.trim(),
            nameAr: nameAr.trim(),
            city: city.trim(),
            x: parseInt(x || 200),
            y: parseInt(y || 200),
            baseLoad: parseInt(baseLoad || 50),
            status: 'Active'
          }
        });

        // Log the addition
        try {
          await prisma.userLog.create({
            data: {
              username: 'admin',
              action: 'Add Imtidad Outlet',
              details: `Created new logistics outlet ${normalizedKey} (${nameEn}) in ${city} at (${x}, ${y})`
            }
          });
        } catch (logErr) {
          console.error('Failed to log outlet creation:', logErr);
        }

        return res.status(201).json(newOutlet);
      }

      // PUT /api/imtidad-outlets (Update status)
      if (req.method === 'PUT') {
        const { id, status } = req.body;

        if (!id || !status) {
          return res.status(400).json({ error: 'Missing ID or status.' });
        }

        const updated = await prisma.imtidadOutlet.update({
          where: { id },
          data: { status }
        });

        // Log the status update
        try {
          await prisma.userLog.create({
            data: {
              username: 'admin',
              action: 'Toggle Imtidad Outlet Status',
              details: `Updated outlet ${updated.key} status to: ${status}.`
            }
          });
        } catch (logErr) {
          console.error('Failed to log outlet update:', logErr);
        }

        return res.status(200).json(updated);
      }

      // DELETE /api/imtidad-outlets
      if (req.method === 'DELETE') {
        const { id } = query;

        if (!id) {
          return res.status(400).json({ error: 'Missing outlet ID.' });
        }

        const deleted = await prisma.imtidadOutlet.delete({
          where: { id }
        });

        // Log deletion
        try {
          await prisma.userLog.create({
            data: {
              username: 'admin',
              action: 'Delete Imtidad Outlet',
              details: `Deleted logistics outlet ${deleted.key} (${deleted.nameEn})`
            }
          });
        } catch (logErr) {
          console.error('Failed to log outlet deletion:', logErr);
        }

        return res.status(200).json({ success: true });
      }
    }

    // ==========================================
    // SECTION 2: imtidad-orders
    // ==========================================
    if (url.pathname.includes('/imtidad-orders')) {
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
              username: 'admin',
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
    }

    return res.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('[Imtidad API Error]:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
