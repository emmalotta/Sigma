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


    document.getElementById('order-form-container').style.display = (tab === 'order') ? 'block' : 'none';
    document.getElementById('orders-container').style.display = (tab === 'order') ? 'none' : 'block';

    ['order-tab', 'pending-tab', 'in-progress-tab', 'history-tab'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        if (id === `${tab}-tab`) {
            btn.classList.add('tab-active');
            btn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
            btn.classList.add('bg-sigma', 'hover:bg-blue-700', 'text-white');
        } else {
            btn.classList.remove('tab-active');
            btn.classList.remove('bg-sigma', 'hover:bg-blue-700', 'text-white');
            btn.classList.add('bg-gray-600', 'hover:bg-gray-700', 'text-white');
        }
    });

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
    ordersContainer.innerHTML = ''; // clear previous content

    const pendingOrders = cachedOrders.filter(order => order.status === 'pending');
    const inProgressOrders = cachedOrders.filter(order => order.status === 'in_progress');
    const completedOrders = cachedOrders.filter(order => order.status === 'completed');

    const ordersToDisplay = (activeTab === 'pending') ? pendingOrders :
                            (activeTab === 'in-progress') ? inProgressOrders :
                            (activeTab === 'history') ? completedOrders : [];

    if (ordersToDisplay.length === 0) {
        ordersContainer.innerHTML = `
            <p class="text-center py-6 text-gray-500 dark:text-gray-400">Tellimusi ei leitud.</p>
        `;
        return;
    }

    // Create table element
    const table = document.createElement('table');
    table.className = 'w-full text-left rounded-lg overflow-hidden shadow-md';

    // TABLE HEAD
    table.innerHTML = `
        <thead class="bg-sigma text-white">
            <tr>
                <th class="px-4 py-3">Operaator</th>
                <th class="px-4 py-3">Tellimuse tüüp</th>
                <th class="px-4 py-3">Uus kast</th>
                <th class="px-4 py-3">Märkused</th>
                <th class="px-4 py-3">Tegevused</th>
            </tr>
        </thead>
    `;

    // TABLE BODY
    const tbody = document.createElement('tbody');

    // ROWS
    ordersToDisplay.forEach((order, index) => {
        const tr = document.createElement('tr');

        tr.className = index % 2 === 0 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800';

        let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
            order.order_type === "crate_removal" ? "Kastide eemaldus" :
                order.order_type;

        tr.innerHTML = `
            <td class="px-4 py-3">${order.machine_operator}</td>
            <td class="px-4 py-3">${orderType}</td>
            <td class="px-4 py-3">${order.order_type === "crate_removal" ? (order.replacement_crate || "Puudub") : '-'}</td>
            <td class="px-4 py-3">${order.additional_notes ? order.additional_notes : '-'}</td>
            <td class="px-4 py-3 flex gap-2"></td>
        `;


        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    ordersContainer.appendChild(table);
}


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

function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
        <tr>
            <td colspan="5" class="p-4 text-red-500 text-center">${message}</td>
        </tr>
    `;
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
        btn.classList.remove("bg-blue-700", "text-white");
        btn.classList.add("bg-sigma");
      });

      button.classList.add("bg-blue-700", "text-white");
      button.classList.remove("bg-sigma");

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
        alert("Palun vali töökäsk.");
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
        alert("Tellimus saadetud!");
        orderForm.reset();
        orderTypeInput.value = "";
        selectedOrderType = "";
        replacementCrateCheckbox.checked = false;
        replacementCrateSection.classList.add("hidden");

        orderTypeButtons.forEach(btn => btn.classList.remove("bg-blue-700", "text-white"));
        } else {
        alert("Tellimuse saatmine ebaõnnestus: " + (result.message || "Viga serveris"));
        }
    } catch (error) {
        console.error("Tellimuse saatmisel viga:", error);
        alert("Tellimuse saatmisel tekkis viga.");
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
