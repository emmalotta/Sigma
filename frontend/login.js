const form = document.querySelector("form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login");




form.addEventListener("submit", async function (event) {
    event.preventDefault();


    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();


    if (username === "") {
        alert("Please enter a username.");
        return;
    }

    if (password === "") {
        alert("Please enter a password.");
        return;
    }

    try {
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        const errorMessageElement = document.getElementById("error-message");

        if (data.success) {
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("userRole", data.role);

            if (data.role === "admin") {
                window.location.href = "admin.html";
            } else if (data.role === "machine_operator") {
                window.location.href = "machine_operator.html";
            } else {
                window.location.href = "hall_worker.html";
            }

        } else {
            errorMessageElement.textContent = data.message;
        }



    } catch (error) {
        console.error("Error during login:", error);
        alert("There was an error with the login request. Please try again later.");
    }
});


form.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        loginButton.click();
    }
});
