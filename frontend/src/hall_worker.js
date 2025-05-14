const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";
}

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
        const response = await fetch('http://localhost:3000/api/orders', {
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
            } else {
                showError("Tellimuste laadimine ebaõnnestus.");
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



//MARK ORDER RECEIVED
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

// MARK ORDER IN PROGRESS
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

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
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
        } else {
            showError(`Tellimuse staatuse muutmine ebaõnnestus: ${data.message}`);
        }
    } catch (error) {
        console.error(`Viga tellimuse staatuse muutmisel:`, error);
        showError("Tellimuse staatuse muutmisel tekkis viga.");
    }
}

// Using the generic update function for both buttons
function markOrderPending(orderId) {
    updateOrderStatus(orderId, 'pending');
}

function markOrderCompleted(orderId) {
    updateOrderStatus(orderId, 'completed');
}

function markOrderInProgress(orderId) {
    updateOrderStatus(orderId, 'in_progress');
}






// Error
function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
        <tr>
            <td colspan="4" class="p-4 text-red-500 text-center">${message}</td>
        </tr>
    `;
}


document.addEventListener("DOMContentLoaded", () => {
    showTab('pending');
});
