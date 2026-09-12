let currentUser = null;
let destinations = [];

const destinationList =
  document.getElementById("destinationList");

const bookingList =
  document.getElementById("bookingList");

const userArea =
  document.getElementById("userArea");

const authModal =
  document.getElementById("authModal");

const bookingModal =
  document.getElementById("bookingModal");


// ---------------- API FUNCTION ----------------

async function api(url, options = {}) {

  const response = await fetch(`http://localhost:3000${url}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong."
    );
  }

  return data;
}


// ---------------- MESSAGE ----------------

function showToast(message) {

  const toast =
    document.getElementById("toast");

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


// ---------------- USER AREA ----------------

function updateUserArea() {

  if (currentUser) {

    userArea.innerHTML = `

      <span>
        Hi, ${currentUser.name}
      </span>

      <button
        class="nav-btn"
        onclick="logout()"
      >
        Logout
      </button>

    `;

  } else {

    userArea.innerHTML = `

      <button
        class="nav-btn"
        onclick="openLogin()"
      >
        Login
      </button>

    `;

  }
}


// ---------------- LOAD DESTINATIONS ----------------

async function loadDestinations(search = "") {

  try {

    destinations =
      await api(
        `/api/destinations?search=${encodeURIComponent(search)}`
      );

    displayDestinations();

  } catch (error) {

    destinationList.innerHTML =
      `<p class="empty">
        ${error.message}
      </p>`;

  }
}


// ---------------- DISPLAY DESTINATIONS ----------------

function displayDestinations() {

  if (destinations.length === 0) {

    destinationList.innerHTML =
      `<p class="empty">
        No destinations found.
      </p>`;

    return;
  }

  destinationList.innerHTML =
    destinations.map(destination => {

      return `

        <article class="card">

          <img
            src="${destination.image}"
            alt="${destination.city}"
          >

          <div class="card-body">

            <p class="section-label">
              ${destination.country}
            </p>

            <h3>
              ${destination.city}
            </h3>

            <p>
              ${destination.description}
            </p>

            <div class="price">

              ₹${Number(destination.price)
                .toLocaleString("en-IN")}

              / person

            </div>

            <div class="card-actions">

              <button
                class="btn btn-light"
                onclick="openBooking(${destination.id})"
              >
                Book Now
              </button>

            </div>

          </div>

        </article>

      `;

    }).join("");
}


// ---------------- LOGIN ----------------

function openLogin() {

  authModal.classList.remove("hidden");

  showLoginForm();
}


// ---------------- REGISTER ----------------

function openRegister() {

  authModal.classList.remove("hidden");

  showRegisterForm();
}


// ---------------- CLOSE AUTH MODAL ----------------

function closeModal() {

  authModal.classList.add("hidden");
}


// ---------------- LOGIN FORM ----------------

function showLoginForm() {

  document.getElementById(
    "authContent"
  ).innerHTML = `

    <p class="section-label">
      ACCOUNT
    </p>

    <h2>
      Welcome Back
    </h2>

    <form id="loginForm">

      <label>
        Email
      </label>

      <input
        type="email"
        id="loginEmail"
        required
      >

      <label>
        Password
      </label>

      <input
        type="password"
        id="loginPassword"
        required
      >

      <button
        type="submit"
        class="btn full"
      >
        Login
      </button>

    </form>

    <p class="auth-switch">
      Don't have an account?

      <button onclick="openRegister()">
        Register
      </button>
    </p>

  `;


  document
    .getElementById("loginForm")
    .addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();

        try {

          const result =
            await api(
              "/api/login",
              {
                method: "POST",

                body: JSON.stringify({
                  email:
                    document.getElementById(
                      "loginEmail"
                    ).value,

                  password:
                    document.getElementById(
                      "loginPassword"
                    ).value
                })
              }
            );

          currentUser = result.user;

          updateUserArea();

          closeModal();

          await loadBookings();

          showToast(result.message);

        } catch (error) {

          showToast(error.message);

        }

      }
    );
}


// ---------------- REGISTER FORM ----------------

function showRegisterForm() {

  document.getElementById(
    "authContent"
  ).innerHTML = `

    <p class="section-label">
      ACCOUNT
    </p>

    <h2>
      Create Account
    </h2>

    <form id="registerForm">

      <label>
        Name
      </label>

      <input
        type="text"
        id="registerName"
        required
      >

      <label>
        Email
      </label>

      <input
        type="email"
        id="registerEmail"
        required
      >

      <label>
        Password
      </label>

      <input
        type="password"
        id="registerPassword"
        minlength="6"
        required
      >

      <button
        type="submit"
        class="btn full"
      >
        Register
      </button>

    </form>

    <p class="auth-switch">
      Already have an account?

      <button onclick="openLogin()">
        Login
      </button>
    </p>

  `;


  document
    .getElementById("registerForm")
    .addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();

        try {

          const result =
            await api(
              "/api/register",
              {
                method: "POST",

                body: JSON.stringify({

                  name:
                    document.getElementById(
                      "registerName"
                    ).value,

                  email:
                    document.getElementById(
                      "registerEmail"
                    ).value,

                  password:
                    document.getElementById(
                      "registerPassword"
                    ).value

                })
              }
            );

          currentUser = result.user;

          updateUserArea();

          closeModal();

          await loadBookings();

          showToast(result.message);

        } catch (error) {

          showToast(error.message);

        }

      }
    );
}


// ---------------- LOGOUT ----------------

async function logout() {

  try {

    await api(
      "/api/logout",
      {
        method: "POST"
      }
    );

    currentUser = null;

    updateUserArea();

    bookingList.innerHTML =
      `<p class="empty">
        Login to see your bookings.
      </p>`;

    showToast(
      "Logout successful."
    );

  } catch (error) {

    showToast(error.message);

  }
}


// ---------------- OPEN BOOKING ----------------

function openBooking(destinationId) {

  if (!currentUser) {

    openLogin();

    showToast(
      "Please login before booking."
    );

    return;
  }

  const destination =
    destinations.find(
      item => item.id === destinationId
    );

  if (!destination) {
    return;
  }

  document.getElementById(
    "destinationId"
  ).value = destinationId;

  document.getElementById(
    "bookingDestination"
  ).textContent =
    `${destination.city}, ${destination.country} - ₹${Number(destination.price).toLocaleString("en-IN")} per person`;

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  document.getElementById(
    "travelDate"
  ).min = today;

  document.getElementById(
    "travelDate"
  ).value = today;

  bookingModal.classList.remove(
    "hidden"
  );
}


// ---------------- CLOSE BOOKING ----------------

function closeBookingModal() {

  bookingModal.classList.add(
    "hidden"
  );
}


// ---------------- BOOKING FORM ----------------

document
  .getElementById("bookingForm")
  .addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();

      try {

        const result =
          await api(
            "/api/bookings",
            {
              method: "POST",

              body: JSON.stringify({

                destinationId:
                  document.getElementById(
                    "destinationId"
                  ).value,

                travelDate:
                  document.getElementById(
                    "travelDate"
                  ).value,

                travelers:
                  document.getElementById(
                    "travelers"
                  ).value

              })
            }
          );

        closeBookingModal();

        await loadBookings();

        showToast(
          `Booking #${result.bookingId} successful! Total: ₹${Number(result.totalPrice).toLocaleString("en-IN")}`
        );

        document
          .getElementById("bookings")
          .scrollIntoView();

      } catch (error) {

        showToast(error.message);

      }

    }
  );


