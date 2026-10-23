/* ==========================================================================
   RAMMOLAI FOUNDATION — MAIN JAVASCRIPT
   Student: Dimpho Masilo (ST10500849)
   Module:  WEDE5020 — Web Development (Introduction)
   Sections: 1 Form validation + AJAX | 2 Lightbox | 3 Search filter | 4 Maps
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initFormValidation();
    initLightboxGallery();
    initServiceSearch();
    initMaps();
});

/* ==========================================================================
   1. FORM VALIDATION + AJAX SUBMISSION (enquiry.html and contact.html)
   ========================================================================== */
function initFormValidation() {
    document.querySelectorAll("form").forEach(form => {
        // Turn off the browser's own pop-ups so our custom messages are used
        form.setAttribute("novalidate", "");

        // Clear a field's error as soon as the user starts fixing it
        form.querySelectorAll("input, select, textarea").forEach(field => {
            field.addEventListener("input", () => clearFieldError(field));
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();          // always handle submission ourselves (AJAX)
            clearAllErrors(form);

            if (!validateForm(form)) {
                const firstBad = form.querySelector("[aria-invalid='true']");
                if (firstBad) firstBad.focus();
                return;
            }

            const button = form.querySelector("button[type='submit']");
            const originalText = button.textContent;
            button.textContent = "Sending...";
            button.disabled = true;

            try {
                // AJAX: send the data to Formspree without reloading the page
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { Accept: "application/json" }
                });

                if (!response.ok) throw new Error("Server responded with " + response.status);

                showNotice(buildResponseMessage(form), "success");
                form.reset();
            } catch (error) {
                showNotice("Sorry, your message could not be sent. Please try again, or email us at rammolaifoundation1@gmail.com.", "error");
            } finally {
                button.textContent = originalText;
                button.disabled = false;
            }
        });
    });
}

// Checks every field in the form; returns true only if all pass
function validateForm(form) {
    let valid = true;

    form.querySelectorAll("input, select, textarea").forEach(field => {
        const value = field.value.trim();

        if (field.required && !value) {
            setFieldError(field, field.tagName === "SELECT"
                ? "Please choose an option."
                : "This field is required.");
            valid = false;
        } else if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setFieldError(field, "Please enter a valid email address (e.g. name@example.com).");
            valid = false;
        } else if (field.type === "tel" && value && !/^[0-9+\s()-]{10,15}$/.test(value)) {
            setFieldError(field, "Please enter a valid phone number (10 to 15 digits).");
            valid = false;
        } else if (field.tagName === "TEXTAREA" && field.required && value.length < 10) {
            setFieldError(field, "Please write at least 10 characters.");
            valid = false;
        }
    });

    return valid;
}

// Builds a response that depends on what the user selected (enquiry page)
// or a general confirmation (contact page)
function buildResponseMessage(form) {
    const name = (form.querySelector("[name='name']") || {}).value || "";
    const greeting = name ? "Thank you, " + name.split(" ")[0] + "! " : "Thank you! ";
    const interest = form.querySelector("#interest");

    if (!interest) {
        return greeting + "Your message has been sent. We will reply by email within 48 hours.";
    }

    const replies = {
        "volunteering": "We would love your help. We will email you the dates of our next drives and the volunteer roles available within 48 hours.",
        "donate-money": "We will email you our EFT banking details and NPO number within 48 hours so you can donate with confidence.",
        "donate-items": "Items can be dropped off at 509 Stasie Street, Pretoria North. We will confirm which items are currently needed and a drop-off time within 48 hours.",
        "sponsor": "We will send you our sponsorship options and what each level provides to learners within 48 hours."
    };
    return greeting + (replies[interest.value] || "We will be in touch within 48 hours.");
}

/* ---- Error helpers (aria attributes make errors accessible to screen readers) ---- */
function setFieldError(field, message) {
    field.setAttribute("aria-invalid", "true");
    field.style.borderColor = "#d93838";

    const error = document.createElement("span");
    error.className = "custom-error-msg";
    error.setAttribute("role", "alert");
    error.textContent = message;
    Object.assign(error.style, {
        color: "#b42323", fontSize: "0.875rem", display: "block",
        marginTop: "0.35rem", fontWeight: "600"
    });
    field.parentNode.appendChild(error);
}

function clearFieldError(field) {
    field.removeAttribute("aria-invalid");
    field.style.borderColor = "";
    const old = field.parentNode.querySelector(".custom-error-msg");
    if (old) old.remove();
}

function clearAllErrors(form) {
    form.querySelectorAll("input, select, textarea").forEach(clearFieldError);
}

