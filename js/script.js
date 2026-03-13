// API Base URL
const API_BASE = "https://api.everrest.educata.dev";

// გლობალური ცვლადები
let currentPage = 1;
const pageSize = 12;
let totalProducts = 0;
let filters = {
  keywords: "",
  category_id: "",
  brand: "",
  rating: "",
  price_min: "",
  price_max: "",
};

let categories = [];
let brands = [];

// ==================== ინიციალიზაცია ====================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 DOM loaded, starting initialization...");

  loadCategories();
  loadBrands();
  loadProducts();

  // updateCartCount - უნდა იყოს უსაფრთხო, თუ 409 მოვა
  updateCartCount().catch((err) =>
    console.error("ℹ️ Cart count update error (normal if empty):", err)
  );

  // ლამპის სტეიტის დაყენება
  const token = localStorage.getItem("access_token");
  if (token) {
    setLampState(true);
  }

  document.getElementById("searchBtn")?.addEventListener("click", handleSearch);
  document.getElementById("searchInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  document
    .getElementById("applyFilters")
    ?.addEventListener("click", applyFilters);
  document
    .getElementById("clearFilters")
    ?.addEventListener("click", clearFilters);

  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadProducts();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < Math.ceil(totalProducts / pageSize)) {
      currentPage++;
      loadProducts();
    }
  });

  setupAuthForms();

  const productId = getProductIdFromUrl();
  if (productId) {
    loadProductDetails(productId);
    setupReviewModal();
  }

  if (window.location.pathname.includes("cart.html")) {
    loadCart();

    setTimeout(() => {
      setupCartButtons();
    }, 500);
  }
});

// ==================== LAMP STATE TOGGLE ====================
function setLampState(isOn) {
  if (isOn) {
    document.body.setAttribute("data-lamp", "on");
    document.documentElement.style.setProperty("--on", "1");
  } else {
    document.body.removeAttribute("data-lamp");
    document.documentElement.style.setProperty("--on", "0");
  }
}

// ==================== სურათის შეცდომის დამმუშავებელი ====================

window.handleImageError = function (img) {
  img.onerror = null;
  img.src = "https://placehold.co/200x200/0066cc/white?text=No+Image";
  return true;
};

// ==================== ტოკენის ვალიდაციის ფუნქცია ====================

function validateToken(responseData) {
  if (responseData && responseData.errorKeys) {
    if (responseData.errorKeys.includes("errors.token_expired")) {
      console.log("❌ Token expired, clearing...");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      updateAuthUI();
      updateCartCount();
      setLampState(false);

      if (window.location.pathname.includes("cart.html")) {
        window.location.href = "auth.html";
      }
      return true;
    }
    if (responseData.errorKeys.includes("errors.token_not_found")) {
      console.log("❌ Token not found, clearing...");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      updateAuthUI();
      updateCartCount();
      setLampState(false);

      if (window.location.pathname.includes("cart.html")) {
        window.location.href = "auth.html";
      }
      return true;
    }
  }
  return false;
}

// ==================== კალათის ღილაკების დაყენება ====================

function setupCartButtons() {
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.removeEventListener("click", handleCheckout);
    checkoutBtn.addEventListener("click", handleCheckout);
  }

  const clearCartBtn = document.getElementById("clearCartBtn");
  if (clearCartBtn) {
    clearCartBtn.removeEventListener("click", handleClearCart);
    clearCartBtn.addEventListener("click", handleClearCart);
  }
}

// ⭐⭐⭐ გადახდის ფუნქცია ⭐⭐⭐
async function handleCheckout() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.warning("გადახდისთვის გთხოვთ გაიაროთ ავტორიზაცია");
    } else {
      alert("გადახდისთვის გთხოვთ გაიაროთ ავტორიზაცია");
    }
    window.location.href = "auth.html";
    return;
  }

  try {
    const response = await fetch(API_BASE + "/shop/cart/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(
        "lastPayment",
        JSON.stringify({
          date: new Date().toISOString(),
          status: "success",
        })
      );

      if (typeof cuteAlert !== "undefined") {
        cuteAlert.success("✅ გადახდა წარმატებით დასრულდა!");
      } else {
        alert("✅ გადახდა წარმატებით დასრულდა!");
      }

      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } else {
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.error("❌ გადახდა ვერ მოხერხდა");
      } else {
        alert("❌ გადახდა ვერ მოხერხდა");
      }
    }
  } catch (error) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.error("❌ ქსელის შეცდომა");
    } else {
      alert("❌ ქსელის შეცდომა");
    }
  }
}

