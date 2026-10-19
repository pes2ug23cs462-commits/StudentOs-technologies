
const projectGrid = document.getElementById("projectGrid");
const entryDialog = document.getElementById("entryDialog");
const entryForm = document.getElementById("entryForm");
const entryName = document.getElementById("entryName");
const entryDescription = document.getElementById("entryDescription");
const entryCategory = document.getElementById("entryCategory");
const toast = document.getElementById("toast");

let currentEntryType = "project";
let toastTimer;

// Show a notification.
function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

// Update project count and filter labels.
function updateProjectCount() {
    if (!projectGrid) return 0;

    const cards = [...projectGrid.querySelectorAll(".project-card")];
    const visibleCards = cards.filter(card => !card.hidden);

    const projectCount = document.getElementById("projectCount");
    if (projectCount) {
        projectCount.textContent = cards.length;
    }

    const allFilter = document.querySelector('[data-filter="all"]');
    if (allFilter) {
        allFilter.textContent = `All (${cards.length})`;
    }

    const labels = {
        course: "Course",
        personal: "Personal",
        research: "Research"
    };

    document.querySelectorAll(".filter").forEach(button => {
        const category = button.dataset.filter;

        if (category && category !== "all") {
            const count = cards.filter(
                card => card.dataset.category === category
            ).length;

            button.textContent = labels[category] || category;
            button.dataset.count = count;
        }
    });

    return visibleCards.length;
}

// Filter projects by category.
document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        const selectedCategory = button.dataset.filter;

        document.querySelectorAll(".filter").forEach(filter => {
            filter.classList.toggle("active", filter === button);
        });

        if (!projectGrid) return;

        projectGrid.querySelectorAll(".project-card").forEach(card => {
            card.hidden =
                selectedCategory !== "all" &&
                card.dataset.category !== selectedCategory;
        });
    });
});

// Open the project or experience form.
function openEntryDialog(type) {
    if (
        !entryDialog ||
        !entryName ||
        !entryDescription ||
        !entryCategory
    ) {
        return;
    }

    currentEntryType = type;

    const dialogTitle = document.getElementById("dialogTitle");

    if (dialogTitle) {
        dialogTitle.textContent =
            type === "project" ? "Add project" : "Add experience";
    }

    entryName.placeholder =
        type === "project"
            ? "Enter project name"
            : "Enter role or experience name";

    entryName.value = "";
    entryDescription.value = "";
    entryCategory.disabled = type === "experience";

    entryDialog.showModal();
    entryName.focus();
}

// Add project button.
const addProjectBtn = document.getElementById("addProjectBtn");

if (addProjectBtn) {
    addProjectBtn.addEventListener("click", () => {
        openEntryDialog("project");
    });
}

// Add experience button.
const addExperienceBtn = document.getElementById("addExperienceBtn");

if (addExperienceBtn) {
    addExperienceBtn.addEventListener("click", () => {
        openEntryDialog("experience");
    });
}

// Close dialog.
const closeDialog = document.getElementById("closeDialog");

if (closeDialog && entryDialog) {
    closeDialog.addEventListener("click", () => {
        entryDialog.close();
    });
}

// Cancel dialog.
const cancelDialog = document.getElementById("cancelDialog");

if (cancelDialog && entryDialog) {
    cancelDialog.addEventListener("click", () => {
        entryDialog.close();
    });
}

// Save a project or experience.
if (entryForm) {
    entryForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = entryName.value.trim();
        const description = entryDescription.value.trim();

        if (!name) {
            showToast("Please enter a name.");
            return;
        }

        if (currentEntryType === "project") {
            addProject(name, description, entryCategory.value);
            showToast("Project added successfully!");
        } else {
            addExperience(name, description);
            showToast("Experience added successfully!");
        }

        entryDialog.close();
        entryForm.reset();

        if (entryCategory) {
            entryCategory.disabled = false;
        }
    });
}

