// ===== Shown / Hidden toggles =====
document.querySelectorAll(".toggle input").forEach((input) => {
    input.addEventListener("change", () => {
        const item = input.closest(".item");
        const state = item.querySelector(".state");

        state.textContent = input.checked ? "Shown" : "Hidden";
        item.classList.toggle("is-hidden", !input.checked);
    });
});

// ===== Featured projects: max 3 =====
const MAX_FEATURED = 3;

function featuredShownCount() {
    return [...document.querySelectorAll(".item")].filter(
        (item) =>
        item.querySelector(".badge.featured") &&
        item.querySelector(".toggle input").checked
    ).length;
}

// If a featured project is turned on while 3 are already featured, warn the user
document.querySelectorAll(".item").forEach((item) => {
    const badge = item.querySelector(".badge.featured");
    const input = item.querySelector(".toggle input");
    if (!badge || !input) return;

    input.addEventListener("change", () => {
        if (input.checked && featuredShownCount() > MAX_FEATURED) {
            input.checked = false;
            item.querySelector(".state").textContent = "Hidden";
            alert("You can feature up to " + MAX_FEATURED + " projects on your public profile.");
        }
    });
});

// ===== Manage buttons =====
document.querySelectorAll(".manage-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const what = btn.dataset.manage === "projects" ? "projects" : "experience";
        alert("Manage " + what + " — link this button to your full " + what + " page.");
    });
});