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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams);

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

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('[Imtidad Outlets API Error]:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
