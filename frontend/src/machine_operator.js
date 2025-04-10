// Get the auth token
const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";


}

let selectedOrderType = null;


document.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Determine selected type   
        if (btn.textContent.includes('Kumm')) {
            selectedOrderType = 'rubber';
        } else if (btn.textContent.includes('Toodang')) {
            selectedOrderType = 'crate_removal';

        } else if (btn.textContent.includes('Pakkematerjal')) {
            selectedOrderType = 'packaging';

        } else if (btn.textContent.includes('Komponent')) {
            selectedOrderType = 'component';
        }

        // Store value in hidden input
        document.getElementById('order-type').value = selectedOrderType;

        // Toggle crate replacement section
        const replacementCrateSection = document.getElementById("replacement-crate-section");
        if (selectedOrderType === "crate_removal") {
            replacementCrateSection.classList.remove("hidden");
        } else {
            replacementCrateSection.classList.add("hidden");
        }

        // Style selected button
        document.querySelectorAll('.order-btn').forEach(b => b.classList.remove('ring', 'ring-offset-2'));
        btn.classList.add('ring', 'ring-offset-2,', 'ring-blue-400', 'bg-blue-100');
    });
});


// Handle form submission
document.getElementById("order-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const orderType = document.getElementById("order-type").value;
    if (!orderType) {
        alert("Please select an order type before submitting.");
        return;
    }

    const replacementCrate = document.getElementById("replacement-crate").checked ? "yes" : "no";
    const additionalNotes = document.getElementById("additional-notes").value.trim();

    // Create request payload
    const orderData = {
        order_type: orderType,
        replacement_crate: orderType === "crate_removal" ? replacementCrate : null,
        additional_notes: additionalNotes || null
    };

    console.log("Sending order:", orderData);


    // Send order to backend
    fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Order submitted successfully!");
                document.getElementById("order-form").reset();
            } else {
                alert("Failed to submit order.");
            }
        })
        .catch(error => console.error("Error submitting order:", error));
});

document.getElementById("order-type").addEventListener("change", function () {
    const replacementCrateSection = document.getElementById("replacement-crate-section");
    if (this.value === "crate_removal") {
        replacementCrateSection.classList.remove("hidden");
    } else {
        replacementCrateSection.classList.add("hidden");
    }
});