// ⭐⭐⭐ კალათის დაცლის ფუნქცია ⭐⭐⭐
async function handleClearCart() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.warning("კალათის დაცლისთვის გთხოვთ გაიაროთ ავტორიზაცია");
    } else {
      alert("კალათის დაცლისთვის გთხოვთ გაიაროთ ავტორიზაცია");
    }
    window.location.href = "auth.html";
    return;
  }

  // confirm-ის ჩანაცვლება cuteAlert-ით
  let confirmed = false;

  if (typeof cuteAlert !== "undefined") {
    confirmed = await new Promise((resolve) => {
      const alertDiv = document.createElement("div");
      alertDiv.className = "cute-alert-overlay show";
      alertDiv.innerHTML = `
        <div class="cute-alert warning">
          <button class="cute-alert-close"><i class="fas fa-times"></i></button>
          <div class="cute-alert-icon"><i class="fas fa-question-circle"></i></div>
          <div class="cute-alert-title">დადასტურება</div>
          <div class="cute-alert-message">დარწმუნებული ხართ, რომ გსურთ მთელი კალათის დაცლა?</div>
          <div style="display: flex; gap: 10px;">
            <button class="cute-alert-button" style="flex: 1;" id="confirmYes">კი</button>
            <button class="cute-alert-button" style="flex: 1; background: linear-gradient(135deg, #6b7280, #4b5563);" id="confirmNo">არა</button>
          </div>
        </div>
      `;
      document.body.appendChild(alertDiv);

      document.getElementById("confirmYes")?.addEventListener("click", () => {
        alertDiv.remove();
        resolve(true);
      });

      document.getElementById("confirmNo")?.addEventListener("click", () => {
        alertDiv.remove();
        resolve(false);
      });

      document
        .querySelector(".cute-alert-close")
        ?.addEventListener("click", () => {
          alertDiv.remove();
          resolve(false);
        });
    });
  } else {
    confirmed = confirm("დარწმუნებული ხართ, რომ გსურთ მთელი კალათის დაცლა?");
  }

  if (!confirmed) return;

  try {
    const response = await fetch(API_BASE + "/shop/cart", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(
        "cartCleared",
        JSON.stringify({
          date: new Date().toISOString(),
          status: "success",
        })
      );

      if (typeof cuteAlert !== "undefined") {
        cuteAlert.success("✅ კალათა დაცლილია");
      } else {
        alert("✅ კალათა დაცლილია");
      }

      await loadCart();
      await updateCartCount();
    } else {
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.error("❌ კალათის დაცლა ვერ მოხერხდა");
      } else {
        alert("❌ კალათის დაცლა ვერ მოხერხდა");
      }
    }
  } catch (error) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.error("❌ ქსელის შეცდომა");
    } else {
      alert("❌ ქსელის შეცდომა");
    }
  }
}

// ==================== პროდუქტების ფუნქციები ====================

async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = '<div class="loading">იტვირთება...</div>';

  const params = new URLSearchParams();
  params.append("page_index", currentPage);
  params.append("page_size", pageSize);

  if (filters.keywords && filters.keywords.trim() !== "")
    params.append("keywords", filters.keywords.trim());
  if (filters.category_id && filters.category_id !== "")
    params.append("category_id", filters.category_id);
  if (filters.brand && filters.brand !== "")
    params.append("brand", filters.brand);
  if (filters.rating && filters.rating !== "0" && filters.rating !== "")
    params.append("rating", filters.rating);
  if (filters.price_min && filters.price_min !== "")
    params.append("price_min", filters.price_min);
  if (filters.price_max && filters.price_max !== "")
    params.append("price_max", filters.price_max);

  try {
    const response = await fetch(
      API_BASE + "/shop/products/search?" + params.toString(),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    totalProducts = data.total || 0;

    displayProducts(data.products || []);
    updatePagination();
  } catch (error) {
    grid.innerHTML =
      '<div class="error">შეცდომა ჩატვირთვისას. გთხოვთ სცადოთ თავიდან.</div>';
  }
}