// Create a project card.
function addProject(name, description, category) {
    if (!projectGrid) return;

    const card = document.createElement("article");
    card.className = "project-card";
    card.dataset.category = category;

    const heading = document.createElement("div");
    heading.className = "project-card-heading";

    const icon = document.createElement("span");
    icon.className = "project-icon";
    icon.textContent = "‹ ›";

    const status = document.createElement("span");
    status.className = "status progress";
    status.textContent = "In progress";

    heading.append(icon, status);

    const title = document.createElement("h3");
    title.textContent = name;

    const descriptionText = document.createElement("p");
    descriptionText.textContent =
        description || "No description added yet.";

    const tags = document.createElement("div");
    tags.className = "tags";

    const categoryLabel =
        category.charAt(0).toUpperCase() + category.slice(1);

    const categoryTag = document.createElement("span");
    categoryTag.textContent = categoryLabel;
    tags.append(categoryTag);

    const footer = document.createElement("div");
    footer.className = "project-card-footer";

    const categoryText = document.createElement("span");
    categoryText.textContent = categoryLabel;

    const detailsLink = document.createElement("a");
    detailsLink.href = "#";
    detailsLink.className = "project-link";
    detailsLink.textContent = "View details ›";

    detailsLink.addEventListener("click", event => {
        event.preventDefault();
        showToast("Project details: " + name);
    });

    footer.append(categoryText, detailsLink);

    card.append(
        heading,
        title,
        descriptionText,
        tags,
        footer
    );

    projectGrid.prepend(card);

    // Show all projects so the newly added card is visible.
    const allFilter = document.querySelector('[data-filter="all"]');

    if (allFilter) {
        allFilter.click();
    }

    updateProjectCount();
}

// Create an experience entry.
function addExperience(name, description) {
    const experienceList = document.getElementById("experienceList");

    if (!experienceList) return;

    const item = document.createElement("article");
    item.className = "experience-item";

    const icon = document.createElement("div");
    icon.className = "item-icon";
    icon.textContent = "▣";

    const details = document.createElement("div");
    details.className = "experience-details";

    const heading = document.createElement("div");
    heading.className = "item-heading";

    const title = document.createElement("h3");
    title.textContent = name;

    const date = document.createElement("span");
    date.textContent = "Just added";

    heading.append(title, date);

    const descriptionText = document.createElement("p");
    descriptionText.className = "description";
    descriptionText.textContent =
        description || "No description added yet.";

    details.append(heading, descriptionText);
    item.append(icon, details);

    experienceList.prepend(item);
}

// GitHub import button.
const githubBtn = document.getElementById("githubBtn");

if (githubBtn) {
    githubBtn.addEventListener("click", () => {
        showToast(
            "GitHub import needs repository access or API integration."
        );
    });
}

// Notification button.
const notificationBtn = document.getElementById("notificationBtn");

if (notificationBtn) {
    notificationBtn.addEventListener("click", () => {
        showToast("You're all caught up!");
    });
}

// Search projects and experience entries.
const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("input", event => {
        const query = event.target.value.trim().toLowerCase();

        if (projectGrid) {
            projectGrid.querySelectorAll(".project-card").forEach(card => {
                const matches = card.textContent
                    .toLowerCase()
                    .includes(query);

                card.hidden = query !== "" && !matches;
            });
        }

        document.querySelectorAll(".experience-item").forEach(item => {
            const matches = item.textContent
                .toLowerCase()
                .includes(query);

            item.hidden = query !== "" && !matches;
        });

        // Restore the active category filter when search is cleared.
        if (query === "" && projectGrid) {
            const activeFilter = document.querySelector(".filter.active");
            const selectedCategory =
                activeFilter?.dataset.filter || "all";

            projectGrid.querySelectorAll(".project-card").forEach(card => {
                card.hidden =
                    selectedCategory !== "all" &&
                    card.dataset.category !== selectedCategory;
            });
        }
    });
}

// Initialize counts.
updateProjectCount();
