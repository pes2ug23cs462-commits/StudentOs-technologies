const FORM_STORAGE_KEY = "studentos.personalInformation";
const PHOTO_STORAGE_KEY = "studentos.profilePhoto";
const form = document.getElementById("personalInformationForm");
const toast = document.getElementById("toast");
const photoInput = document.getElementById("profilePhotoInput");
const photoPreview = document.getElementById("profilePhotoPreview");
const photoInitials = document.getElementById("photoInitials");
const saveStatus = document.getElementById("saveStatus");
const aboutYou = document.getElementById("aboutYou");
const aboutCount = document.getElementById("aboutCount");
let toastTimeout;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showProfilePhoto(source) {
    if (source) {
        photoPreview.src = source;
        photoPreview.hidden = false;
        photoInitials.hidden = true;
        return;
    }

    photoPreview.removeAttribute("src");
    photoPreview.hidden = true;
    photoInitials.hidden = false;
}

function updateAboutCount() {
    aboutCount.textContent = String(aboutYou.value.length);
}

function loadSavedInformation() {
    const savedInformation = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedInformation) {
        const values = JSON.parse(savedInformation);
        Object.entries(values).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (field && typeof value === "string" && !field.readOnly) {
                field.value = value;
            }
        });
    }

    showProfilePhoto(localStorage.getItem(PHOTO_STORAGE_KEY));
    updateAboutCount();
}

try {
    loadSavedInformation();
} catch (error) {
    console.error("Unable to load saved personal information.", error);
    showToast("Saved personal information could not be loaded.");
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
        return;
    }

    const values = Object.fromEntries(
        Array.from(form.elements)
            .filter((field) => field.name && field.type !== "file")
            .map((field) => [field.name, field.value.trim()])
    );

    try {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));
        saveStatus.textContent = "Changes saved on this device.";
    } catch (error) {
        console.error("Unable to save personal information.", error);
        saveStatus.textContent = "";
        showToast("Changes could not be saved in this browser.");
    }
});

document.getElementById("uploadPhotoButton").addEventListener("click", () => {
    photoInput.click();
});

photoInput.addEventListener("change", () => {
    const [file] = photoInput.files;
    if (!file) {
        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showToast("Choose a JPG, PNG, or WebP image.");
        photoInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Choose an image smaller than 5 MB.");
        photoInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        if (typeof reader.result !== "string") {
            showToast("The selected photo could not be read.");
            return;
        }

        try {
            localStorage.setItem(PHOTO_STORAGE_KEY, reader.result);
            showProfilePhoto(reader.result);
            saveStatus.textContent = "Profile photo saved on this device.";
        } catch (error) {
            console.error("Unable to save the profile photo.", error);
            showToast("The photo could not be saved. Try a smaller image.");
        }
    });
    reader.addEventListener("error", () => {
        showToast("The selected photo could not be read.");
    });
    reader.readAsDataURL(file);
    photoInput.value = "";
});

document.getElementById("removePhotoButton").addEventListener("click", () => {
    try {
        localStorage.removeItem(PHOTO_STORAGE_KEY);
        showProfilePhoto("");
        saveStatus.textContent = "Profile photo removed.";
    } catch (error) {
        console.error("Unable to remove the profile photo.", error);
        showToast("The profile photo could not be removed.");
    }
});

aboutYou.addEventListener("input", updateAboutCount);

document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("globalSearch").focus();
    }
});

document.getElementById("globalSearch").addEventListener("keydown", (event) => {
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

document.querySelectorAll(".profile-navigation [data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
        const pages = {
            education: "education.html",
            achievements: "profile1.html",
            goals: "profile2.html",
            projects: "profile3.html",
            career: "profile4.html"
        };
        const destination = pages[tab.dataset.tab];
        if (destination) {
            window.location.href = destination;
        } else {
            showToast(`${tab.textContent.trim()} page is not connected yet.`);
        }
    });
});