function displayProducts(products) {
  const grid = document.getElementById("productsGrid");

  if (!products || products.length === 0) {
    grid.innerHTML = '<div class="loading">პროდუქტები არ მოიძებნა</div>';
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const price = product.price?.current || 0;
      const currency = product.price?.currency === "GEL" ? "₾" : "$";
      const oldPrice =
        product.price?.beforeDiscount > price
          ? `<span class="old-price">${product.price.beforeDiscount} ${currency}</span>`
          : "";

      const rating = product.rating || 0;
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      const stars = [];

      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          stars.push('<i class="fas fa-star"></i>');
        } else if (i === fullStars && hasHalfStar) {
          stars.push('<i class="fas fa-star-half-alt"></i>');
        } else {
          stars.push('<i class="far fa-star"></i>');
        }
      }

      // სურათის არჩევა
      let thumbnail = product.thumbnail || "";
      if (!thumbnail && product.images && product.images.length > 0) {
        thumbnail = product.images[0];
      }
      if (!thumbnail) {
        thumbnail = "https://placehold.co/200x200/0066cc/white?text=No+Image";
      }

      return `
            <div class="product-card">
                ${
                  product.stock <= 0
                    ? '<span class="stock-badge">ამოწურულია</span>'
                    : ""
                }
                <img src="${thumbnail}" 
                     alt="${product.title || ""}" 
                     class="product-image" 
                     referrerpolicy="no-referrer"
                     crossorigin="anonymous"
                     onerror="handleImageError(this)">
                <div class="product-info">
                    <a href="product.html?id=${
                      product._id || ""
                    }" class="product-title">${product.title || "უცნობი"}</a>
                    <div class="product-price">
                        ${price} ${currency}
                        ${oldPrice}
                    </div>
                    <div class="rating">
                        <div class="stars">${stars.join("")}</div>
                        <span class="rating-value">(${rating.toFixed(1)})</span>
                    </div>
                    <button class="add-to-cart" 
                        onclick="addToCart('${product._id || ""}')"
                        ${product.stock <= 0 ? "disabled" : ""}>
                        ${product.stock <= 0 ? "ამოწურულია" : "კალათაში"}
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
}

// ==================== ფილტრაციის ფუნქციები ====================

async function loadCategories() {
  try {
    const response = await fetch(API_BASE + "/shop/products/categories", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) return;

    const data = await response.json();
    categories = data;

    const select = document.getElementById("category");
    if (!select) return;

    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name === "laptops" ? "ლეპტოპები" : "ტელეფონები";
      select.appendChild(option);
    });
  } catch (error) {}
}

async function loadBrands() {
  try {
    const response = await fetch(API_BASE + "/shop/products/brands", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) return;

    const data = await response.json();
    brands = data;

    const select = document.getElementById("brand");
    if (!select) return;

    brands.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
      select.appendChild(option);
    });
  } catch (error) {}
}

function applyFilters() {
  filters = {
    keywords: document.getElementById("searchInput")?.value || "",
    category_id: document.getElementById("category")?.value || "",
    brand: document.getElementById("brand")?.value || "",
    rating: document.getElementById("rating")?.value || "",
    price_min: document.getElementById("minPrice")?.value || "",
    price_max: document.getElementById("maxPrice")?.value || "",
  };

  currentPage = 1;
  loadProducts();
}

function clearFilters() {
  const searchInput = document.getElementById("searchInput");
  const category = document.getElementById("category");
  const brand = document.getElementById("brand");
  const rating = document.getElementById("rating");
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");

  if (searchInput) searchInput.value = "";
  if (category) category.value = "";
  if (brand) brand.value = "";
  if (rating) rating.value = "0";
  if (minPrice) minPrice.value = "";
  if (maxPrice) maxPrice.value = "";

  filters = {
    keywords: "",
    category_id: "",
    brand: "",
    rating: "",
    price_min: "",
    price_max: "",
  };

  currentPage = 1;
  loadProducts();
}

function handleSearch() {
  filters.keywords = document.getElementById("searchInput").value;
  currentPage = 1;
  loadProducts();
}

function updatePagination() {
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  if (!prevBtn || !nextBtn || !pageInfo) return;

  const totalPages = Math.ceil(totalProducts / pageSize) || 1;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;

  pageInfo.textContent = `გვერდი ${currentPage} / ${totalPages}`;
}

// ==================== პროდუქტის დეტალები ====================

function getProductIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

async function loadProductDetails(id) {
  const container = document.getElementById("productDetail");
  if (!container) return;

  try {
    const response = await fetch(API_BASE + "/shop/products/id/" + id, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Product not found");
    }

    const data = await response.json();
    displayProductDetails(data);
    generateQRCode(data);
  } catch (error) {
    container.innerHTML =
      '<div class="error">შეცდომა პროდუქტის ჩატვირთვისას</div>';
  }
}

function displayProductDetails(product) {
  const container = document.getElementById("productDetail");

  const price = product.price?.current || 0;
  const currency = product.price?.currency === "GEL" ? "₾" : "$";
  const oldPrice =
    product.price?.beforeDiscount > price
      ? `<span class="old-price">${product.price.beforeDiscount} ${currency}</span>`
      : "";

  const rating = product.rating || 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const stars = [];

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push('<i class="fas fa-star"></i>');
    } else if (i === fullStars && hasHalfStar) {
      stars.push('<i class="fas fa-star-half-alt"></i>');
    } else {
      stars.push('<i class="far fa-star"></i>');
    }
  }

  const issueDate = product.issueDate
    ? new Date(product.issueDate).toLocaleDateString("ka-GE")
    : "უცნობია";
  const stockStatus =
    product.stock > 0 ? `მარაგშია (${product.stock})` : "ამოწურულია";

  // სურათის არჩევა
  let mainImage = product.thumbnail || "";
  if (!mainImage && product.images && product.images.length > 0) {
    mainImage = product.images[0];
  }
  if (!mainImage) {
    mainImage = "https://placehold.co/400x400/0066cc/white?text=No+Image";
  }

  const galleryImages = product.images || [];

  container.innerHTML = `
        <div class="product-detail">
            <div>
                <img src="${mainImage}" 
                     alt="${product.title || ""}" 
                     class="detail-image" 
                     id="mainImage" 
                     referrerpolicy="no-referrer"
                     crossorigin="anonymous"
                     onerror="handleImageError(this)">
                ${
                  galleryImages.length > 1
                    ? `
                    <div class="image-gallery">
                        ${galleryImages
                          .slice(0, 5)
                          .map(
                            (img) => `
                            <img src="${img}" 
                                 alt="" 
                                 referrerpolicy="no-referrer"
                                 crossorigin="anonymous"
                                 onclick="document.getElementById('mainImage').src='${img}'" 
                                 style="width: 60px; height: 60px; object-fit: cover; cursor: pointer; margin: 5px; border: 1px solid #ddd;" 
                                 onerror="this.style.display='none'">
                        `
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
            </div>
            
            <div class="detail-info">
                <h2>${product.title || "უცნობი პროდუქტი"}</h2>
                <p>${product.description || "აღწერა არ არის"}</p>
                
                <div class="detail-price">
                    ${price} ${currency}
                    ${oldPrice}
                </div>
                
                <div class="rating">
                    <div class="stars">${stars.join("")}</div>
                    <span class="rating-value">${rating.toFixed(1)} (${
    product.ratings?.length || 0
  } შეფასება)</span>
                </div>
                
                <div class="detail-meta">
                    <p><strong>ბრენდი:</strong> ${
                      product.brand || "უცნობია"
                    }</p>
                    <p><strong>კატეგორია:</strong> ${
                      product.category?.name === "laptops"
                        ? "ლეპტოპი"
                        : product.category?.name || "უცნობია"
                    }</p>
                    <p><strong>გამოშვების თარიღი:</strong> ${issueDate}</p>
                    <p><strong>საწყობში:</strong> ${stockStatus}</p>
                    <p><strong>გარანტია:</strong> ${
                      product.warranty
                        ? product.warranty +
                          (product.warranty > 12 ? " თვე" : " წელი")
                        : "უცნობია"
                    }</p>
                </div>
                
                <div class="tabs">
                    <button class="tab-btn active" onclick="switchTab('details')">დეტალები</button>
                    <button class="tab-btn" onclick="switchTab('reviews')">შეფასებები</button>
                </div>
                
                <div id="detailsTab" class="tab-content active">
                    <p>${product.description || "აღწერა არ არის"}</p>
                </div>
                
                <div id="reviewsTab" class="tab-content">
                    ${
                      product.ratings && product.ratings.length > 0
                        ? product.ratings
                            .slice(0, 10)
                            .map(
                              (r) => `
                            <div class="review-item">
                                <div class="stars">${"★".repeat(
                                  Math.floor(r.value)
                                )}${"☆".repeat(5 - Math.floor(r.value))}</div>
                                <p>${r.value} - ${new Date(
                                r.createdAt
                              ).toLocaleDateString("ka-GE")}</p>
                            </div>
                        `
                            )
                            .join("")
                        : "<p>ჯერ არ არის შეფასებები</p>"
                    }
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn" onclick="addToCart('${
                      product._id || ""
                    }')" ${product.stock <= 0 ? "disabled" : ""}>
                        ${
                          product.stock <= 0
                            ? "ამოწურულია"
                            : "კალათაში დამატება"
                        }
                    </button>
                    <button class="btn btn-secondary" onclick="openReviewModal('${
                      product._id || ""
                    }')">
                        შეფასება
                    </button>
                </div>
                
                <div id="qrCodeContainer" class="qr-code"></div>
            </div>
        </div>
    `;
}

