const dialog = document.getElementById("itemDialog");
const form = document.getElementById("itemForm");
const input = document.getElementById("itemInput");
const toast = document.getElementById("toast");

let currentType = "task";
let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function openDialog(type) {
    currentType = type;

    document.getElementById("dialogTitle").textContent =
        type === "task" ? "Add task" : "Add goal";

    input.placeholder =
        type === "task" ? "Enter task name" : "Enter goal name";

    input.value = "";
    dialog.showModal();
    input.focus();
}

document.getElementById("addTaskBtn").addEventListener("click", () => {
    openDialog("task");
});

document.getElementById("addGoalBtn").addEventListener("click", () => {
    openDialog("goal");
});

document.getElementById("closeDialog").addEventListener("click", () => {
    dialog.close();
});

document.getElementById("cancelDialog").addEventListener("click", () => {
    dialog.close();
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = input.value.trim();

    if (name === "") {
        return;
    }

    if (currentType === "task") {
        addTask(name);
    } else {
        addGoal(name);
    }

    dialog.close();
});

function addTask(name) {
    const deadlines = document.getElementById("deadlinesList");

    const row = document.createElement("div");
    row.className = "deadline";

    const icon = document.createElement("span");
    icon.className = "deadline-icon";
    icon.textContent = "✓";

    const details = document.createElement("div");

    const title = document.createElement("b");
    title.textContent = name;

    const description = document.createElement("p");
    description.textContent = "Personal task · Just added";

    details.append(title, description);

    const time = document.createElement("time");
    time.textContent = "New";

    row.append(icon, details, time);
    deadlines.append(row);

    showToast("Task added successfully!");
}

function addGoal(name) {
    const container = document.getElementById("smallGoals");

    const goal = document.createElement("div");
    goal.className = "small-goal";

    const icon = document.createElement("span");
    icon.className = "small-goal-icon";
    icon.textContent = "◉";

    const details = document.createElement("div");
    details.className = "small-goal-info";

    const title = document.createElement("b");
    title.textContent = name;

    const subtitle = document.createElement("small");
    subtitle.textContent = "Personal · Just added";

    details.append(title, subtitle);

    const progress = document.createElement("div");
    progress.className = "small-progress";

    const fill = document.createElement("span");
    fill.style.width = "0%";
    progress.append(fill);

    const percentage = document.createElement("span");
    percentage.className = "percentage";
    percentage.textContent = "0%";

    goal.append(icon, details, progress, percentage);
    container.append(goal);

    showToast("Goal added successfully!");
}

document.getElementById("notificationBtn").addEventListener("click", () => {
    showToast("You are all caught up!");
});

document.getElementById("aiBtn").addEventListener("click", () => {
    showToast("AI Assistant needs an AI API to work.");
});

document.getElementById("prepareBtn").addEventListener("click", () => {
    showToast("Review your projects before the mock interview.");
});

document.getElementById("viewGoalsBtn").addEventListener("click", () => {
    document.getElementById("smallGoals").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});


document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");

        // Let the browser navigate to real pages like SettingsPrivacy.html.
        if (href && href !== "#") {
            return;
        }

        // Only block placeholder links that do not navigate anywhere.
        event.preventDefault();

        document.querySelectorAll(".nav-link").forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        if (typeof showToast === "function") {
            showToast(link.textContent.trim() + " selected");
        }
    });
});


document.getElementById("searchInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.value.trim() !== "") {
        showToast("Searching for: " + event.target.value.trim());
    }
});