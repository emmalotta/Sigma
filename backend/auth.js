const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

// Basic token verification
function verifyToken(req, res, next) {
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
}

// Middleware for checking specific role
function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ success: false, message: `Unauthorized. ${role}s only.` });
        }
        next();
    };
}

// Middleware for multiple allowed roles
function authorizeRoles(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Unauthorized. Insufficient role." });
        }
        next();
    };
}

module.exports = { verifyToken, authorizeRole, authorizeRoles };
