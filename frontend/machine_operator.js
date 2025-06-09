const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
if (!token || role !== 'machine_operator') {
    window.location.href = '/index.html';
} else {
    document.body.classList.remove('hidden');
}
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  window.location.href = '/index.html';
});

let activeTab = 'pending';
let cachedOrders = [];

// DEFAULT TAB
function showTab(tab) {
    activeTab = tab;

    const tabs = [
        { id: 'order-tab', active: tab === 'order' },
        { id: 'pending-tab', active: tab === 'pending' },
        { id: 'in-progress-tab', active: tab === 'in-progress' },
        { id: 'history-tab', active: tab === 'history' }
    ];
    tabs.forEach(({ id, active }) => {
        const btn = document.getElementById(id);
        btn.classList.toggle('bg-blue-600', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow', active);
        btn.classList.toggle('bg-gray-200', !active);
        btn.classList.toggle('dark:bg-gray-700', !active);
        btn.classList.toggle('text-gray-800', !active);
        btn.classList.toggle('dark:text-gray-100', !active);
    });

    document.getElementById('order-form-container').style.display = (tab === 'order') ? 'block' : 'none';
    document.getElementById('orders-container').style.display = (tab === 'order') ? 'none' : 'block';

    if (tab !== 'order') {
        fetchOrders();
    }
}


// FETCH ORDERS
async function fetchOrders() {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Laadimine...</td></tr>`;

    if (cachedOrders.length === 0) {  // fetch only if cache empty
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                cachedOrders = data.orders;
            } else {
                showError("Tellimuste laadimine ebaõnnestus.");
                return;
            }
        } catch (error) {
            console.error("Viga tellimuste laadimisel:", error);
            showError("Tellimuste laadimisel tekkis viga.");
            return;
        }
    }

    renderOrders();
}

// RENDER ORDERS
function renderOrders() {
    const ordersContainer = document.getElementById("orders-container");
    const cardsContainer = document.getElementById("orders-cards");
    ordersContainer.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';

    const pendingOrders = cachedOrders.filter(order => order.status === 'pending');
    const inProgressOrders = cachedOrders.filter(order => order.status === 'in_progress');
    const completedOrders = cachedOrders.filter(order => order.status === 'completed');

    let ordersToDisplay = (activeTab === 'pending') ? pendingOrders :
                          (activeTab === 'in-progress') ? inProgressOrders :
                          (activeTab === 'history') ? completedOrders : [];

    ordersToDisplay = ordersToDisplay.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (ordersToDisplay.length === 0) {
        if (window.innerWidth < 640 && cardsContainer) {
            cardsContainer.innerHTML = `<p class="text-center py-6 text-gray-500 dark:text-gray-400">Tellimusi ei leitud.</p>`;
        } else {
            ordersContainer.innerHTML = `<p class="text-center py-6 text-gray-500 dark:text-gray-400">Tellimusi ei leitud.</p>`;
        }
        return;
    }

    // MOBILE
    if (window.innerWidth < 640 && cardsContainer) {
        renderOrderCards(ordersToDisplay);
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full text-sm sm:text-base bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden shadow';

    // TABLE HEAD
    table.innerHTML = `
        <thead>
            <tr class="bg-gray-300 dark:bg-gray-600">
                <th class="p-2 sm:p-4 font-semibold">Operaator</th>
                <th class="p-2 sm:p-4 font-semibold">Tellimuse tüüp</th>
                <th class="p-2 sm:p-4 font-semibold">Uus kast</th>
                <th class="p-2 sm:p-4 font-semibold">Märkused</th>
                <th class="p-2 sm:p-4 font-semibold">Aeg</th>
                <th class="p-2 sm:p-4"></th>
            </tr>
        </thead>
    `;

    // TABLE BODY
    const tbody = document.createElement('tbody');

    ordersToDisplay.forEach((order, index) => {
        const tr = document.createElement('tr');
        tr.className = `${index % 2 === 0 ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-blue-50 dark:hover:bg-blue-900 transition`;

        let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
            order.order_type === "crate_removal" ? "Kastide eemaldus" :
                order.order_type;

        const createdAt = order.created_at
            ? new Date(order.created_at).toLocaleString('et-EE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            : "-";

        // Cells
        tr.innerHTML = `
            <td class="p-4">${order.machine_operator}</td>
            <td class="p-4">${orderType}</td>
            <td class="p-4">${order.order_type === "crate_removal" ? (order.replacement_crate || "Puudub") : '-'}</td>
            <td class="p-4">${order.additional_notes ? order.additional_notes : '-'}</td>
            <td class="p-4">${createdAt}</td>
            <td class="p-4 flex gap-2"></td>
        `;

        // BUTTON?
        //const actionCell = tr.querySelector('td:last-child');
        //if (activeTab === 'pending') {
            //const cancelButton = document.createElement("button");
            //cancelButton.textContent = "Loobu";
            //cancelButton.className = "inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-full shadow hover:bg-red-700 transition duration-200";
            //cancelButton.onclick = () => markOrderPending(order.id);
            //actionCell.appendChild(cancelButton);

        //}
        tbody.appendChild(tr);
        
    });

    table.appendChild(tbody);
    ordersContainer.appendChild(table);
}

window.addEventListener("resize", () => {
    renderOrders();
});

// CREATE ORDER CARD
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
        <td class="p-4">${order.replacement_crate === 'yes' ? 'Jah' : order.replacement_crate === 'no' ? 'Ei' : "Puudub"}</td>` : `
        <td class="p-4">-</td>`}

        ${order.additional_notes ? `
            <td class="p-4">${order.additional_notes}</td>` : `
            <td class="p-4">-</td>`}
        <td class="p-4" id="action-${order.id}"></td>
    `;

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

        actionCell.appendChild(cancelButton);

    }

    return row;
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
            alert(`Tellimuse staatus muudetud: ${newStatus}!`);

            const orderIndex = cachedOrders.findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
                cachedOrders[orderIndex].status = newStatus;
            }
            renderOrders();
        } else {
            showError(`Tellimuse staatuse muutmine ebaõnnestus: ${data.message}`);
        }
    } catch (error) {
        console.error("Viga tellimuse staatuse muutmisel:", error);
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

function showSuccess(message) {
    const msg = document.getElementById("success-message");
    if (!msg) return;
    msg.textContent = message;
    msg.classList.remove("hidden");
    setTimeout(() => {
        msg.classList.add("hidden");
    }, 2500);
}

function showError(message) {
    const msg = document.getElementById("error-message");
    if (!msg) return;
    msg.textContent = message;
    msg.classList.remove("hidden");
    setTimeout(() => {
        msg.classList.add("hidden");
    }, 3500);
}

// EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
  const orderForm = document.getElementById("order-form");
  const orderTypeButtons = document.querySelectorAll(".order-btn");
  const orderTypeInput = document.getElementById("order-type");
  const replacementCrateSection = document.getElementById("replacement-crate-section");
  const replacementCrateCheckbox = document.getElementById("replacement-crate");
  const additionalNotes = document.getElementById("additional-notes");

  let selectedOrderType = "";

  orderTypeButtons.forEach(button => {
    button.addEventListener("click", () => {
      orderTypeButtons.forEach(btn => {
        btn.classList.remove("bg-blue-200", "border-blue-400", "ring-2", "ring-blue-200", "z-10");
        btn.classList.add("bg-sigma", "text-white", "border-transparent", "shadow-sm");
      });

      button.classList.remove("bg-sigma", "border-transparent", "shadow-sm");
      button.classList.add("bg-blue-500", "text-blue-900", "border-blue-400", "ring-2", "ring-blue-200", "z-10", "shadow-lg");

      selectedOrderType = button.getAttribute("data-type");
      if (orderTypeInput) {
        orderTypeInput.value = selectedOrderType;
      }

      if (selectedOrderType === "crate_removal") {
        replacementCrateSection.classList.remove("hidden");
      } else {
        replacementCrateSection.classList.add("hidden");
        replacementCrateCheckbox.checked = false;
      }
    });
  });

  
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!selectedOrderType) {
        showError("Palun vali töökäsk.");
        return;
    }

    const sendReplacementCrate = replacementCrateCheckbox.checked ? "yes" : "no";
    const notes = additionalNotes.value.trim();
    const token = localStorage.getItem("token");
    const orderData = {
        order_type: selectedOrderType,
        additional_notes: notes,
    };

    if (selectedOrderType === "crate_removal") {
        orderData.replacement_crate = sendReplacementCrate;
    }


    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
        });

        const result = await response.json();
        if (response.ok && result.success) {
        showSuccess("Tellimus saadetud!");
        orderForm.reset();
        orderTypeInput.value = "";
        selectedOrderType = "";
        replacementCrateCheckbox.checked = false;
        replacementCrateSection.classList.add("hidden");

        orderTypeButtons.forEach(btn => btn.classList.remove("bg-blue-700", "text-white"));
        } else {
            showError("Tellimuse saatmine ebaõnnestus: " + (result.message || "Viga serveris"));
        }
    } catch (error) {
        console.error("Tellimuse saatmisel viga:", error);
        showError("Tellimuse saatmisel tekkis viga.");
    }
    });
});



// TAB NAVIGATION
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('order-tab').addEventListener('click', () => showTab('order'));
    document.getElementById('pending-tab').addEventListener('click', () => showTab('pending'));
    document.getElementById('in-progress-tab').addEventListener('click', () => showTab('in-progress'));
    document.getElementById('history-tab').addEventListener('click', () => showTab('history'));

    showTab('order');
});

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
        `;
        cardsContainer.appendChild(card);
    });
}