window.switchTab = function (tab) {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((t) => t.classList.remove("active"));
  contents.forEach((c) => c.classList.remove("active"));

  if (tab === "details") {
    tabs[0]?.classList.add("active");
    document.getElementById("detailsTab")?.classList.add("active");
  } else {
    tabs[1]?.classList.add("active");
    document.getElementById("reviewsTab")?.classList.add("active");
  }
};

// ==================== QR კოდის ფუნქციები ====================

async function generateQRCode(product) {
  const qrContainer = document.getElementById("qrCodeContainer");
  if (!qrContainer) return;

  const qrText = `${product.title || "პროდუქტი"} - ${
    product.price?.current || 0
  } ${product.price?.currency || "USD"}`;

  try {
    const response = await fetch(API_BASE + "/qrcode/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: qrText }),
    });

    if (!response.ok) return;

    const data = await response.json();

    if (data.result) {
      qrContainer.innerHTML = `
                <img src="${data.result}" alt="QR Code" class="qr-code" referrerpolicy="no-referrer" crossorigin="anonymous">
                <p style="text-align: center; font-size: 12px;">გადაიღეთ QR კოდი</p>
            `;
    }
  } catch (error) {}
}

// ==================== კალათის ფუნქციები ====================

window.addToCart = async function (productId) {
  console.log("🔵 addToCart called with ID:", productId);

  if (
    !productId ||
    productId === "" ||
    productId === "undefined" ||
    productId === "null"
  ) {
    console.error("❌ Invalid product ID");
    return;
  }

  const token = localStorage.getItem("access_token");

  if (!token) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.warning("კალათაში დასამატებლად გთხოვთ გაიაროთ ავტორიზაცია");
    } else {
      alert("კალათაში დასამატებლად გთხოვთ გაიაროთ ავტორიზაცია");
    }
    window.location.href = "auth.html";
    return;
  }

  try {
    // প্রথমে POST ব্যবহার করে নতুন পণ্য যোগ করার চেষ্টা করুন
    const postResponse = await fetch(API_BASE + "/shop/cart/product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: productId, quantity: 1 }),
    });

    console.log("📥 POST response status:", postResponse.status);
    const postData = await postResponse.json().catch(() => ({}));
    console.log("📋 POST response:", postData);

    if (postResponse.ok) {
      await updateCartCount();
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.success("პროდუქტი დაემატა კალათაში");
      } else {
        alert("პროდუქტი დაემატა კალათაში");
      }
      return;
    }

    // თუ POST ვერავე მოვიდა, პატალ გამოთquerეთ მძებელი რაოდენობა PATCH-ის მাშინ
    // პირველი კალაتის მიღება, რაოდენობის დადგენა
    const cartResponse = await fetch(API_BASE + "/shop/cart", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!cartResponse.ok && cartResponse.status !== 409) {
      console.error(`❌ Failed to fetch cart: ${cartResponse.status}`);
      throw new Error("Failed to fetch cart");
    }

    let newQuantity = 1;

    if (cartResponse.ok) {
      const cartData = await cartResponse.json();
      console.log("📦 Cart fetched successfully");
      const existingItem = cartData?.products?.find(
        (p) => p.productId === productId
      );
      if (existingItem) {
        newQuantity = (existingItem.quantity || 1) + 1;
        console.log(
          `⬆️ Product exists in cart! New quantity will be: ${newQuantity}`
        );
      }
    } else if (cartResponse.status === 409) {
      console.log(
        "⚠️ 409 Conflict while fetching cart - cart may be empty, using quantity 1"
      );
      newQuantity = 1;
    }

    // PATCH გამოგონისთან რაოდენობის ინკრემენტირებით
    const patchResponse = await fetch(API_BASE + "/shop/cart/product", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: productId, quantity: newQuantity }),
    });

    console.log("📥 PATCH response status:", patchResponse.status);
    const patchData = await patchResponse.json().catch(() => ({}));
    console.log("📋 PATCH response:", patchData);

    if (patchResponse.ok) {
      await updateCartCount();
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.success("პროდუქტი დაემატა კალათაში");
      } else {
        alert("პროდუქტი დაემატა კალათაში");
      }
    } else {
      const errorMsg =
        patchData?.message ||
        patchData?.error ||
        "კალათაში დამატება ვერ მოხერხდა";
      console.error("❌ PATCH failed:", errorMsg);
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.error(`შეცდომა: ${errorMsg}`);
      } else {
        alert(`შეცდომა: ${errorMsg}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in addToCart:", error);
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.error("❌ ქსელის შეცდომა: " + error.message);
    } else {
      alert("❌ ქსელის შეცდომა: " + error.message);
    }
  }
};

async function updateCartCount() {
  const token = localStorage.getItem("access_token");
  const cartCount = document.getElementById("cartCount");

  if (!cartCount) return;

  if (!token) {
    console.log("⏭️ No token found, skipping cart fetch");
    cartCount.textContent = "0";
    return;
  }

  try {
    console.log("🛒 Fetching cart count...");
    const response = await fetch(API_BASE + "/shop/cart", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Cart response status: ${response.status}`);

    if (response.status === 409) {
      console.warn("⚠️ 409 Conflict: Cart is empty or invalid state");
      cartCount.textContent = "0";
      return;
    }

    if (!response.ok) {
      console.error(`❌ Cart fetch failed with status ${response.status}`);
      cartCount.textContent = "0";
      return;
    }

    const data = await response.json();
    console.log("📦 Cart data:", data);

    if (validateToken(data)) {
      console.log("🔐 Token validation failed");
      cartCount.textContent = "0";
      return;
    }

    const items = data?.products || [];
    const count = items.reduce((sum, item) => sum + (item?.quantity || 1), 0);
    console.log(`✅ Cart count updated: ${count}`);
    cartCount.textContent = count || "0";
  } catch (error) {
    console.error("❌ Error updating cart count:", error);
    cartCount.textContent = "0";
  }
}

