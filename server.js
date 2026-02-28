const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");

// ── Database setup ────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, "orders.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    phone     TEXT    NOT NULL,
    address   TEXT    NOT NULL,
    items     TEXT    NOT NULL,
    total     INTEGER NOT NULL,
    status    TEXT    NOT NULL DEFAULT 'received',
    eta_min   INTEGER NOT NULL DEFAULT 30,
    created_at TEXT   NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ── Menu data (single source of truth) ───────────────────────────────────────
const MENU = [
  { id: 1,  name: "Butter Chicken",   icon: "🍛", price: 300, category: "mains",    desc: "Slow-cooked chicken in creamy tomato sauce with Maa's secret masala blend",        tag: "★ Bestseller"    },
  { id: 2,  name: "Dal Makhani",      icon: "🍲", price: 240, category: "mains",    desc: "Black lentils slow-cooked overnight, finished with butter and cream",              tag: "Overnight Cook"  },
  { id: 3,  name: "Mutton Rogan Josh",icon: "🍖", price: 360, category: "mains",    desc: "Kashmiri-style slow-braised mutton in aromatic whole spices",                      tag: "Heritage Recipe" },
  { id: 4,  name: "Palak Paneer",     icon: "🥬", price: 220, category: "mains",    desc: "Fresh cottage cheese in silky spinach gravy with a hint of cream",                 tag: "Vegetarian"      },
  { id: 5,  name: "Chicken Biryani",  icon: "🍚", price: 280, category: "rice",     desc: "Dum-style biryani with whole spices and saffron-infused basmati rice",             tag: "Dum Style"       },
  { id: 6,  name: "Veg Biryani",      icon: "🌾", price: 220, category: "rice",     desc: "Fragrant basmati with seasonal vegetables and caramelised onions",                 tag: "Vegetarian"      },
  { id: 7,  name: "Lemon Rice",       icon: "🍋", price: 160, category: "rice",     desc: "South Indian style with mustard seed tempering and golden turmeric",               tag: "Light & Fresh"   },
  { id: 8,  name: "Butter Naan",      icon: "🫓", price: 60,  category: "breads",   desc: "Soft tandoor-style naan brushed with house-churned butter",                       tag: "Per Piece"       },
  { id: 9,  name: "Aloo Paratha",     icon: "🥙", price: 80,  category: "breads",   desc: "Maa's legendary stuffed paratha with spiced potato filling and white butter",      tag: "Maa's Classic"   },
  { id: 10, name: "Laccha Paratha",   icon: "🥞", price: 70,  category: "breads",   desc: "Flaky multi-layered whole wheat paratha, crisp outside and soft within",           tag: "Whole Wheat"     },
  { id: 11, name: "Samosa (2 pcs)",   icon: "🥟", price: 80,  category: "snacks",   desc: "Crispy golden pastry filled with spiced potatoes and green peas",                 tag: "Street Style"    },
  { id: 12, name: "Pakoda Platter",   icon: "🍤", price: 120, category: "snacks",   desc: "Mixed vegetable fritters served with fresh mint chutney",                         tag: "Evening Snack"   },
  { id: 13, name: "Gulab Jamun",      icon: "🍮", price: 100, category: "desserts", desc: "Soft milk-solid dumplings soaked in rose-flavoured sugar syrup",                  tag: "Sweet Treat"     },
  { id: 14, name: "Kheer",            icon: "🥛", price: 120, category: "desserts", desc: "Creamy rice pudding with cardamom, saffron and crunchy dry fruits",               tag: "Maa's Recipe"    },
];

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────

// GET /api/menu  — return full menu
app.get("/api/menu", (_req, res) => {
  res.json({ menu: MENU });
});

// POST /api/orders  — place a new order
app.post("/api/orders", (req, res) => {
  const { name, phone, address, items } = req.body;

  if (!name || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "name, phone, address and items are required" });
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const eta = 25 + Math.floor(Math.random() * 15); // 25-40 min

  const stmt = db.prepare(
    "INSERT INTO orders (name, phone, address, items, total, eta_min) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(name, phone, address, JSON.stringify(items), total, eta);

  res.status(201).json({
    orderId: result.lastInsertRowid,
    name,
    total,
    etaMin: eta,
    status: "received",
    message: `Order #${result.lastInsertRowid} confirmed! Maa is cooking with love 🍛`,
  });
});

// GET /api/orders/:id  — fetch order status
app.get("/api/orders/:id", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  res.json({
    ...order,
    items: JSON.parse(order.items),
  });
});

// GET /api/orders  — list all orders (kitchen/admin view)
app.get("/api/orders", (_req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  res.json({
    orders: orders.map(o => ({ ...o, items: JSON.parse(o.items) })),
  });
});

// PATCH /api/orders/:id/status  — update order status
app.patch("/api/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const valid = ["received", "preparing", "out_for_delivery", "delivered"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
  }
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Order not found" });
  res.json({ orderId: Number(req.params.id), status });
});

// ── Serve built frontend in production ────────────────────────────────────────
const distPath = path.join(__dirname, "client", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🪨  Stones & Spices API running on http://localhost:${PORT}`);
  console.log(`   GET  /api/menu`);
  console.log(`   POST /api/orders`);
  console.log(`   GET  /api/orders/:id`);
  console.log(`   GET  /api/orders        (all orders)`);
  console.log(`   PATCH /api/orders/:id/status\n`);
});
