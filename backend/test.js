const bcrypt = require("bcryptjs");

(async () => {
    const originalPassword = "admin123";  // Replace with your real password
    const hashedPassword = await bcrypt.hash(originalPassword, 10);

    console.log("🔒 Hashed Password:", hashedPassword);

    const isMatch = await bcrypt.compare(originalPassword, hashedPassword);
    console.log("✅ Match:", isMatch);
})();

