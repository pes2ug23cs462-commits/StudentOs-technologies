
const TAB_PAGES = {
    personal: "Personal.html",
    education: "education.html",
    achievements: "profile1.html",
    goals: "profile2.html",
    projects: "profile3.html",
    career: "profile4.html"
};

const searchInput = document.getElementById("globalSearch");
const toast = document.getElementById("toast");
let toastTimeout;

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

// Search shortcut: Ctrl+K / Cmd+K
document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput?.focus();
    }
});

// Filter visible documents using the global search
const documentList = document.getElementById("documentList");
const emptyDocuments = document.getElementById("emptyDocuments");

searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    const items = document.querySelectorAll(".document-item");
    let visibleCount = 0;

    items.forEach((item) => {
        const matches = item.textContent.toLowerCase().includes(query);
        item.hidden = !matches;
        if (matches) visibleCount++;
    });

    if (emptyDocuments) {
        emptyDocuments.hidden = visibleCount !== 0;
    }
});

// Profile navigation
document.querySelectorAll(".profile-nav-link").forEach((tab) => {
    tab.addEventListener("click", () => {
        const section = tab.dataset.tab;

        if (TAB_PAGES[section]) {
            window.location.href = TAB_PAGES[section];
            return;
        }

        if (section !== "documents") {
            showToast(`${tab.textContent.trim()} page is not connected yet.`);
            return;
        }

        document.querySelectorAll(".profile-nav-link").forEach((item) => {
            item.classList.remove("active");
            item.removeAttribute("aria-current");
        });

        tab.classList.add("active");
        tab.setAttribute("aria-current", "page");
    });
});

// Link fields: validate before showing the demo save message
const linksForm = document.getElementById("linksForm");

linksForm?.querySelectorAll('input[type="url"]').forEach((input) => {
    input.addEventListener("change", () => {
        const value = input.value.trim();

        if (!value) {
            input.setCustomValidity("");
            return;
        }

        try {
            const parsed = new URL(value);
            input.setCustomValidity(
                parsed.protocol === "https:" || parsed.protocol === "http:"
                    ? ""
                    : "Enter a valid HTTP or HTTPS URL."
            );
        } catch {
            input.setCustomValidity("Enter a complete URL, including https://");
        }
    });

    input.addEventListener("input", () => {
        input.setCustomValidity("");
    });
});

// No Save Links button in the Figma design.
// This demo reports the current links when the form is submitted
// programmatically; it does not save to a server.
linksForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!linksForm.reportValidity()) return;

    showToast("Links are ready. Backend saving is not connected yet.");
});

// Upload button opens the file picker
const uploadButton = document.getElementById("uploadDocumentBtn");
const fileInput = document.getElementById("documentFileInput");

uploadButton?.addEventListener("click", () => {
    fileInput?.click();
});

fileInput?.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);

    if (files.length === 0) return;

    files.forEach((file) => {
        const article = document.createElement("article");
        article.className = "document-item";

        const icon = document.createElement("div");
        icon.className = "document-icon";
        icon.textContent = "▤";

        const info = document.createElement("div");
        info.className = "document-info";

        const name = document.createElement("strong");
        name.textContent = file.name;

        const metadata = document.createElement("small");
        metadata.textContent =
            `Selected file · ${(file.size / 1024).toFixed(1)} KB`;

        info.append(name, metadata);

        const status = document.createElement("span");
        status.className = "verification pending";
        status.textContent = "Pending";

        const download = document.createElement("button");
        download.className = "download-document";
        download.type = "button";
        download.textContent = "Download";

        const objectUrl = URL.createObjectURL(file);
        download.addEventListener("click", () => {
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = file.name;
            link.click();
        });

        article.append(icon, info, status, download);
        documentList?.prepend(article);
    });

    if (emptyDocuments) emptyDocuments.hidden = true;

    showToast(`${files.length} file(s) selected. They have not been uploaded to a server.`);
    fileInput.value = "";
});

// Notification button
document.getElementById("notificationBtn")?.addEventListener("click", () => {
    showToast("You're all caught up!");
});

// Public profile button
document.getElementById("publicProfileBtn")?.addEventListener("click", () => {
    showToast("Public profile preview is not connected yet.");
});

document.getElementById("settingsLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    showToast("Settings & Privacy page is not connected yet.");
});
