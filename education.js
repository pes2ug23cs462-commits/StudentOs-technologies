const toast = document.getElementById("toast");
const searchInput = document.getElementById("globalSearch");
let toastTimeout;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
    }
});

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.currentTarget.value.trim()) {
        showToast("Search is available across your StudentOS workspace.");
    }
});

document.getElementById("notificationBtn").addEventListener("click", () => {
    showToast("You're all caught up!");
});

document.getElementById("publicProfileBtn").addEventListener("click", () => {
    showToast("Public profile preview is not connected yet.");
});

document.querySelectorAll(".profile-navigation [data-tab]").forEach((item) => {
    item.addEventListener("click", () => {
        const pages = {
            achievements: "profile1.html",
            goals: "profile2.html",
            projects: "profile3.html",
            career: "profile4.html"
        };
        const destination = pages[item.dataset.tab];
        if (destination) {
            window.location.href = destination;
            return;
        }

        showToast(`${item.textContent.trim()} page is not connected yet.`);
    });
});

document.querySelectorAll(".semester-row").forEach((row) => {
    row.addEventListener("toggle", () => {
        row.setAttribute("aria-label", `${row.querySelector("summary").textContent.trim()}, ${row.open ? "expanded" : "collapsed"}`);
    });
});