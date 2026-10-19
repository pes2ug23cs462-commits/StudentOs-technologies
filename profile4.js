// ===== Small "saved" message =====
const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);

let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

// ===== Open to opportunities toggle =====
const openToggle = document.getElementById("openToggle");
openToggle.addEventListener("change", () => {
    showToast(openToggle.checked ? "Open to opportunities: on" : "Open to opportunities: off");
});

// ===== Text fields + opportunity type: save when changed =====
["targetRole", "locations", "stipend"].forEach((id) => {
    const el = document.getElementById(id);
    let last = el.value;
    el.addEventListener("blur", () => {
        if (el.value.trim() === "") { el.value = last; return; }
        if (el.value !== last) {
            last = el.value;
            showToast("Saved");
        }
    });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") el.blur(); });
});

document.getElementById("oppType").addEventListener("change", () => showToast("Saved"));

// ===== Available from (month picker) =====
const availableControl = document.getElementById("availableControl");
const availableText = document.getElementById("availableFrom");
const availablePicker = document.getElementById("availablePicker");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

availableControl.addEventListener("click", () => {
    if (typeof availablePicker.showPicker === "function") {
        try { availablePicker.showPicker(); return; } catch (err) { /* fall through */ }
    }
    availablePicker.focus();
});

availablePicker.addEventListener("change", () => {
    if (!availablePicker.value) return;
    const [year, month] = availablePicker.value.split("-");
    availableText.value = MONTHS[parseInt(month, 10) - 1] + " " + year;
    showToast("Saved");
});

// ===== Resume dropdown =====
const resumeBtn = document.getElementById("resumeBtn");
const resumeMenu = document.getElementById("resumeMenu");
const resumeName = document.getElementById("resumeName");
const resumeMeta = document.getElementById("resumeMeta");

function closeResumeMenu() {
    resumeMenu.hidden = true;
    resumeBtn.setAttribute("aria-expanded", "false");
}

resumeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = resumeMenu.hidden;
    resumeMenu.hidden = !open;
    resumeBtn.setAttribute("aria-expanded", String(open));
});

resumeMenu.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => {
        resumeMenu.querySelectorAll("li").forEach((x) => x.classList.remove("selected"));
        li.classList.add("selected");
        resumeName.textContent = li.dataset.name;
        resumeMeta.textContent = li.dataset.meta;
        closeResumeMenu();
        showToast("Resume updated");
    });
});

document.addEventListener("click", closeResumeMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeResumeMenu(); });