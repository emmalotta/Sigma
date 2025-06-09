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

    const tabs = [
        { id: 'pending-tab', active: tab === 'pending' },
        { id: 'in-progress-tab', active: tab === 'in-progress' },
        { id: 'history-tab', active: tab === 'history' }
    ];
    tabs.forEach(({ id, active }) => {
        const btn = document.getElementById(id);
        btn.classList.toggle('bg-sigma', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow', active);
        btn.classList.toggle('bg-gray-200', !active);
        btn.classList.toggle('dark:bg-gray-700', !active);
        btn.classList.toggle('text-gray-800', !active);
        btn.classList.toggle('dark:text-gray-100', !active);
    });

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

function createOrderRow(order, index) {
    const row = document.createElement("tr");
    row.className = `${index % 2 === 0 ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-blue-50 dark:hover:bg-blue-900 transition`;

    let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
        order.order_type === "crate_removal" ? "Kastide eemaldus" :
            order.order_type;

    let statusLabel = "";
    switch (order.status) {
        case "pending":
            statusLabel = "Ootel"; break;
        case "in_progress":
            statusLabel = "Töös"; break;
        case "completed":
            statusLabel = "Täidetud"; break;
        default:
            statusLabel = order.status;
    }

    row.innerHTML = `
        <td class="p-2 sm:p-4">${order.machine_operator}</td>
        <td class="p-2 sm:p-4">${orderType}</td>
        ${order.order_type === "crate_removal" ? `
            <td class="p-2 sm:p-4">${order.replacement_crate || "Puudub"}</td>` : `
            <td class="p-2 sm:p-4">-</td>`}
        <td class="p-2 sm:p-4">${order.additional_notes || "-"}</td>
        <td class="p-2 sm:p-4 font-semibold">${statusLabel}</td>
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
        const statusMap = {
            pending: { text: "Ootel", color: "bg-yellow-100 text-yellow-800" },
            in_progress: { text: "Töös", color: "bg-blue-100 text-blue-800" },
            completed: { text: "Täidetud", color: "bg-green-100 text-green-800" }
        };
        const status = statusMap[order.status] || { text: order.status, color: "bg-gray-200 text-gray-800" };

        const card = document.createElement("div");
        card.className = "mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-5";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-lg font-bold text-gray-700 dark:text-gray-100">Tellimus #${order.id || ""}</span>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${status.color}">${status.text}</span>
            </div>
            <div class="space-y-2 mb-4">
                <div class="flex justify-between">
                    <span class="font-semibold text-gray-600 dark:text-gray-300">Operaator:</span>
                    <span>${order.machine_operator}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-semibold text-gray-600 dark:text-gray-300">Tüüp:</span>
                    <span>${order.order_type === "material_order" ? "Materjalitellimus" : order.order_type === "crate_removal" ? "Kastide eemaldus" : order.order_type}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-semibold text-gray-600 dark:text-gray-300">Uus kast:</span>
                    <span>${order.order_type === "crate_removal" ? (order.replacement_crate || "Puudub") : "-"}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-semibold text-gray-600 dark:text-gray-300">Märkused:</span>
                    <span>${order.additional_notes || "-"}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-semibold text-gray-600 dark:text-gray-300">Aeg:</span>
                    <span>${order.created_at ? new Date(order.created_at).toLocaleString('et-EE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Tallinn'
                    }) : "-"}</span>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}