async function loadCart() {
  const container = document.getElementById("cartItems");
  const summary = document.getElementById("cartSummary");
  const emptyMessage = document.getElementById("emptyCartMessage");

  const token = localStorage.getItem("access_token");

  if (!token) {
    console.log("🔓 No token - showing auth message");
    if (container) {
      container.innerHTML = `
                <div class="empty-cart">
                    <p>კალათის სანახავად გთხოვთ გაიაროთ ავტორიზაცია</p>
                    <a href="auth.html" class="btn">ავტორიზაცია</a>
                </div>
            `;
    }
    if (summary) summary.style.display = "none";
    if (emptyMessage) emptyMessage.style.display = "none";
    return;
  }

  try {
    console.log("📦 Loading cart data from API...");
    const response = await fetch(API_BASE + "/shop/cart", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Cart response status: ${response.status}`);

    if (response.status === 409) {
      console.warn("⚠️ 409 Conflict: Cart is empty or invalid state");
      if (container) {
        container.style.display = "none";
        container.innerHTML = "";
      }
      if (summary) summary.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "block";
      return;
    }

    if (!response.ok) {
      console.error(`❌ Cart load failed with status ${response.status}`);
      throw new Error("Cart load failed");
    }

    const data = await response.json();
    console.log("📦 Cart data received:", data);

    if (validateToken(data)) {
      console.log("🔐 Token validation failed");
      return;
    }

    console.log("✅ Displaying cart...");
    await displayCart(data);
    setupCartButtons();
  } catch (error) {
    console.error("❌ Error loading cart:", error);
    if (container)
      container.innerHTML =
        '<div class="error">კალათის ჩატვირთვა ვერ მოხერხდა. გთხოვთ, ხელახლა სცადოთ.</div>';
    if (summary) summary.style.display = "none";
    if (emptyMessage) emptyMessage.style.display = "none";
  }
}

async function displayCart(cart) {
  const container = document.getElementById("cartItems");
  const summary = document.getElementById("cartSummary");
  const emptyMessage = document.getElementById("emptyCartMessage");

  const products = cart?.products || [];

  if (!products || products.length === 0) {
    if (container) container.style.display = "none";
    if (summary) summary.style.display = "none";
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (container) container.style.display = "grid";
  if (summary) summary.style.display = "block";
  if (emptyMessage) emptyMessage.style.display = "none";

  let total = 0;

  const cartItemsHTML = await Promise.all(
    products.map(async (item) => {
      const finalId = item.productId;
      const quantity = item.quantity || 1;
      const price = item.pricePerQuantity || 0;
      const currency = "₾";

      if (!finalId) {
        console.error("❌ No productId found for item:", item);
        return "";
      }

      const itemTotal = price * quantity;
      total += itemTotal;

      let productTitle = `პროდუქტი #${finalId.slice(-6)}`;
      let productImage =
        "https://placehold.co/200x200/0066cc/white?text=No+Image";

      try {
        const response = await fetch(
          API_BASE + "/shop/products/id/" + finalId,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.ok) {
          const productData = await response.json();

          if (productData.thumbnail) {
            productImage = productData.thumbnail;
          } else if (productData.images && productData.images.length > 0) {
            productImage = productData.images[0];
          }

          productTitle = productData.title || productTitle;
        }
      } catch (error) {
        console.error("Error fetching product details for cart item:", error);
      }

      return `
            <div class="cart-item">
                <img src="${productImage}" 
                     alt="${productTitle}" 
                     class="cart-item-image" 
                     referrerpolicy="no-referrer"
                     onerror="this.src='https://placehold.co/200x200/0066cc/white?text=No+Image'"
                     style="background-color: #f0f0f0;">
                <div class="cart-item-info">
                    <h3>${productTitle}</h3>
                    <p class="product-id">ID: ${finalId}</p>
                    <p><i class="fas fa-info-circle"></i> დეტალები <a href="product.html?id=${finalId}" style="color: #d4a373;">აქ</a></p>
                </div>
                <div class="cart-item-price">${price} ${currency}</div>
                <div class="quantity-control">
                    <button onclick="updateCartQuantity('${finalId}', ${
        quantity - 1
      })">−</button>
                    <span>${quantity}</span>
                    <button onclick="updateCartQuantity('${finalId}', ${
        quantity + 1
      })">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${finalId}')">
                    <i class="fas fa-trash"></i> წაშლა
                </button>
            </div>
        `;
    })
  );

  container.innerHTML = cartItemsHTML.join("");

  const totalElement = document.getElementById("totalPrice");
  if (totalElement) totalElement.textContent = total.toFixed(2);

  if (summary) {
    summary.innerHTML = `
            <h3>ჯამი: <span id="totalPrice">${total.toFixed(2)}</span> ₾</h3>
            <button id="checkoutBtn" class="btn btn-block">გადახდა</button>
            <button id="clearCartBtn" class="btn btn-secondary btn-block">კალათის დაცლა</button>
        `;
  }
}

