// Get the auth token
const token = localStorage.getItem('authToken');


if (!token) {
    window.location.href = "login.html";
}

let activeTab = 'pending';
let cachedOrders = [];

// Show the selected tab and load orders if needed
function showTab(tab) {
    activeTab = tab;

    // Show/hide content containers
    document.getElementById('order-form-container').style.display = (tab === 'order') ? 'block' : 'none';
    document.getElementById('orders-container').style.display = (tab === 'order') ? 'none' : 'block';

    // Highlight active tab button
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


// Fetch orders from API if not cached, then render
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

// Render orders based on activeTab and cachedOrders
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

    // Table header
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

    // Table body container
    const tbody = document.createElement('tbody');

    // Create rows
    ordersToDisplay.forEach((order, index) => {
        const tr = document.createElement('tr');
        // alternate row colors
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


// Create order card row
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

        const completeButton = document.createElement("button");
        completeButton.textContent = "Täidetud";
        completeButton.className = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition";
        completeButton.onclick = () => markOrderCompleted(order.id);

        actionCell.appendChild(cancelButton);
        actionCell.appendChild(completeButton);
    }

    return row;
}

// Update order status on backend and locally
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

            // Update cachedOrders locally to reflect changes instantly
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

// Specific status update functions
function markOrderPending(orderId) {
    updateOrderStatus(orderId, 'pending');
}

function markOrderCompleted(orderId) {
    updateOrderStatus(orderId, 'completed');
}

function markOrderInProgress(orderId) {
    updateOrderStatus(orderId, 'in_progress');
}

// Show error message in orders container
function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
        <tr>
            <td colspan="5" class="p-4 text-red-500 text-center">${message}</td>
        </tr>
    `;
}

// Event listeners for tab buttons
document.addEventListener("DOMContentLoaded", () => {
  const orderForm = document.getElementById("order-form");  // <-- Added this!
  const orderTypeButtons = document.querySelectorAll(".order-btn");
  const orderTypeInput = document.getElementById("order-type");
  const replacementCrateSection = document.getElementById("replacement-crate-section");
  const replacementCrateCheckbox = document.getElementById("replacement-crate");
  const additionalNotes = document.getElementById("additional-notes"); // you also use additionalNotes

  let selectedOrderType = "";

  orderTypeButtons.forEach(button => {
    button.addEventListener("click", () => {
      // Remove highlight from all buttons
      orderTypeButtons.forEach(btn => {
        btn.classList.remove("bg-blue-700", "text-white");
        btn.classList.add("bg-sigma");  // reset to default bg-sigma if needed
      });

      // Add highlight to clicked button
      button.classList.add("bg-blue-700", "text-white");
      button.classList.remove("bg-sigma");

      // Update selected order type value
      selectedOrderType = button.getAttribute("data-type");
      if (orderTypeInput) {
        orderTypeInput.value = selectedOrderType;
      }

      // Show/hide replacement crate section based on order type
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

    const token = localStorage.getItem("authToken");

    // Build orderData conditionally
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



// Setup event listeners once after DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('order-tab').addEventListener('click', () => showTab('order'));
    document.getElementById('pending-tab').addEventListener('click', () => showTab('pending'));
    document.getElementById('in-progress-tab').addEventListener('click', () => showTab('in-progress'));
    document.getElementById('history-tab').addEventListener('click', () => showTab('history'));

    showTab('order');
});
