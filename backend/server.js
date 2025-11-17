require("dotenv-safe").config({
    allowEmptyValues: true
});

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require('path');


const app = express();
app.use(helmet());
app.use(morgan("combined"));


const SECRET_KEY = process.env.SECRET_KEY;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+02:00', 
});

db.query("SET time_zone = '+03:00'", (err) => {
    if (err) console.error("Failed to set MySQL time zone:", err);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// db.connect((err) => {
//     if (err) {
//         console.error("MySQL connection error:", err);
//         process.exit(1);
//     } else {
//         console.log("Connected to MySQL database!");
//     }
// });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// MIDDLEWARE
const authenticateToken = require('./authMiddleware');

app.get('/api/protected-data', authenticateToken, (req, res) => {
  res.json({ message: 'This is protected data', user: req.user });
});


// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "No token provided." });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token." });
    }
};

// Protected HTML routes
app.get('/hall_worker.html', verifyToken, (req, res) => {
  if (req.user.role !== 'hall_worker') return res.redirect('/index.html');
  res.sendFile(path.join(__dirname, '../frontend/hall_worker.html'));
});
app.get('/shift_leader.html', verifyToken, (req, res) => {
  if (req.user.role !== 'shift_leader') return res.redirect('/index.html');
  res.sendFile(path.join(__dirname, '../frontend/shift_leader.html'));
});
app.get('/machine_operator.html', verifyToken, (req, res) => {
  if (req.user.role !== 'machine_operator') return res.redirect('/index.html');
  res.sendFile(path.join(__dirname, '../frontend/machine_operator.html'));
});
app.get('/admin.html', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.redirect('/index.html');
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});


const fs = require('fs');
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}



// LOGIN
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ success: true, message: "Login successful!", token, role: user.role });
    });
});



// ADD USER
app.post("/api/create-employee", verifyToken, async (req, res) => {
    console.log("Received Request:", req.body);

    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized. Admins only." });
    }

    const { newUsername, newPassword, role } = req.body;

    const employeeRole = role || "machine_operator";

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            [newUsername, hashedPassword, employeeRole],
            (err, result) => {
                if (err) {
                    console.error("Database Error:", err);
                    return res.status(500).json({ success: false, message: "Database error" });
                }
                res.json({ success: true, message: "Employee account created successfully!" });
            }
        );
    } catch (error) {
        console.error("Hashing Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



// CREATE ORDER (Machine Operators) 
app.post("/api/orders", verifyToken, (req, res) => {
    console.log("Received Order Data:", req.body);  // Debugging log

    if (req.user.role !== "machine_operator") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only machine operators can create orders." });
    }

    const { order_type, replacement_crate, additional_notes, press_number } = req.body;
    const machineOperator = req.user.username;

    console.log("Parsed Data - order_type:", order_type, "replacement_crate:", replacement_crate, "additional_notes:", additional_notes, "press_number:", press_number);

    const validOrderTypes = ['crate_removal', 'rubber', 'packaging', 'component'];
    if (!order_type || !validOrderTypes.includes(order_type)) {
        console.log("Invalid order type:", order_type);  // Debugging log
        return res.status(400).json({ success: false, message: "Invalid order type." });
    }

    // Validate press_number
    if (!press_number || isNaN(press_number) || press_number <= 0) {
        return res.status(400).json({ success: false, message: "Invalid press number." });
    }

    // REPLACEMENT CRATE
    let replacementCrateValue = null;
    if (order_type === 'crate_removal') {
        if (replacement_crate !== 'yes' && replacement_crate !== 'no') {
            console.log("Invalid replacement crate value:", replacement_crate);  // Debugging log
            return res.status(400).json({ success: false, message: "Invalid replacement crate value." });
        }
        replacementCrateValue = replacement_crate;
    }

    const orderData = {
        order_type,
        replacement_crate: replacementCrateValue,
        additional_notes: additional_notes || null,
        press_number: parseInt(press_number, 10),
        machine_operator: machineOperator,
        status: 'pending',  // New orders are always pending
        created_at: new Date().toLocaleString("sv-SE", { timeZone: "Europe/Tallinn" }) // YYYY-MM-DD HH:mm:ss
    };

    db.query("INSERT INTO orders SET ?", orderData, (err, result) => {
        if (err) {
            console.error("Database insertion error:", err);
            return res.status(500).json({ success: false, message: "Server error while creating order." });
        }
        console.log("Order saved to database with ID:", result.insertId);
        res.json({ success: true, message: "Order received!", orderId: result.insertId });
    });
});


// GET ORDERS
app.get('/api/orders', verifyToken, (req, res) => {
    console.log("User from token:", req.user);
    const role = req.user.role;
    const username = req.user.username;

    if (role === 'hall_worker' || role === 'shift_leader') {

        db.query("SELECT * FROM orders", (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, orders: results });
        });
    } else if (role === 'machine_operator') {
        db.query("SELECT * FROM orders WHERE machine_operator = ?", [username], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, orders: results });
        });
    } else {
        return res.status(403).json({ success: false, message: "Unauthorized. Only hall workers, shift leaders and machine operators can view orders." });
    }
});




// MARK ORDER RECEIVED
app.put("/api/orders/in-progress/:id", verifyToken, (req, res) => {
    if (req.user.role !== "hall_worker") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only hall workers can mark orders as in progress." });
    }

    const orderId = req.params.id;
    db.query(
        "UPDATE orders SET status = 'in_progress' WHERE id = ? AND status = 'pending'",
        [orderId],
        (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (result.affectedRows > 0) {
                res.json({ success: true, message: "Order marked as in progress!" });
            } else {
                res.status(400).json({ success: false, message: "Order could not be marked as in progress." });
            }
        }
    );
});


// MOVE TO IN PROGRESS
app.put("/api/orders/:id", verifyToken, (req, res) => {
    const orderId = req.params.id;
    const newStatus = req.body.status;
    const role = req.user.role;

    if (!["pending", "in_progress", "completed"].includes(newStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    if ((newStatus === "in_progress" || newStatus === "completed") && role !== "hall_worker") {
        return res.status(403).json({ success: false, message: "Unauthorized to update status" });
    }

    db.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        [newStatus, orderId],
        (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (result.affectedRows > 0) {
                res.json({ success: true, message: `Order status updated to ${newStatus}!` });
            } else {
                res.status(400).json({ success: false, message: "Order not found or status unchanged." });
            }
        }
    );
});


// DELETE ORDER (Machine Operators)
app.delete("/api/orders/:id", verifyToken, (req, res) => {
    const orderId = req.params.id;
    const username = req.user.username;
    const role = req.user.role;

    let query, params;
    if (role === "machine_operator") {
        query = "DELETE FROM orders WHERE id = ? AND machine_operator = ? AND status = 'pending'";
        params = [orderId, username];
    } else if (role === "shift_leader") {
        query = "DELETE FROM orders WHERE id = ? AND status = 'pending'";
        params = [orderId];
    } else {
        return res.status(403).json({ success: false, message: "Unauthorized. Only machine operators and shift leaders can delete orders." });
    }

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (result.affectedRows > 0) {
            res.json({ success: true, message: "Order cancelled!" });
        } else {
            res.status(400).json({ success: false, message: "Order not found or cannot be cancelled." });
        }
    });
});

//app.use(express.static(path.join(__dirname, '../frontend/dist')));

//app.get('*', (req, res) => {
//  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
//});
