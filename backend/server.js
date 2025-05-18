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

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

db.connect((err) => {
    if (err) {
        console.error("MySQL connection error:", err);
        process.exit(1);
    } else {
        console.log("Connected to MySQL database!");
    }
});

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



// Create order (Machine Operators) 
app.post("/api/orders", verifyToken, (req, res) => {
    console.log("Received Order Data:", req.body);  // Debugging log

    if (req.user.role !== "machine_operator") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only machine operators can create orders." });
    }

    const { order_type, replacement_crate, additional_notes } = req.body;
    const machineOperator = req.user.username;



    console.log("Parsed Data - order_type:", order_type, "replacement_crate:", replacement_crate, "additional_notes:", additional_notes);

    // Validate order type
    const validOrderTypes = ['crate_removal', 'rubber', 'packaging', 'component'];
    if (!order_type || !validOrderTypes.includes(order_type)) {
        console.log("Invalid order type:", order_type);  // Debugging log
        return res.status(400).json({ success: false, message: "Invalid order type." });
    }

    // Handle replacement crate field only for crate_removal
    let replacementCrateValue = null;
    if (order_type === 'crate_removal') {
        if (replacement_crate !== 'yes' && replacement_crate !== 'no') {
            console.log("Invalid replacement crate value:", replacement_crate);  // Debugging log
            return res.status(400).json({ success: false, message: "Invalid replacement crate value." });
        }
        replacementCrateValue = replacement_crate;
    }

    // Prepare the order data
    const orderData = {
        order_type,
        replacement_crate: replacementCrateValue,
        additional_notes: additional_notes || null,
        machine_operator: machineOperator,
        status: 'pending',  // New orders are always pending
    };

    // Save the order to the database
    db.query("INSERT INTO orders SET ?", orderData, (err, result) => {
        if (err) {
            console.error("Database insertion error:", err);
            return res.status(500).json({ success: false, message: "Server error while creating order." });
        }
        console.log("Order saved to database with ID:", result.insertId);
        res.json({ success: true, message: "Order received!", orderId: result.insertId });
    });
});



// Get orders (hall workers see all, machine operators see only their own)
app.get('/api/orders', verifyToken, (req, res) => {
    const role = req.user.role;
    const username = req.user.username;

    if (role === 'hall_worker') {
        // Hall workers see ALL orders
        db.query("SELECT * FROM orders", (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, orders: results });
        });
    } else if (role === 'machine_operator') {
        // Machine operators see only their own orders
        db.query("SELECT * FROM orders WHERE machine_operator = ?", [username], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, orders: results });
        });
    } else {
        return res.status(403).json({ success: false, message: "Unauthorized. Only hall workers and machine operators can view orders." });
    }
});





// Mark order as received
app.put("/api/orders/in-progress/:id", verifyToken, (req, res) => {
    if (req.user.role !== "hall_worker") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only hall workers can mark orders as in progress." });
    }

    const orderId = req.params.id;

    // Mark as in progress
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


// Move to in progress
app.put("/api/orders/:id", verifyToken, (req, res) => {
    const orderId = req.params.id;
    const newStatus = req.body.status;
    const role = req.user.role;

    if (!["pending", "in_progress", "completed"].includes(newStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Only hall workers can change status to 'in_progress' or 'completed'
    if ((newStatus === "in_progress" || newStatus === "completed") && role !== "hall_worker") {
        return res.status(403).json({ success: false, message: "Unauthorized to update status" });
    }

    // If changing status back to pending (like 'Loobu' feature), hall workers can do it, or you can add logic here

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



app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
