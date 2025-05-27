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

            let ordersToShow = [];
            if (activeTab === 'pending') {
                ordersToShow = pendingOrders;
            } else if (activeTab === 'in-progress') {
                ordersToShow = inProgressOrders;
            } else if (activeTab === 'history') {
                ordersToShow = completedOrders;
            }

            if (ordersToShow.length === 0) {
                ordersContainer.innerHTML = `
                    <tr>
                        <td colspan="5" class="p-4 text-center text-gray-600 dark:text-gray-300">
                            No orders to display.
                        </td>
                    </tr>
                `;
            } else {
                ordersToShow.forEach(order => {
                    const orderRow = createOrderRow(order);
                    ordersContainer.appendChild(orderRow);
                });
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
            statusLabel = "Ootel";
            break;
        case "in_progress":
            statusLabel = "Töös";
            break;
        case "completed":
            statusLabel = "Täidetud";
            break;
        default:
            statusLabel = order.status;
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
