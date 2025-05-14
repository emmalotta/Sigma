// Get the auth token
const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";


}

// Function to create an order card
function createOrderCard(order) {
    const card = document.createElement("div");
    card.classList.add("p-4", "mb-2", "bg-gray-200", "dark:bg-gray-700", "rounded-lg");

    const orderType = document.createElement("p");
    orderType.textContent = `Tellimuse tüüp: ${order.order_type}`;

    const status = document.createElement("p");
    status.textContent = `Staatus: ${order.status}`;

    const notes = document.createElement("p");
    notes.textContent = `Märkused: ${order.additional_notes || "Puudub"}`;

    card.appendChild(orderType);
    card.appendChild(status);
    card.appendChild(notes);

    return card;
}


let activeTab = 'order';


function showTab(tab) {
    // Update the active tab variable
    activeTab = tab;

    // Hide all tab contents
    const orderForm = document.getElementById('order-form-container');
    const ordersContainer = document.getElementById('orders-container');

    orderForm.classList.add('hidden');
    ordersContainer.innerHTML = ''; // Clear previous orders

    // Reset button colors
    const tabs = ['order', 'pending', 'in-progress', 'history'];
    tabs.forEach(t => {
        document.getElementById(`${t}-tab`).classList.replace('bg-sigma', 'bg-gray-600');
    });

    // Highlight the active tab
    document.getElementById(`${tab}-tab`).classList.replace('bg-gray-600', 'bg-sigma');

    // Show the selected tab content
    if (tab === 'order') {
        orderForm.classList.remove('hidden');
    } else {
        ordersContainer.classList.remove('hidden');
        fetchOrders(tab);
    }
}




// Fetch
async function fetchOrders() {
    try {
        const response = await fetch('http://localhost:3000/api/orders/my-orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            const ordersContainer = document.getElementById("orders-container");
            if (ordersContainer) {
                ordersContainer.innerHTML = '';
            } else {
                console.error("Element with ID 'orders-container' not found.");
            }


            const pendingOrders = data.orders.filter(order => order.status === 'pending');
            const inProgressOrders = data.orders.filter(order => order.status === 'in_progress');
            const completedOrders = data.orders.filter(order => order.status === 'completed');

            const ordersToDisplay = (activeTab === 'pending') ? pendingOrders :
                                   (activeTab === 'in-progress') ? inProgressOrders :
                                   (activeTab === 'history') ? completedOrders : [];

            ordersToDisplay.forEach(order => {
                const orderCard = createOrderCard(order);
                ordersContainer.appendChild(orderCard);
            });
        } else {
            alert("Tellimuste laadimine ebaõnnestus: " + data.message);
        }
    } catch (error) {
        console.error("Viga tellimuste laadimisel:", error);
    }
}




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