/* ---- Feedback banner shown after submission ---- */
function showNotice(message, type) {
    const notice = document.createElement("div");
    notice.setAttribute("role", "status");
    notice.textContent = message;
    Object.assign(notice.style, {
        position: "fixed", top: "30px", left: "50%", transform: "translateX(-50%)",
        width: "min(90%, 34rem)", padding: "1.2rem 1.5rem", borderRadius: "6px",
        backgroundColor: type === "success" ? "#0f8c88" : "#b42323",
        color: "#ffffff", boxShadow: "0 4px 15px rgba(0,0,0,0.25)", zIndex: "2000",
        fontFamily: "var(--font-heading)", fontWeight: "600", textAlign: "center"
    });
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 6000);
}

/* ==========================================================================
   2. LIGHTBOX GALLERY (index, about and services pages)
   Click an image to enlarge it; click the backdrop, press Escape, or use
   the arrow keys to move between images.
   ========================================================================== */
function initLightboxGallery() {
    const images = Array.from(document.querySelectorAll("article img, main section > img"));
    if (images.length === 0) return;

    const overlay = document.createElement("div");
    overlay.id = "gallery-lightbox-modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image viewer");
    Object.assign(overlay.style, {
        position: "fixed", inset: "0", backgroundColor: "rgba(42, 31, 46, 0.95)",
        zIndex: "5000", display: "none", flexDirection: "column",
        justifyContent: "center", alignItems: "center", cursor: "zoom-out", padding: "1rem"
    });

    const bigImage = document.createElement("img");
    Object.assign(bigImage.style, {
        maxWidth: "90%", maxHeight: "75%", borderRadius: "6px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.6)", transform: "scale(0.95)",
        transition: "transform 0.25s ease", width: "auto"
    });

    const caption = document.createElement("p");
    Object.assign(caption.style, { color: "#fff", marginTop: "1rem", textAlign: "center" });

    overlay.append(bigImage, caption);
    document.body.appendChild(overlay);

    let current = 0;

    function show(index) {
        current = (index + images.length) % images.length;   // wraps around
        bigImage.src = images[current].src;
        bigImage.alt = images[current].alt;
        caption.textContent = images[current].alt + " (" + (current + 1) + " of " + images.length + ")";
    }

    function open(index) {
        show(index);
        overlay.style.display = "flex";
        setTimeout(() => (bigImage.style.transform = "scale(1)"), 10);
    }

    function close() {
        bigImage.style.transform = "scale(0.95)";
        setTimeout(() => (overlay.style.display = "none"), 200);
    }

    images.forEach((img, i) => {
        img.style.cursor = "zoom-in";
        img.setAttribute("tabindex", "0");           // keyboard users can focus images
        img.addEventListener("click", () => open(i));
        img.addEventListener("keydown", e => { if (e.key === "Enter") open(i); });
    });

    overlay.addEventListener("click", close);
    document.addEventListener("keydown", e => {
        if (overlay.style.display === "none") return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowRight") show(current + 1);
        if (e.key === "ArrowLeft") show(current - 1);
    });
}

/* ==========================================================================
   3. SERVICE SEARCH / FILTER (services.html)
   Needs <input id="service-search"> and <p id="search-feedback"> in the HTML.
   ========================================================================== */
function initServiceSearch() {
    const searchBox = document.getElementById("service-search");
    if (!searchBox) return;

    const cards = document.querySelectorAll("main article");
    const feedback = document.getElementById("search-feedback");

    searchBox.addEventListener("input", () => {
        const term = searchBox.value.trim().toLowerCase();
        let visible = 0;

        cards.forEach(card => {
            const match = card.textContent.toLowerCase().includes(term);
            card.style.display = match ? "" : "none";
            if (match) visible++;
        });

        if (feedback) {
            feedback.textContent = visible === 0
                ? "No services match \"" + searchBox.value + "\"."
                : visible + " service" + (visible === 1 ? "" : "s") + " shown.";
        }
    });
}

/* ==========================================================================
   4. INTERACTIVE MAPS (contact.html) — Leaflet + OpenStreetMap
   Leaflet's CSS and JS must be loaded in contact.html BEFORE this file.
   ========================================================================== */
function initMaps() {
    if (typeof L === "undefined") return;   // not on the contact page

    // Coordinates are approximate: confirm them by right-clicking each place in Google Maps
    const places = [
        { id: "head-office-map", lat: -25.6667, lng: 28.1667, label: "Rammolai Foundation Head Office<br>509 Stasie Street, Pretoria North" },
        { id: "school-location-map", lat: -25.7690, lng: 28.0900, label: "Kgabo Primary School<br>Atteridgeville" }
    ];

    places.forEach(place => {
        const container = document.getElementById(place.id);
        if (!container) return;

        const map = L.map(place.id).setView([place.lat, place.lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
        L.marker([place.lat, place.lng]).addTo(map).bindPopup(place.label).openPopup();
    });
}
       