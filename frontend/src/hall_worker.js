// Get the auth token
const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";
}

// Fetch pending orders
function fetchOrders() {
    fetch('http://localhost:3000/api/orders', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders);
            } else {
                alert("Failed to fetch orders.");
            }
        })
        .catch(error => console.error("Error fetching orders:", error));
}

// Display orders in the UI
function displayOrders(orders) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = "";

    if (orders.length === 0) {
        ordersContainer.innerHTML = "<p class='text-gray-500 text-center'>No pending orders.</p>";
        return;
    }

    orders.forEach(order => {
        const orderElement = document.createElement("div");
        orderElement.classList.add("border", "p-4", "rounded", "shadow", "bg-gray-50");

        orderElement.innerHTML = `
            <p><strong>Operator:</strong> ${order.machine_operator}</p>
            <p><strong>Order Type:</strong> ${order.order_type}</p>
            ${order.order_type === "crate_removal" ? `<p><strong>Replacement Crate:</strong> ${order.replacement_crate}</p>` : ""}
            ${order.additional_notes ? `<p><strong>Notes:</strong> ${order.additional_notes}</p>` : ""}
            <button class="bg-green-500 text-white px-4 py-1 rounded mt-2" onclick="markOrderReceived(${order.id})">Mark as Received</button>
        `;

        ordersContainer.appendChild(orderElement);
    });
}

// Mark order as received
function markOrderReceived(orderId) {
    fetch(`http://localhost:3000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Order marked as received!");
                fetchOrders();
            } else {
                alert("Failed to mark order as received.");
            }
        })
        .catch(error => console.error("Error updating order:", error));
}

// Load orders when the page loads
fetchOrders();
