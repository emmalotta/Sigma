document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("create-employee-form");
    const roleSelect = document.getElementById("role");
    const errorMessageElement = document.getElementById("error-message");
    const successMessageElement = document.getElementById("success-message");

    if (!form || !roleSelect) {
        console.error("Form or role dropdown not found!");
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const newUsername = document.getElementById("employee-username").value.trim();
        const newPassword = document.getElementById("employee-password").value.trim();
        const role = roleSelect.value.trim();

        if (!newUsername || !newPassword || !role) {
            errorMessageElement.textContent = "Kõik väljad on kohustuslikud.";
            return;
        }

        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                errorMessageElement.textContent = "Peate olema sisseloginud administraatorina.";
                return;
            }

             const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-employee`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ newUsername, newPassword, role }),
            });

            const data = await response.json();

            if (data.success) {
                successMessageElement.textContent = "Töötaja loodud edukalt!";
                errorMessageElement.textContent = "";
            } else {
                errorMessageElement.textContent = "❌ " + data.message;
                successMessageElement.textContent = "";
            }
        } catch (error) {
            console.error("Error creating employee:", error);
            errorMessageElement.textContent = "Tekkis viga. Palun proovige uuesti.";
        }
    });
});
