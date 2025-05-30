const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const pendingTab = document.getElementById("pending-tab");
    const inProgressTab = document.getElementById("in-progress-tab");
    const historyTab = document.getElementById("history-tab");

    pendingTab.addEventListener("click", () => showTab("pending"));
    inProgressTab.addEventListener("click", () => showTab("in-progress"));
    historyTab.addEventListener("click", () => showTab("history"));

    showTab("pending");
});


let activeTab = 'pending';

function showTab(tab) {
    activeTab = tab;

    document.getElementById('pending-tab').classList.toggle('bg-blue-600', tab === 'pending');
    document.getElementById('pending-tab').classList.toggle('bg-gray-600', tab !== 'pending');
    document.getElementById('in-progress-tab').classList.toggle('bg-blue-600', tab === 'in-progress');
    document.getElementById('in-progress-tab').classList.toggle('bg-gray-600', tab !== 'in-progress');
    document.getElementById('history-tab').classList.toggle('bg-blue-600', tab === 'history');
    document.getElementById('history-tab').classList.toggle('bg-gray-600', tab !== 'history');

    fetchOrders();
}


// Fetch
async function fetchOrders() {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const ordersContainer = document.getElementById("orders-container");
            ordersContainer.innerHTML = '';

            const pendingOrders = data.orders.filter(order => order.status === 'pending');
            const inProgressOrders = data.orders.filter(order => order.status === 'in_progress');
            const completedOrders = data.orders.filter(order => order.status === 'completed');

            if (activeTab === 'pending') {
                pendingOrders.forEach(order => {
                    const orderCard = createOrderCard(order);
                    ordersContainer.appendChild(orderCard);
                });
            } else if (activeTab === 'in-progress') {
                inProgressOrders.forEach(order => {
                    const orderCard = createOrderCard(order);
                    ordersContainer.appendChild(orderCard);
                });
            } else if (activeTab === 'history') {
                completedOrders.forEach(order => {
                    const orderCard = createOrderCard(order);
                    ordersContainer.appendChild(orderCard);
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

// Display orders
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

// Card
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
        <td class="p-4" id="action-${order.id}"></td>
    `;

    // Create buttons based on the active tab
    const actionCell = row.querySelector(`#action-${order.id}`);
    if (activeTab === 'pending') {
        const takeButton = document.createElement("button");
        takeButton.textContent = "Võta vastu";
        takeButton.className = "px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition";
        takeButton.onclick = () => markOrderInProgress(order.id);
        actionCell.appendChild(takeButton);
    } else if (activeTab === 'in-progress') {
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Loobu";
        cancelButton.className = "mr-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition";
        cancelButton.onclick = () => markOrderPending(order.id);

        const completeButton = document.createElement("button");
        completeButton.textContent = "Täidetud";
        completeButton.className = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition";
        completeButton.onclick = () => markOrderCompleted(order.id);

        actionCell.appendChild(cancelButton);
        actionCell.appendChild(completeButton);
    }

    return row;
}


// GENERIC function to update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Tellimuse staatus muudetud: ${newStatus}!`);
            fetchOrders(); // Refresh the list
        }

    } catch (error) {
        console.error(`Viga tellimuse staatuse muutmisel:`, error);
        showError("Tellimuse staatuse muutmisel tekkis viga.");
    }
}


// Use the generic update function for all status changes
function markOrderPending(orderId) {
    updateOrderStatus(orderId, 'pending');
}

function markOrderCompleted(orderId) {
    updateOrderStatus(orderId, 'completed');
}

function markOrderInProgress(orderId) {
    updateOrderStatus(orderId, 'in_progress');
}

//ERROR
function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
        <tr>
            <td colspan="5" class="p-4 text-red-500 text-center">${message}</td>
        </tr>
    `;
}

