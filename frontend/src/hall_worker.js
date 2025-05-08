// Get the auth token
const token = localStorage.getItem('authToken');

if (!token) {
    window.location.href = "login.html";
}

// FETC ORDERS
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
            displayOrders(data.orders);
        } else {
            showError("Tellimuste laadimine ebaõnnestus.");
        }
    } catch (error) {
        console.error("Viga tellimuste laadimisel:", error);
        showError("Tellimuste laadimisel tekkis viga.");
    }
}

// DISPALY ORDERS
function displayOrders(orders) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = "";

    if (orders.length === 0) {
        ordersContainer.innerHTML = `
      <p class="text-gray-500 dark:text-gray-400 text-center">
        Ühtegi ootel tellimust ei leitud.
      </p>
    `;
        return;
    }

    orders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
}

function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md transition";

    let orderType = order.order_type === "material_order" ? "Materjalitellimus" :
        order.order_type === "crate_removal" ? "Kastide eemaldus" :
            order.order_type;

    card.innerHTML = `
    <p><strong>Operaator:</strong> ${order.machine_operator}</p>
    <p><strong>Tellimuse tüüp:</strong> ${orderType}</p>
    ${order.order_type === "crate_removal" ? `
      <p><strong>Asenduskast:</strong> ${order.replacement_crate || "Puudub"}</p>` : ""
        }
    ${order.additional_notes ? `
      <p><strong>Märkused:</strong> ${order.additional_notes}</p>` : ""
        }
    <button 
      class="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      onclick="markOrderReceived(${order.id})">
      Märgi vastu võetuks
    </button>
  `;

    return card;
}

// MARK ORDER RECEIVED
async function markOrderReceived(orderId) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            alert("Tellimus märgiti vastu võetuks!");
            //MOVE ORDER TO IN PROGRESS
            fetchOrders();
        } else {
            showError("Tellimuse märkimine ebaõnnestus.");
        }
    } catch (error) {
        console.error("Viga tellimuse uuendamisel:", error);
        showError("Tellimuse uuendamisel tekkis viga.");
    }
}


function showError(message) {
    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = `
    <p class="text-red-500 text-center font-semibold">${message}</p>
  `;
}

document.addEventListener("DOMContentLoaded", fetchOrders);
