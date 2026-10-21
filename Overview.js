
const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "studentos_access_token";

const dialog = document.getElementById("itemDialog");
const form = document.getElementById("itemForm");
const input = document.getElementById("itemInput");
const toast = document.getElementById("toast");

let currentType = "task";
let toastTimer;
let currentStudent = null;
let taskRequestInProgress = false;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("Please sign in before using your saved tasks.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
    }

    if (!response.ok) {
        let message = `Request failed (${response.status}).`;

        try {
            const errorData = await response.json();
            if (errorData.detail) {
                message = errorData.detail;
            }
        } catch {
            // Keep the default error message if the response isn't JSON.
        }

        throw new Error(message);
    }

    return response.json();
}

async function initializeTasks() {
    const deadlines = document.getElementById("deadlinesList");

    try {
        currentStudent = await apiRequest("/api/auth/me");

        const tasks = await apiRequest(
            `/api/students/${currentStudent.student_id}/tasks`
        );

        // Replace the sample task list with the signed-in student's saved tasks.
        deadlines.replaceChildren();

        tasks.forEach(renderTask);

        if (tasks.length === 0) {
            showToast("No saved tasks yet. Add a task to get started.");
        }
    } catch (error) {
        console.error("Unable to load saved tasks:", error);
        showToast(error.message || "Could not load your saved tasks.");
    }
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

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = input.value.trim();

    if (!name || taskRequestInProgress) {
        return;
    }

    if (currentType === "goal") {
        addGoal(name);
        dialog.close();
        return;
    }

    taskRequestInProgress = true;

    try {
        if (!currentStudent) {
            currentStudent = await apiRequest("/api/auth/me");
        }

        const savedTask = await apiRequest(
            `/api/students/${currentStudent.student_id}/tasks`,
            {
                method: "POST",
                body: JSON.stringify({
                    title: name,
                    description: "Personal task",
                    priority: "medium",
                    status: "pending",
                }),
            }
        );

        renderTask(savedTask);
        dialog.close();
        showToast("Task saved successfully!");
    } catch (error) {
        console.error("Unable to save task:", error);
        showToast(error.message || "Could not save the task.");
    } finally {
        taskRequestInProgress = false;
    }
});

function renderTask(task) {
    const deadlines = document.getElementById("deadlinesList");

    const row = document.createElement("div");
    row.className = "deadline";
    row.dataset.taskId = String(task.task_id);

    const icon = document.createElement("span");
    icon.className = "deadline-icon";
    icon.textContent = task.status === "completed" ? "\u2713" : "\u25A4";

    const details = document.createElement("div");

    const title = document.createElement("b");
    title.textContent = task.title;

    const description = document.createElement("p");
    description.textContent =
        task.description || `Personal task · ${task.status.replace("_", " ")}`;

    details.append(title, description);

    const time = document.createElement("time");

    if (task.due_date) {
        const dueDate = new Date(task.due_date);
        time.textContent = Number.isNaN(dueDate.getTime())
            ? "Scheduled"
            : dueDate.toLocaleDateString();
    } else {
        time.textContent = task.status === "completed" ? "Completed" : "No due date";
    }

    row.append(icon, details, time);
    deadlines.append(row);
}

function addGoal(name) {
    const container = document.getElementById("smallGoals");

    const goal = document.createElement("div");
    goal.className = "small-goal";

    const icon = document.createElement("span");
    icon.className = "small-goal-icon";
    icon.textContent = "\u25C9";

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
        block: "center",
    });
});

document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");

        if (href && href !== "#") {
            return;
        }

        event.preventDefault();

        document.querySelectorAll(".nav-link").forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");
        showToast(`${link.textContent.trim()} selected`);
    });
});

document.getElementById("searchInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.value.trim() !== "") {
        showToast("Searching for: " + event.target.value.trim());
    }
});

initializeTasks();
