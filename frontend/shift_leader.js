const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
if (!token || role !== 'shift_leader') {
  window.location.href = '/index.html';
} else {
    document.body.classList.remove('hidden');
}

fetch('/api/protected-data', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  window.location.href = '/index.html';
});

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
            const cardsContainer = document.getElementById("orders-cards");
            ordersContainer.innerHTML = '';
            if (cardsContainer) cardsContainer.innerHTML = '';

            const pendingOrders = data.orders.filter(order => order.status === 'pending');
            const inProgressOrders = data.orders.filter(order => order.status === 'in_progress');
            const completedOrders = data.orders.filter(order => order.status === 'completed');

            let ordersToShow = [];
            if (activeTab === 'pending') {
                ordersToShow = pendingOrders;
            } else if (activeTab === 'in-progress') {
                ordersToShow = inProgressOrders;
            } else if (activeTab === 'history') {
                ordersToShow = completedOrders;
            }

            if (ordersToShow.length === 0) {
                if (window.innerWidth < 640 && cardsContainer) {
                    cardsContainer.innerHTML = `<p class="text-center py-6 text-gray-500 dark:text-gray-400">Tellimusi ei leitud.</p>`;
                } else {
                    ordersContainer.innerHTML = `
                        <tr>
                            <td colspan="5" class="p-4 text-center text-gray-600 dark:text-gray-300">
                                No orders to display.
                            </td>
                        </tr>
                    `;
                }
            } else {
                if (window.innerWidth < 640 && cardsContainer) {
                    renderOrderCards(ordersToShow);
                } else {
                    ordersToShow.forEach(order => {
                        const orderRow = createOrderRow(order);
                        ordersContainer.appendChild(orderRow);
                    });
                }
            }

        } else {
            showError("Failed to load orders.");
        }
    } catch (error) {
        console.error("Error loading orders:", error);
        showError("An error occurred while loading orders.");
    }
}

function createOrderRow(order) {
    const row = document.createElement("tr");
    row.className = "bg-gray-100 dark:bg-gray-700 transition";

    let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
        order.order_type === "crate_removal" ? "Kastide eemaldus" :
            order.order_type;

    let statusLabel = "";
    switch (order.status) {
        case "pending":
    }

    row.innerHTML = `
        <td class="p-4">${order.machine_operator}</td>
        <td class="p-4">${orderType}</td>
        ${order.order_type === "crate_removal" ? `
            <td class="p-4">${order.replacement_crate || "Puudub"}</td>` : `
            <td class="p-4">-</td>`}
        ${order.additional_notes ? `
            <td class="p-4">${order.additional_notes}</td>` : `
            <td class="p-4">-</td>`}
        <td class="p-4 font-semibold">${statusLabel}</td>
    `;

    return row;
}

function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
        <tr>
            <td colspan="5" class="p-4 text-red-500 text-center">${message}</td>
        </tr>
    `;
}

function renderOrderCards(orders) {
    const cardsContainer = document.getElementById("orders-cards");
    cardsContainer.innerHTML = "";
    orders.forEach(order => {
        const card = document.createElement("div");
        card.className = "mb-4 rounded-xl shadow bg-gray-100 dark:bg-gray-700 p-4";
        card.innerHTML = `
            <div class="flex justify-between mb-2">
                <span class="font-semibold">Operaator:</span>
                <span>${order.machine_operator}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="font-semibold">Tüüp:</span>
                <span>${order.order_type === "material_order" ? "Materjalitellimus" : order.order_type === "crate_removal" ? "Kastide eemaldus" : order.order_type}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="font-semibold">Uus kast:</span>
                <span>${order.order_type === "crate_removal" ? (order.replacement_crate || "Puudub") : "-"}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="font-semibold">Märkused:</span>
                <span>${order.additional_notes || "-"}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="font-semibold">Staatus:</span>
                <span>${
                    order.status === "pending"
                        ? "Ootel"
                        : order.status === "in_progress"
                        ? "Töös"
                        : order.status === "completed"
                        ? "Täidetud"
                        : order.status
                }</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="font-semibold">Aeg:</span>
                <span>${order.created_at ? new Date(order.created_at).toLocaleString('et-EE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}