window.updateCartQuantity = async function (cartItemId, newQuantity) {
  if (!cartItemId) return;

  if (newQuantity < 1) {
    removeFromCart(cartItemId);
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    console.log(
      "📤 Updating quantity for item ID:",
      cartItemId,
      "to",
      newQuantity
    );

    const response = await fetch(API_BASE + "/shop/cart/product", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: cartItemId, quantity: newQuantity }),
    });

    const data = await response.json();
    console.log("📥 Update response:", response.status, data);

    if (validateToken(data)) return;

    if (response.ok) {
      await loadCart();
      await updateCartCount();
    } else {
      if (response.status === 409) {
        console.log("⚠️ Item not found in cart, reloading cart...");
        await loadCart();
      } else {
        if (typeof cuteAlert !== "undefined") {
          cuteAlert.error("რაოდენობის შეცვლა ვერ მოხერხდა");
        } else {
          alert("რაოდენობის შეცვლა ვერ მოხერხდა");
        }
      }
    }
  } catch (error) {
    console.error("❌ Update error:", error);
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.error("რაოდენობის შეცვლა ვერ მოხერხდა");
    } else {
      alert("რაოდენობის შეცვლა ვერ მოხერხდა");
    }
  }
};

window.removeFromCart = async function (cartItemId) {
  if (!cartItemId) return;

  const token = localStorage.getItem("access_token");
  if (!token) return;

  // confirm-ის ჩანაცვლება cuteAlert-ით
  let confirmed = false;

  if (typeof cuteAlert !== "undefined") {
    confirmed = await new Promise((resolve) => {
      const alertDiv = document.createElement("div");
      alertDiv.className = "cute-alert-overlay show";
      alertDiv.innerHTML = `
        <div class="cute-alert warning">
          <button class="cute-alert-close"><i class="fas fa-times"></i></button>
          <div class="cute-alert-icon"><i class="fas fa-question-circle"></i></div>
          <div class="cute-alert-title">დადასტურება</div>
          <div class="cute-alert-message">დარწმუნებული ხართ, რომ გსურთ პროდუქტის წაშლა?</div>
          <div style="display: flex; gap: 10px;">
            <button class="cute-alert-button" style="flex: 1;" id="confirmYes">კი</button>
            <button class="cute-alert-button" style="flex: 1; background: linear-gradient(135deg, #6b7280, #4b5563);" id="confirmNo">არა</button>
          </div>
        </div>
      `;
      document.body.appendChild(alertDiv);

      document.getElementById("confirmYes")?.addEventListener("click", () => {
        alertDiv.remove();
        resolve(true);
      });

      document.getElementById("confirmNo")?.addEventListener("click", () => {
        alertDiv.remove();
        resolve(false);
      });

      document
        .querySelector(".cute-alert-close")
        ?.addEventListener("click", () => {
          alertDiv.remove();
          resolve(false);
        });
    });
  } else {
    confirmed = confirm("დარწმუნებული ხართ, რომ გსურთ პროდუქტის წაშლა?");
  }

  if (!confirmed) return;

  try {
    console.log("🗑️ Removing item with ID:", cartItemId);

    const response = await fetch(API_BASE + "/shop/cart/product", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: cartItemId }),
    });

    const data = await response.json();
    console.log("📥 Delete response:", response.status, data);

    if (validateToken(data)) return;

    if (response.ok) {
      await loadCart();
      await updateCartCount();
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.success("პროდუქტი წაიშალა კალათიდან");
      } else {
        alert("პროდუქტი წაიშალა კალათიდან");
      }
    } else {
      if (response.status === 409) {
        console.log("⚠️ Item not found, reloading cart...");
        await loadCart();
        if (typeof cuteAlert !== "undefined") {
          cuteAlert.info("პროდუქტი უკვე წაშლილია");
        } else {
          alert("პროდუქტი უკვე წაშლილია");
        }
      } else {
        if (typeof cuteAlert !== "undefined") {
          cuteAlert.error("წაშლა ვერ მოხერხდა");
        } else {
          alert("წაშლა ვერ მოხერხდა");
        }
      }
    }
  } catch (error) {
    console.error("❌ Delete error:", error);
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.error("წაშლა ვერ მოხერხდა");
    } else {
      alert("წაშლა ვერ მოხერხდა");
    }
  }
};

// ==================== ავტორიზაციის ფუნქციები ====================

