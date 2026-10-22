
document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector) => document.querySelector(selector);

    // TOAST NOTIFICATIONS
    let toastTimer;

    function showToast(message) {
        const toast = $("#toast");
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2600);
    }

    // ADD APPLICATION DIALOG
    const applicationDialog = $("#applicationDialog");
    const applicationForm = $("#applicationForm");

    $("#addApplicationBtn")?.addEventListener("click", () => {
        applicationDialog?.showModal();
    });

    $("#closeDialog")?.addEventListener("click", () => {
        applicationDialog?.close();
    });

    $("#cancelDialog")?.addEventListener("click", () => {
        applicationDialog?.close();
    });

    // ADD APPLICATION
    applicationForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        const company = $("#companyInput")?.value.trim();
        const role = $("#roleInput")?.value.trim();
        const status = $("#statusInput")?.value;
        const date = $("#dateInput")?.value.trim() || "Added today";

        if (!company || !role) {
            showToast("Please enter the company and role.");
            return;
        }

        const column = document.querySelector(
            `.tracker-column[data-status="${status}"]`
        );

        if (!column) {
            showToast("Could not find the selected application status.");
            return;
        }

        const applicationList = column.querySelector(".application-list");

        if (!applicationList) {
            showToast("Could not find the application list.");
            return;
        }

        const card = document.createElement("article");
        card.className = "application-card";

        const top = document.createElement("div");
        top.className = "application-top";

        const companyName = document.createElement("strong");
        companyName.textContent = company;

        const moreButton = document.createElement("button");
        moreButton.className = "more-btn";
        moreButton.type = "button";
        moreButton.textContent = "···";
        moreButton.setAttribute("aria-label", "Application options");

        const roleText = document.createElement("p");
        roleText.textContent = role;

        const dateText = document.createElement("small");
        dateText.textContent = date;

        top.append(companyName, moreButton);
        card.append(top, roleText, dateText);

        applicationList.prepend(card);

        // Update application count.
        const count = column.querySelector(".count");

        if (count) {
            count.textContent = String(
                Number(count.textContent) + 1
            );
        }

        moreButton.addEventListener("click", () => {
            showToast("Application actions will be available soon.");
        });

        applicationForm.reset();
        applicationDialog?.close();

        showToast("Application added successfully.");
    });

    // EDIT CAREER GOAL
    const goalDialog = $("#goalDialog");
    const goalForm = $("#goalForm");

    $("#editGoalBtn")?.addEventListener("click", () => {
        const title = $("#careerGoalTitle");
        const subtitle = $("#careerGoalSubtitle");
        const titleInput = $("#goalTitleInput");
        const subtitleInput = $("#goalSubtitleInput");

        if (!goalDialog || !title || !subtitle ||
            !titleInput || !subtitleInput) {
            showToast("Career goal editing is not configured correctly.");
            return;
        }

        titleInput.value = title.textContent.trim();
        subtitleInput.value = subtitle.textContent.trim();

        goalDialog.showModal();
    });

    $("#closeGoalDialog")?.addEventListener("click", () => {
        goalDialog?.close();
    });

    $("#cancelGoalDialog")?.addEventListener("click", () => {
        goalDialog?.close();
    });

    goalForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        const title = $("#goalTitleInput")?.value.trim();
        const subtitle = $("#goalSubtitleInput")?.value.trim();

        if (!title || !subtitle) {
            showToast("Please complete both career goal fields.");
            return;
        }

        const titleElement = $("#careerGoalTitle");
        const subtitleElement = $("#careerGoalSubtitle");

        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = subtitle;

        goalDialog?.close();
        showToast("Career goal updated.");
    });

    // APPLICATION READINESS
    function updateReadiness() {
        const checkboxes = [
            ...document.querySelectorAll(
                ".readiness-items input[type='checkbox']"
            )
        ];

        const completed = checkboxes.filter(
            (checkbox) => checkbox.checked
        ).length;

        const total = checkboxes.length;
        const count = $("#readinessCount");
        const bar = $("#readinessBar");

        if (count) {
            count.textContent = `${completed} of ${total} done`;
        }

        if (bar) {
            bar.style.width = total
                ? `${(completed / total) * 100}%`
                : "0%";
        }
    }

    document
        .querySelectorAll(".readiness-items input[type='checkbox']")
        .forEach((checkbox) => {
            checkbox.addEventListener("change", updateReadiness);
        });

    updateReadiness();

    // RESUME UPLOAD
    const resumeInput = $("#resumeFileInput");

    $("#updateResumeBtn")?.addEventListener("click", () => {
        resumeInput?.click();
    });

    resumeInput?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const fileName = $("#resumeFileName");

        if (fileName) {
            fileName.textContent = file.name;
        }

        showToast("Resume selected. Permanent storage requires a backend.");
    });

    // DOWNLOAD SELECTED RESUME
    $("#downloadResumeBtn")?.addEventListener("click", () => {
        const file = resumeInput?.files?.[0];

        if (!file) {
            showToast("Click Update and select a resume file first.");
            return;
        }

        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = file.name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // RESUME VERSION HISTORY
    $("#versionsBtn")?.addEventListener("click", () => {
        showToast("Resume version history is not connected yet.");
    });

    // SHARE PROFILE LINK
    $("#shareProfileBtn")?.addEventListener("click", async () => {
        const shareData = {
            title: "Career & Resume | StudentOS",
            text: "View my Career & Resume page.",
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                showToast("Profile link shared.");
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareData.url);
                showToast("Page link copied.");
            } else {
                showToast("Copy the page URL from your browser address bar.");
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                showToast("Unable to share the link. Please copy the page URL.");
            }
        }
    });

    // SWITCH BETWEEN BOARD AND TABLE VIEW
    $("#viewTableBtn")?.addEventListener("click", () => {
        const grid = $("#trackerGrid");
        const button = $("#viewTableBtn");

        if (!grid || !button) return;

        const isTable = grid.classList.toggle("table-view");

        button.textContent = isTable
            ? "View as board ›"
            : "View as table ›";
    });

    // NOTIFICATIONS
    $("#notificationBtn")?.addEventListener("click", () => {
        showToast("You're all caught up.");
    });

    $("#settingsLink")?.addEventListener("click", (event) => {
        event.preventDefault();
        showToast("Settings will be available soon.");
    });

    // EXISTING APPLICATION OPTIONS
    document.querySelectorAll(".more-btn").forEach((button) => {
        button.addEventListener("click", () => {
            showToast("Application actions will be available soon.");
        });
    });

    // SEARCH APPLICATIONS
    $("#searchInput")?.addEventListener("input", (event) => {
        const query = event.target.value.toLowerCase().trim();

        document.querySelectorAll(".application-card").forEach((card) => {
            card.hidden = !card.textContent.toLowerCase().includes(query);
        });
    });

    // KEYBOARD SHORTCUT: CTRL + K / CMD + K
    document.addEventListener("keydown", (event) => {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {
            const searchInput = $("#searchInput");

            if (searchInput) {
                event.preventDefault();
                searchInput.focus();
            }
        }
    });
});
