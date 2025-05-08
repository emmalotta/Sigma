// Get the auth token
const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";
}

// State to keep track of active tab
let activeTab = 'pending';

// Switch between tabs
function showTab(tab) {
    activeTab = tab;

    // Update tab button styles
    document.getElementById('pending-tab').classList.toggle('bg-blue-600', tab === 'pending');
    document.getElementById('pending-tab').classList.toggle('bg-gray-600', tab !== 'pending');
    document.getElementById('in-progress-tab').classList.toggle('bg-blue-600', tab === 'in-progress');
    document.getElementById('in-progress-tab').classList.toggle('bg-gray-600', tab !== 'in-progress');

    fetchOrders();
}

async function fetchOrders() {
    try {
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Clear the container before adding new content
            const ordersContainer = document.getElementById("orders-container");
            ordersContainer.innerHTML = '';

            // Separate orders by status
            const pendingOrders = data.orders.filter(order => order.status === 'pending');
            const inProgressOrders = data.orders.filter(order => order.status === 'in_progress');

            // Display the orders based on the active tab
            if (activeTab === 'pending') {
                displayOrders(pendingOrders, 'Ootel tellimused');
            } else if (activeTab === 'in-progress') {
                displayOrders(inProgressOrders, 'Töös olevad tellimused');
            }
        } else {
            showError("Tellimuste laadimine ebaõnnestus.");
        }
    } catch (error) {
        console.error("Viga tellimuste laadimisel:", error);
        showError("Tellimuste laadimisel tekkis viga.");
    }
}


// Display orders in their respective sections
function displayOrders(orders, sectionTitle) {
    const ordersContainer = document.getElementById("orders-container");
    const section = document.createElement("div");
    section.innerHTML = `<h3 class="text-xl font-bold mb-4">${sectionTitle}</h3>`;

    orders.forEach(order => {
        const orderCard = createOrderCard(order);
        section.appendChild(orderCard);
    });

    ordersContainer.appendChild(section);
}

// Create order card HTML that matches the table layout
function createOrderCard(order) {
    const row = document.createElement("tr");
    row.className = "bg-gray-100 dark:bg-gray-700 transition";

    let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
        order.order_type === "crate_removal" ? "Kastide eemaldus" :
            order.order_type;

    row.innerHTML = `
        <td class="p-4">${order.machine_operator}</td>
        <td class="p-4">${orderType}</td>
        ${order.order_type === "crate_removal" ? `
            <td class="p-4">${order.replacement_crate || "Puudub"}</td>` : `
            <td class="p-4">-</td>`}
        ${order.additional_notes ? `
            <td class="p-4">${order.additional_notes}</td>` : `
            <td class="p-4">-</td>`}
        <td class="p-4">
            <button class="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition" 
                onclick="markOrderInProgress(${order.id})">Liigu töösse</button>
        </td>
    `;

    return row;
}

// Update fetchOrders to correctly append rows
async function fetchOrders() {
    try {
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Clear the container before adding new content
            const ordersContainer = document.getElementById("orders-container");
            ordersContainer.innerHTML = '';

            // Separate orders by status
            const pendingOrders = data.orders.filter(order => order.status === 'pending');
            const inProgressOrders = data.orders.filter(order => order.status === 'in_progress');

            // Display the orders based on the active tab
            if (activeTab === 'pending') {
                pendingOrders.forEach(order => {
                    const orderCard = createOrderCard(order);
                    ordersContainer.appendChild(orderCard); // Add to tbody
                });
            } else if (activeTab === 'in-progress') {
                inProgressOrders.forEach(order => {
                    const orderCard = createOrderCard(order);
                    ordersContainer.appendChild(orderCard); // Add to tbody
                });
            }
        } else {
            showError("Tellimuste laadimine ebaõnnestus.");
        }
    } catch (error) {
        console.error("Viga tellimuste laadimisel:", error);
        showError("Tellimuste laadimisel tekkis viga.");
    }
}






async function markOrderReceived(orderId) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/received/${orderId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            alert("Tellimus märgiti vastu võetuks!");
            // After marking as received, move to in-progress
            moveOrderToInProgress(orderId);
        } else {
            showError("Tellimuse märkimine ebaõnnestus.");
        }
    } catch (error) {
        console.error("Viga tellimuse märkimisel:", error);
        showError("Tellimuse märkimisel tekkis viga.");
    }
}

// Move order to in-progress
async function markOrderInProgress(orderId) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'in_progress' })
        });

        const data = await response.json();

        if (data.success) {
            alert("Tellimus liikus töösse!");
            fetchOrders(); // Refresh the order list
        } else {
            showError("Tellimuse liikumisel töösse tekkis viga.");
        }
    } catch (error) {
        console.error("Viga tellimuse liikumisel töösse:", error);
        showError("Tellimuse liikumisel töösse tekkis viga.");
    }
}







// Show error message
function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
        <tr>
            <td colspan="4" class="p-4 text-red-500 text-center">${message}</td>
        </tr>
    `;
}

// Initialize with the default tab
document.addEventListener("DOMContentLoaded", () => {
    showTab('pending');
});