function setupAuthForms() {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (loginTab) {
    loginTab.addEventListener("click", () => {
      loginTab.classList.add("active");
      signupTab.classList.remove("active");
      loginForm.classList.add("active");
      signupForm.classList.remove("active");
    });

    signupTab.addEventListener("click", () => {
      signupTab.classList.add("active");
      loginTab.classList.remove("active");
      signupForm.classList.add("active");
      loginForm.classList.remove("active");
    });

    loginForm.addEventListener("submit", handleLogin);
    signupForm.addEventListener("submit", handleSignup);
  }

  updateAuthUI();
}

// ⭐⭐⭐ გასწორებული handleLogin - იმეილის შენახვით ⭐⭐⭐
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");

  if (errorEl) errorEl.textContent = "";

  try {
    const response = await fetch(API_BASE + "/auth/sign_in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // მომხმარებლის მონაცემების შენახვა (იმეილით)
      const userData = data.user || {};
      userData.email = email; // ვამატებთ იმეილს
      localStorage.setItem("user", JSON.stringify(userData));

      updateCartCount();
      updateAuthUI();
      setLampState(true);

      window.location.href = "index.html";
    } else {
      if (errorEl) errorEl.textContent = "არასწორი იმეილი ან პაროლი";
    }
  } catch (error) {
    if (errorEl) errorEl.textContent = "ქსელის შეცდომა";
  }
}

async function handleSignup(e) {
  e.preventDefault();

  const userData = {
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    age: parseInt(document.getElementById("age").value) || 18,
    email: document.getElementById("signupEmail").value,
    password: document.getElementById("signupPassword").value,
    address: document.getElementById("address").value,
    phone: document.getElementById("phone").value,
    zipcode: document.getElementById("zipcode").value,
    avatar:
      document.getElementById("avatar").value ||
      "https://placehold.co/150/0066cc/white?text=User",
    gender: document.getElementById("gender").value,
  };

  const errorEl = document.getElementById("signupError");
  const successEl = document.getElementById("signupSuccess");

  if (errorEl) errorEl.textContent = "";
  if (successEl) successEl.textContent = "";

  try {
    const response = await fetch(API_BASE + "/auth/sign_up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      const data = await response.json();
      if (successEl)
        successEl.textContent =
          "რეგისტრაცია წარმატებით დასრულდა! გთხოვთ გაიაროთ ავტორიზაცია";
      document.getElementById("signupForm").reset();
      document.getElementById("loginTab")?.click();
    } else {
      const errorData = await response.json();
      const errors = errorData.errorKeys || [];
      if (errorEl) {
        errorEl.textContent = errors
          .map((e) => {
            if (e.includes("email")) return "არასწორი იმეილი";
            if (e.includes("phone")) return "არასწორი ტელეფონის ნომერი";
            if (e.includes("avatar")) return "არასწორი ავატარის URL";
            if (e.includes("password"))
              return "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს";
            return "შეცდომა რეგისტრაციისას";
          })
          .join(", ");
      }
    }
  } catch (error) {
    if (errorEl) errorEl.textContent = "ქსელის შეცდომა";
  }
}

// ⭐⭐⭐ გასწორებული updateAuthUI - იმეილის ჩვენებით ⭐⭐⭐
function updateAuthUI() {
  const token = localStorage.getItem("access_token");
  const authLink = document.getElementById("authLink");

  if (authLink) {
    if (token) {
      let user = { firstName: "", email: "" };
      try {
        const userData = localStorage.getItem("user");
        if (userData && userData !== "undefined" && userData !== "null") {
          user = JSON.parse(userData) || { firstName: "", email: "" };
        } else {
          localStorage.removeItem("user");
        }
      } catch (e) {
        localStorage.removeItem("user");
      }

      // იმეილის ჩვენება
      let displayText = user.email || user.firstName || "მომხმარებელი";

      // თუ იმეილი გრძელია, დავამოკლოთ
      if (displayText.length > 20) {
        displayText = displayText.substring(0, 18) + "...";
      }

      authLink.innerHTML = `<i class="fas fa-user-check" style="color: #d4a373;"></i> ${displayText}`;
      authLink.href = "#";
      authLink.style.color = "#d4a373";
      authLink.style.fontWeight = "500";
      authLink.style.fontSize = "14px";
      authLink.style.maxWidth = "150px";
      authLink.style.overflow = "hidden";
      authLink.style.textOverflow = "ellipsis";
      authLink.style.whiteSpace = "nowrap";

      authLink.onclick = (e) => {
        e.preventDefault();
        // ⚡⚡⚡ გამოსვლის დადასტურება cuteAlert-ით ⚡⚡⚡
        if (typeof cuteAlert !== "undefined") {
          const alertDiv = document.createElement("div");
          alertDiv.className = "cute-alert-overlay show";
          alertDiv.innerHTML = `
            <div class="cute-alert warning">
              <button class="cute-alert-close"><i class="fas fa-times"></i></button>
              <div class="cute-alert-icon"><i class="fas fa-question-circle"></i></div>
              <div class="cute-alert-title">დადასტურება</div>
              <div class="cute-alert-message">დარწმუნებული ხართ, რომ გსურთ გამოსვლა?</div>
              <div style="display: flex; gap: 10px;">
                <button class="cute-alert-button" style="flex: 1;" id="logoutYes">კი</button>
                <button class="cute-alert-button" style="flex: 1; background: linear-gradient(135deg, #6b7280, #4b5563);" id="logoutNo">არა</button>
              </div>
            </div>
          `;
          document.body.appendChild(alertDiv);

          document
            .getElementById("logoutYes")
            ?.addEventListener("click", () => {
              alertDiv.remove();
              logout();
            });

          document.getElementById("logoutNo")?.addEventListener("click", () => {
            alertDiv.remove();
          });

          document
            .querySelector(".cute-alert-close")
            ?.addEventListener("click", () => {
              alertDiv.remove();
            });
        } else {
          if (confirm("გსურთ გამოსვლა?")) {
            logout();
          }
        }
      };
    } else {
      authLink.innerHTML = '<i class="fas fa-user"></i>';
      authLink.href = "auth.html";
      authLink.style.color = "";
      authLink.style.fontWeight = "";
      authLink.style.fontSize = "";
      authLink.style.maxWidth = "";
      authLink.style.overflow = "";
      authLink.style.textOverflow = "";
      authLink.style.whiteSpace = "";
      authLink.onclick = null;
    }
  }
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  updateCartCount();
  updateAuthUI();
  setLampState(false);
  window.location.href = "index.html";
}

