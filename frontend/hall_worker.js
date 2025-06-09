const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
if (!token || role !== 'hall_worker') {
  window.location.href = '/index.html';
} else {
    document.body.classList.remove('hidden');
}

if (!token) {
    window.location.href = "login.html";
}

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

// FETCH ORDERS
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
            cardsContainer.innerHTML = '';

            // SORT ORDERS
            const sortedOrders = data.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const pendingOrders = sortedOrders.filter(order => order.status === 'pending');
            const inProgressOrders = sortedOrders.filter(order => order.status === 'in_progress');
            const completedOrders = sortedOrders.filter(order => order.status === 'completed');

            let ordersToShow = [];
            if (activeTab === 'pending') ordersToShow = pendingOrders;
            else if (activeTab === 'in-progress') ordersToShow = inProgressOrders;
            else if (activeTab === 'history') ordersToShow = completedOrders;


            ordersToShow.forEach((order, idx) => {
                const orderRow = createOrderCard(order, idx);
                ordersContainer.appendChild(orderRow);
            });

            renderOrderCards(ordersToShow);

        } else {
            showError("Tellimuste laadimine ebaõnnestus.");
        }
    } catch (error) {
        console.error("Viga tellimuste laadimisel:", error);
        showError("Tellimuste laadimisel tekkis viga.");
    }
}

// DISPALY ORDERS
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

// CARD
function createOrderCard(order, index) {
    const row = document.createElement("tr");
    row.className = `${index % 2 === 0 ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-blue-50 dark:hover:bg-blue-900 transition`;

    let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
        order.order_type === "crate_removal" ? "Kastide eemaldus" :
            order.order_type;

    const createdAt = order.created_at
        ? new Date(order.created_at).toLocaleString('et-EE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : "-";

    // Create cells
    const cells = [
        order.machine_operator,
        orderType,
        order.order_type === "crate_removal" ? (order.replacement_crate || "Puudub") : "-",
        order.additional_notes || "-",
        createdAt
    ];

    cells.forEach(val => {
        const td = document.createElement("td");
        td.className = "p-4";
        td.textContent = val;
        row.appendChild(td);
    });

    // Action cell
    const actionCell = document.createElement("td");
    actionCell.className = "p-4";

    if (activeTab === 'pending') {
        const takeButton = document.createElement("button");
        takeButton.className = "inline-flex items-center justify-center p-2 bg-green-600 text-white font-medium rounded-full shadow hover:bg-green-700 transition duration-200";
        takeButton.textContent = "Nõustu";
        takeButton.className = "inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-full shadow hover:bg-green-700 transition duration-200";
        takeButton.onclick = () => markOrderInProgress(order.id);
        actionCell.appendChild(takeButton);
    } else if (activeTab === 'in-progress') {
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Loobu";
        cancelButton.className = "inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-full shadow hover:bg-red-700 transition duration-200";
        cancelButton.onclick = () => markOrderPending(order.id);

        const completeButton = document.createElement("button");
        completeButton.textContent = "Täidetud";
        completeButton.className = "inline-flex items-center gap-2 px-4 py-2 bg-sigma text-white font-medium rounded-full shadow hover:bg-blue-700 transition duration-200";
        completeButton.onclick = () => markOrderCompleted(order.id);

        actionCell.appendChild(cancelButton);
        actionCell.appendChild(completeButton);
    }

    row.appendChild(actionCell);
    return row;
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
                    <span>${order.created_at ? new Date(order.created_at).toLocaleString('et-EE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                </div>
            </div>
            <div class="flex gap-2 mt-2">
                ${activeTab === 'pending' ? `
                    <button
                        class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold bg-green-600 text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                        onclick="markOrderInProgress('${order.id}')">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Nõustu
                    </button>
                ` : ""}
                ${activeTab === 'in-progress' ? `
                    <button
                        class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold bg-red-600 text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                        onclick="markOrderPending('${order.id}')">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        Loobu
                    </button>
                    <button
                        class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold bg-sigma text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        onclick="markOrderCompleted('${order.id}')">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Täidetud
                    </button>
                ` : ""}
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

// UPDATE ORDER STATUS
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
            showSuccess(`Tellimuse staatus muudetud: ${newStatus === "pending" ? "Ootel" : newStatus === "in_progress" ? "Töös" : "Täidetud"}!`);
            fetchOrders();
        }

    } catch (error) {
        console.error(`Viga tellimuse staatuse muutmisel:`, error);
        showError("Tellimuse staatuse muutmisel tekkis viga.");
    }
}


// STATUS UPDATES
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

function showSuccess(message) {
    const msg = document.getElementById("success-message");
    if (!msg) return;
    msg.textContent = message;
    msg.classList.remove("hidden");
    setTimeout(() => {
        msg.classList.add("hidden");
    }, 2500);
}

// Make status update functions available globally for inline onclick
window.markOrderInProgress = markOrderInProgress;
window.markOrderPending = markOrderPending;
window.markOrderCompleted = markOrderCompleted;
