const pool = require('../config/db');
const { parseCSV, rowsToObjects } = require('../utils/csv');

const SUPPORTED_UNITS = ['piece', 'pieces', 'meter', 'meters', 'set', 'sets', 'kw', 'trip', 'trips', 'unit'];

exports.importCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const text = req.file.buffer.toString('utf8');
    const rows = rowsToObjects(parseCSV(text));

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV is empty or missing a header row' });
    }

    const client = await pool.connect();
    let created = 0;
    let skipped = 0;
    const errors = [];

    try {
      await client.query('BEGIN');

      for (const r of rows) {
        const name = (r.name || '').trim();
        const unitPrice = parseFloat(r.unit_price ?? r.unitprice ?? r.price);

        if (!name || Number.isNaN(unitPrice)) {
          skipped++;
          errors.push({ row: r, reason: 'missing name or unit_price' });
          continue;
        }

        let categoryId = null;
        const catName = (r.category || '').trim();
        if (catName) {
          const found = await client.query(
            'SELECT id FROM product_categories WHERE company_id = $1 AND name = $2',
            [req.user.company_id, catName]
          );
          if (found.rows.length > 0) {
            categoryId = found.rows[0].id;
          } else {
            const nextOrder = await client.query(
              'SELECT COALESCE(MAX(display_order), 0) + 1 as n FROM product_categories WHERE company_id = $1',
              [req.user.company_id]
            );
            const catRes = await client.query(
              'INSERT INTO product_categories (company_id, name, display_order) VALUES ($1, $2, $3) RETURNING id',
              [req.user.company_id, catName, nextOrder.rows[0].n]
            );
            categoryId = catRes.rows[0].id;
          }
        }

        const unit = (r.unit || 'piece').trim().toLowerCase();
        const normUnit = SUPPORTED_UNITS.includes(unit) ? (unit === 'kw' ? 'kW' : unit.replace(/s$/, '')) : 'piece';

        const result = await client.query(
          `INSERT INTO products (company_id, category_id, name, brand, model, description, unit, unit_price, cost_price, specs)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, unit_price`,
          [
            req.user.company_id, categoryId, name,
            r.brand || null, r.model || null, r.description || null,
            normUnit, unitPrice,
            parseFloat(r.cost_price ?? r.costprice ?? 0) || 0,
            JSON.stringify({})
          ]
        );

        await client.query(
          'INSERT INTO price_history (product_id, new_price, changed_by, reason) VALUES ($1, $2, $3, $4)',
          [result.rows[0].id, unitPrice, req.user.id, 'CSV import']
        );

        created++;
      }

      await client.query('COMMIT');

      if (created === 0) {
        return res.status(400).json({ error: 'No valid products found in CSV', errors });
      }

      res.status(201).json({
        message: `${created} product(s) imported`,
        created,
        skipped,
        errors,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ error: 'Failed to import products' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramCount = 1;

    if (category) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.brand ILIKE $${paramCount} OR p.model ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (active !== undefined) {
      paramCount++;
      query += ` AND p.is_active = $${paramCount}`;
      params.push(active === 'true');
    }

    query += ' ORDER BY pc.display_order, p.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pc.name as category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.create = async (req, res) => {
  try {
    const { category_id, name, brand, model, description, unit, unit_price, cost_price, specs } = req.body;

    if (!name || unit_price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await pool.query(
      `INSERT INTO products (company_id, category_id, name, brand, model, description, unit, unit_price, cost_price, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.company_id, category_id || null, name, brand || null, model || null,
       description || null, unit || 'piece', unit_price, cost_price || 0, JSON.stringify(specs || {})]
    );

    // Log price history
    await pool.query(
      'INSERT INTO price_history (product_id, new_price, changed_by) VALUES ($1, $2, $3)',
      [result.rows[0].id, unit_price, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

exports.update = async (req, res) => {
  try {
    const { category_id, name, brand, model, description, unit, unit_price, cost_price, is_active, specs } = req.body;

    // Get current price
    const current = await pool.query('SELECT unit_price FROM products WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]);

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `UPDATE products SET
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        brand = COALESCE($3, brand),
        model = COALESCE($4, model),
        description = COALESCE($5, description),
        unit = COALESCE($6, unit),
        unit_price = COALESCE($7, unit_price),
        cost_price = COALESCE($8, cost_price),
        is_active = COALESCE($9, is_active),
        specs = COALESCE($10, specs),
        updated_at = NOW()
       WHERE id = $11 AND company_id = $12
       RETURNING *`,
      [category_id, name, brand, model, description, unit, unit_price, cost_price,
       is_active, specs ? JSON.stringify(specs) : null, req.params.id, req.user.company_id]
    );

    // Log price change
    if (unit_price !== undefined && unit_price !== current.rows[0].unit_price) {
      await pool.query(
        'INSERT INTO price_history (product_id, old_price, new_price, changed_by) VALUES ($1, $2, $3, $4)',
        [req.params.id, current.rows[0].unit_price, unit_price, req.user.id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

exports.bulkUpdatePrices = async (req, res) => {
  try {
    const { updates } = req.body;
    // updates: [{ id, unit_price }]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        const current = await client.query(
          'SELECT unit_price FROM products WHERE id = $1 AND company_id = $2',
          [update.id, req.user.company_id]
        );

        if (current.rows.length > 0) {
          await client.query(
            'UPDATE products SET unit_price = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3',
            [update.unit_price, update.id, req.user.company_id]
          );

          await client.query(
            'INSERT INTO price_history (product_id, old_price, new_price, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
            [update.id, current.rows[0].unit_price, update.unit_price, req.user.id, update.reason || 'Bulk update']
          );
        }
      }

      await client.query('COMMIT');
      res.json({ message: `${updates.length} prices updated` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Bulk update error:', err);
    res.status(500).json({ error: 'Failed to update prices' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_categories WHERE company_id = $1 ORDER BY display_order',
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.getPriceHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ph.*, p.name as product_name, u.name as changed_by_name
       FROM price_history ph
       JOIN products p ON ph.product_id = p.id
       LEFT JOIN users u ON ph.changed_by = u.id
       WHERE p.company_id = $1
       ORDER BY ph.created_at DESC
       LIMIT 100`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
};