// ==================== შეფასებების ფუნქციები ====================

let currentProductId = null;
let selectedRating = 0;

window.openReviewModal = function (productId) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.warning("შეფასების დასამატებლად გთხოვთ გაიაროთ ავტორიზაცია");
    } else {
      alert("შეფასების დასამატებლად გთხოვთ გაიაროთ ავტორიზაცია");
    }
    window.location.href = "auth.html";
    return;
  }

  currentProductId = productId;
  selectedRating = 0;

  const modal = document.getElementById("reviewModal");
  const stars = document.querySelectorAll(".rating-stars i");

  stars.forEach((star) => {
    star.classList.remove("fas", "active");
    star.classList.add("far");
  });

  const selectedEl = document.getElementById("selectedRating");
  const nameEl = document.getElementById("reviewerName");
  const errorEl = document.getElementById("reviewError");

  if (selectedEl) selectedEl.textContent = "აირჩიეთ 1-5 ვარსკვლავი";
  if (nameEl) nameEl.value = "";
  if (errorEl) errorEl.textContent = "";

  if (modal) modal.style.display = "block";
};

function setupReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (!modal) return;

  const closeBtn = document.querySelector(".close");
  const stars = document.querySelectorAll(".rating-stars i");
  const submitBtn = document.getElementById("submitReview");

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  window.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };

  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => {
      const rating = parseInt(star.dataset.rating);
      highlightStars(rating);
    });

    star.addEventListener("mouseleave", () => {
      highlightStars(selectedRating);
    });

    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.rating);
      const selectedEl = document.getElementById("selectedRating");
      if (selectedEl)
        selectedEl.textContent = `არჩეულია: ${selectedRating} ვარსკვლავი`;
      highlightStars(selectedRating);
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener("click", submitReview);
  }
}

function highlightStars(rating) {
  const stars = document.querySelectorAll(".rating-stars i");

  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove("far");
      star.classList.add("fas", "active");
    } else {
      star.classList.remove("fas", "active");
      star.classList.add("far");
    }
  });
}

async function submitReview() {
  if (selectedRating < 1 || selectedRating > 5) {
    const errorEl = document.getElementById("reviewError");
    if (errorEl) errorEl.textContent = "გთხოვთ აირჩიოთ რეიტინგი 1-დან 5-მდე";
    return;
  }

  const reviewerName = document.getElementById("reviewerName").value.trim();
  if (!reviewerName) {
    const errorEl = document.getElementById("reviewError");
    if (errorEl) errorEl.textContent = "გთხოვთ შეიყვანოთ თქვენი სახელი";
    return;
  }

  if (!currentProductId) {
    const errorEl = document.getElementById("reviewError");
    if (errorEl) errorEl.textContent = "პროდუქტის ID ვერ მოიძებნა";
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.warning("შეფასების დასამატებლად გთხოვთ გაიაროთ ავტორიზაცია");
    } else {
      alert("შეფასების დასამატებლად გთხოვთ გაიაროთ ავტორიზაცია");
    }
    window.location.href = "auth.html";
    return;
  }

  const requestBody = {
    productId: currentProductId,
    rate: selectedRating,
    reviewerName: reviewerName,
  };

  try {
    const response = await fetch(API_BASE + "/shop/products/rate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (validateToken(data)) {
      const modal = document.getElementById("reviewModal");
      if (modal) modal.style.display = "none";
      return;
    }

    if (response.ok) {
      if (typeof cuteAlert !== "undefined") {
        cuteAlert.success("✅ შეფასება წარმატებით დაემატა!");
      } else {
        alert("✅ შეფასება წარმატებით დაემატა!");
      }
      const modal = document.getElementById("reviewModal");
      if (modal) modal.style.display = "none";
      if (currentProductId) {
        loadProductDetails(currentProductId);
      }
    } else {
      const errorEl = document.getElementById("reviewError");
      let errorMessage =
        data.errorKeys?.[0] || data.error || "დაფიქსირდა უცნობი შეცდომა";
      console.error("📊 API შეცდომის დეტალები:", data);
      if (errorEl) errorEl.textContent = `❌ შეცდომა: ${errorMessage}`;
    }
  } catch (error) {
    const errorEl = document.getElementById("reviewError");
    console.error("📊 ქსელის შეცდომა:", error);
    if (typeof cuteAlert !== "undefined") {
      cuteAlert.error("❌ ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი.");
    } else {
      alert("❌ ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი.");
    }
  }
}

// მაღაზიის ინიციალიზაციის ფუნქცია
function initShop() {
  console.log("Main shop initialized");
  loadProducts();
  updateCartCount();
}