// ---------------- LOAD BOOKINGS ----------------

async function loadBookings() {

  if (!currentUser) {
    return;
  }

  try {

    const bookings =
      await api("/api/bookings");


    if (bookings.length === 0) {

      bookingList.innerHTML =
        `<p class="empty">
          You have no bookings yet.
        </p>`;

      return;
    }


    bookingList.innerHTML =
      bookings.map(booking => {

        return `

          <article class="booking">

            <div class="booking-row">

              <div>

                <p class="section-label">
                  BOOKING #${booking.id}
                </p>

                <h3>
                  ${booking.city},
                  ${booking.country}
                </h3>

                <p class="muted">
                  Travel Date:
                  ${booking.travel_date}
                </p>

                <p class="muted">
                  Travelers:
                  ${booking.travelers}
                </p>

                <br>

                <strong>
                  ₹${Number(booking.total_price)
                    .toLocaleString("en-IN")}
                </strong>

              </div>

              <div>

                <span
                  class="status ${
                    booking.payment_status === "Paid"
                      ? "paid"
                      : ""
                  }"
                >
                  ${booking.payment_status}
                </span>

                ${
                  booking.payment_status !== "Paid"
                    ? `
                      <br>

                      <button
                        class="btn"
                        style="margin-top:10px"
                        onclick="payBooking(${booking.id})"
                      >
                        Demo Pay
                      </button>
                    `
                    : ""
                }

              </div>

            </div>

          </article>

        `;

      }).join("");

  } catch (error) {

    bookingList.innerHTML =
      `<p class="empty">
        ${error.message}
      </p>`;

  }
}


// ---------------- DEMO PAYMENT ----------------

async function payBooking(id) {

  try {

    const result =
      await api(
        `/api/bookings/${id}/pay`,
        {
          method: "POST"
        }
      );

    await loadBookings();

    showToast(result.message);

  } catch (error) {

    showToast(error.message);

  }
}


// ---------------- SEARCH ----------------

document
  .getElementById("searchForm")
  .addEventListener(
    "submit",
    function(event) {

      event.preventDefault();

      const search =
        document.getElementById(
          "searchInput"
        ).value;

      loadDestinations(search);

      document
        .getElementById("destinations")
        .scrollIntoView();

    }
  );


// ---------------- SHOW ALL ----------------

document
  .getElementById("showAllBtn")
  .addEventListener(
    "click",
    function() {

      document.getElementById(
        "searchInput"
      ).value = "";

      loadDestinations();

    }
  );


// ---------------- START APPLICATION ----------------

async function startApp() {

  try {

    const result =
      await api("/api/me");

    currentUser =
      result.user;

  } catch (error) {

    currentUser = null;

  }

  updateUserArea();

  await loadDestinations();

  if (currentUser) {
    await loadBookings();
  }
}

startApp();