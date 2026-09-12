const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// ---------------- DATABASE ----------------

const db = new sqlite3.Database("./travel.db");

function run(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve({
          id: this.lastID,
          changes: this.changes
        });
      }
    });
  });
}

function get(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, values, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, values, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

// ---------------- MIDDLEWARE ----------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "travel-booking-secret",
    resave: false,
    saveUninitialized: false
  })
);

// ---------------- CREATE TABLES ----------------

async function createTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      destination_id INTEGER NOT NULL,
      travel_date TEXT NOT NULL,
      travelers INTEGER NOT NULL,
      total_price REAL NOT NULL,
      payment_status TEXT DEFAULT 'Pending'
    )
  `);
}

// ---------------- ADD DESTINATIONS ----------------

async function addDestinations() {
  const result = await get(
    "SELECT COUNT(*) AS count FROM destinations"
  );

  if (result.count > 0) {
    return;
  }

  const places = [
    [
      "Goa",
      "India",
      "Beautiful beaches and relaxing holidays.",
      5999,
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Manali",
      "India",
      "Mountains, snow and beautiful natural views.",
      7499,
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Jaipur",
      "India",
      "Explore forts, palaces and colourful markets.",
      4999,
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Kerala",
      "India",
      "Enjoy backwaters, greenery and peaceful places.",
      8999,
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Paris",
      "France",
      "Explore famous landmarks, art and beautiful streets.",
      45999,
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Dubai",
      "UAE",
      "Enjoy modern buildings, shopping and desert trips.",
      32999,
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80"
    ]
  ];

  for (const place of places) {
    await run(
      `
      INSERT INTO destinations
      (city, country, description, price, image)
      VALUES (?, ?, ?, ?, ?)
      `,
      place
    );
  }
}

// ---------------- LOGIN CHECK ----------------

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please login first."
    });
  }

  next();
}

// ---------------- REGISTER ----------------

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await get(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUser) {
      return res.status(400).json({
        message: "Email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      `
      INSERT INTO users
      (name, email, password)
      VALUES (?, ?, ?)
      `,
      [name.trim(), cleanEmail, hashedPassword]
    );

    req.session.user = {
      id: result.id,
      name: name.trim(),
      email: cleanEmail
    };

    res.json({
      message: "Registration successful.",
      user: req.session.user
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Registration failed."
    });
  }
});

// ---------------- LOGIN ----------------

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await get(
      "SELECT * FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const correctPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!correctPassword) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    res.json({
      message: "Login successful.",
      user: req.session.user
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Login failed."
    });
  }
});

// ---------------- LOGOUT ----------------

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      message: "Logout successful."
    });
  });
});

// ---------------- CURRENT USER ----------------

app.get("/api/me", (req, res) => {
  res.json({
    user: req.session.user || null
  });
});

// ---------------- SEARCH DESTINATIONS ----------------

app.get("/api/destinations", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    let places;

    if (search) {
      places = await all(
        `
        SELECT * FROM destinations
        WHERE city LIKE ?
        OR country LIKE ?
        `,
        [`%${search}%`, `%${search}%`]
      );
    } else {
      places = await all(
        "SELECT * FROM destinations ORDER BY city"
      );
    }

    res.json(places);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to load destinations."
    });
  }
});

// ---------------- CREATE BOOKING ----------------

app.post("/api/bookings", requireLogin, async (req, res) => {
  try {
    const {
      destinationId,
      travelDate,
      travelers
    } = req.body;

    const numberOfTravelers = Number(travelers);

    if (
      !destinationId ||
      !travelDate ||
      !numberOfTravelers
    ) {
      return res.status(400).json({
        message: "Please fill all booking details."
      });
    }

    const destination = await get(
      "SELECT * FROM destinations WHERE id = ?",
      [destinationId]
    );

    if (!destination) {
      return res.status(404).json({
        message: "Destination not found."
      });
    }

    const totalPrice =
      destination.price * numberOfTravelers;

    const result = await run(
      `
      INSERT INTO bookings
      (
        user_id,
        destination_id,
        travel_date,
        travelers,
        total_price
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.session.user.id,
        destination.id,
        travelDate,
        numberOfTravelers,
        totalPrice
      ]
    );

    res.json({
      message: "Booking successful!",
      bookingId: result.id,
      totalPrice: totalPrice
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Booking failed."
    });
  }
});

// ---------------- MY BOOKINGS ----------------

app.get("/api/bookings", requireLogin, async (req, res) => {
  try {
    const bookings = await all(
      `
      SELECT
        bookings.*,
        destinations.city,
        destinations.country

      FROM bookings

      JOIN destinations
      ON bookings.destination_id = destinations.id

      WHERE bookings.user_id = ?

      ORDER BY bookings.id DESC
      `,
      [req.session.user.id]
    );

    res.json(bookings);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to load bookings."
    });
  }
});

// ---------------- DEMO PAYMENT ----------------

app.post(
  "/api/bookings/:id/pay",
  requireLogin,
  async (req, res) => {

    try {
      const booking = await get(
        `
        SELECT * FROM bookings
        WHERE id = ?
        AND user_id = ?
        `,
        [
          req.params.id,
          req.session.user.id
        ]
      );

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found."
        });
      }

      await run(
        `
        UPDATE bookings
        SET payment_status = 'Paid'
        WHERE id = ?
        AND user_id = ?
        `,
        [
          req.params.id,
          req.session.user.id
        ]
      );

      res.json({
        message: "Demo payment successful!"
      });

    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Payment failed."
      });
    }
  }
);

// ---------------- START SERVER ----------------

async function startServer() {
  try {
    await createTables();
    await addDestinations();

    app.listen(PORT, () => {
      console.log(
        `Server running at http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.log(error);
  }
}

startServer();