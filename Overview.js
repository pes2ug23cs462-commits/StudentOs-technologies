
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

// --------------------------------------------------
// TOAST NOTIFICATIONS
// --------------------------------------------------

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// --------------------------------------------------
// API AND AUTHENTICATION
// --------------------------------------------------

function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("Please sign in before using your saved tasks and goals.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
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
                message = Array.isArray(errorData.detail)
                    ? errorData.detail.map(item => item.msg).join(", ")
                    : errorData.detail;
            }
        } catch {
            // Keep the default error message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// --------------------------------------------------
// STUDENT IDENTITY
// --------------------------------------------------

function updateStudentIdentity(student) {
    const fullName = (student.full_name || "Student").trim();
    const firstName = fullName.split(/\s+/)[0];

    const initials = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");

    const profileCard = document.querySelector("a.profile");
    const profileName = profileCard?.querySelector("strong");

    if (profileName) {
        profileName.textContent = fullName;
    }

    const welcomeHeading = document.querySelector(".welcome h1");

    if (welcomeHeading) {
        welcomeHeading.textContent = `Good morning, ${firstName}`;
    }

    document.querySelectorAll(".avatar").forEach(avatar => {
        avatar.textContent = initials || "S";
        avatar.setAttribute("aria-label", fullName);
    });
}

// --------------------------------------------------
// INITIALIZE DASHBOARD
// --------------------------------------------------

async function initializeTasks() {
    const deadlines = document.getElementById("deadlinesList");

    try {
        currentStudent = await apiRequest("/api/auth/me");
        updateStudentIdentity(currentStudent);

        const tasks = await apiRequest(
            `/api/students/${currentStudent.student_id}/tasks`
        );

        deadlines.replaceChildren();
        tasks.forEach(renderTask);
    } catch (error) {
        console.error("Unable to load saved tasks:", error);
        showToast(error.message || "Could not load your saved tasks.");
        return;
    }

    try {
        await initializeGoals();
    } catch (error) {
        console.error("Unable to load saved goals:", error);
        showToast(error.message || "Could not load your saved goals.");
    }
}

// --------------------------------------------------
// LOAD REAL GOALS FROM THE BACKEND
// --------------------------------------------------

async function initializeGoals() {
    const goals = await apiRequest(
        `/api/students/${currentStudent.student_id}/goals`
    );

    const goalGrid = document.getElementById("goalGrid");
    const smallGoals = document.getElementById("smallGoals");

    if (!goalGrid || !smallGoals) {
        throw new Error(
            "Goal containers were not found. Check the goalGrid and smallGoals elements in Overview.html."
        );
    }

    // Replace the hardcoded large cards with saved goals.
    goalGrid.replaceChildren();

    // Replace compact cards with the same saved goals.
    smallGoals.replaceChildren();

    goals.forEach(goal => {
        renderGoalCard(goal);
        renderGoal(goal);
    });
}

// --------------------------------------------------
// ADD TASK / ADD GOAL DIALOG
// --------------------------------------------------

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

// --------------------------------------------------
// SAVE TASKS AND GOALS
// --------------------------------------------------

form.addEventListener("submit", async event => {
    event.preventDefault();

    const name = input.value.trim();

    if (!name || taskRequestInProgress) {
        return;
    }

    taskRequestInProgress = true;

    try {
        if (!currentStudent) {
            currentStudent = await apiRequest("/api/auth/me");
            updateStudentIdentity(currentStudent);
        }

        if (currentType === "goal") {
            const savedGoal = await apiRequest(
                `/api/students/${currentStudent.student_id}/goals`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: name,
                        description: null,
                        category: "personal",
                        progress: 0,
                        status: "not_started",
                        target_date: null,
                    }),
                }
            );

            // Refresh both goal sections from the backend.
            await initializeGoals();

            dialog.close();
            showToast("Goal saved successfully!");
            return;
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
        console.error("Unable to save item:", error);

        showToast(
            error.message ||
            (currentType === "goal"
                ? "Could not save the goal."
                : "Could not save the task.")
        );
    } finally {
        taskRequestInProgress = false;
    }
});

// --------------------------------------------------
// RENDER TASKS
// --------------------------------------------------

function renderTask(task) {
    const deadlines = document.getElementById("deadlinesList");

    const row = document.createElement("div");
    row.className = "deadline";
    row.dataset.taskId = String(task.task_id);

    const icon = document.createElement("span");
    icon.className = "deadline-icon";
    icon.textContent =
        task.status === "completed" ? "\u2713" : "\u25A4";

    const details = document.createElement("div");

    const title = document.createElement("b");
    title.textContent = task.title;

    const description = document.createElement("p");
    description.textContent =
        task.description ||
        `Personal task · ${String(task.status || "pending").replace("_", " ")}`;

    details.append(title, description);

    const time = document.createElement("time");

    if (task.due_date) {
        const dueDate = new Date(task.due_date);

        time.textContent = Number.isNaN(dueDate.getTime())
            ? "Scheduled"
            : dueDate.toLocaleDateString();
    } else {
        time.textContent =
            task.status === "completed" ? "Completed" : "No due date";
    }

    row.append(icon, details, time);
    deadlines.append(row);
}

// --------------------------------------------------
// GOAL HELPERS
// --------------------------------------------------

function getGoalProgress(goal) {
    return Math.max(
        0,
        Math.min(100, Number(goal.progress) || 0)
    );
}

function getGoalCategory(goal) {
    const category = goal.category || "personal";

    return category.charAt(0).toUpperCase() + category.slice(1);
}

function getGoalTargetLabel(goal) {
    if (!goal.target_date) {
        return "No target date";
    }

    const date = new Date(`${goal.target_date}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? `Due ${goal.target_date}`
        : `Due ${date.toLocaleDateString()}`;
}

function getGoalStatusLabel(goal) {
    if (goal.status === "completed") {
        return "Completed";
    }

    if (goal.status === "in_progress") {
        return "In progress";
    }

    return "Not started";
}

// --------------------------------------------------
// RENDER LARGE GOAL CARDS
// --------------------------------------------------

function renderGoalCard(goal) {
    const grid = document.getElementById("goalGrid");

    const card = document.createElement("article");
    card.className = "goal-card";
    card.dataset.goalId = String(goal.goal_id);

    // Goal heading.
    const heading = document.createElement("div");
    heading.className = "goal-heading";

    const titleGroup = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = goal.title;

    const metadata = document.createElement("p");
    metadata.textContent =
        `${getGoalCategory(goal)} · ${getGoalTargetLabel(goal)}`;

    titleGroup.append(title, metadata);

    const badge = document.createElement("span");
    badge.classList.add("badge");

    if (goal.status === "completed") {
        badge.classList.add("green");
    } else if (goal.status === "in_progress") {
        badge.classList.add("purple");
    }

    badge.textContent = getGoalStatusLabel(goal);

    heading.append(titleGroup, badge);

    // Progress bar.
    const progressHeading = document.createElement("div");
    progressHeading.className = "progress-heading";

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";

    const percentage = getGoalProgress(goal);

    progressFill.style.width = `${percentage}%`;
    progressBar.append(progressFill);

    const percentageLabel = document.createElement("strong");
    percentageLabel.textContent = `${percentage}%`;

    progressHeading.append(progressBar, percentageLabel);

    // Description from the database, not invented checklist items.
    const description = document.createElement("p");
    description.textContent =
        goal.description || "Keep working toward this goal.";

    card.append(heading, progressHeading, description);
    grid.append(card);
}

// --------------------------------------------------
// RENDER COMPACT GOAL CARDS
// --------------------------------------------------

function renderGoal(goal) {
    const container = document.getElementById("smallGoals");

    const card = document.createElement("div");
    card.className = "small-goal";
    card.dataset.goalId = String(goal.goal_id);

    const icon = document.createElement("span");
    icon.className = "small-goal-icon";
    icon.textContent = "\u25C9";

    const details = document.createElement("div");
    details.className = "small-goal-info";

    const title = document.createElement("b");
    title.textContent = goal.title;

    const subtitle = document.createElement("small");
    subtitle.textContent =
        `${getGoalCategory(goal)} · ${getGoalTargetLabel(goal)}`;

    details.append(title, subtitle);

    const progress = document.createElement("div");
    progress.className = "small-progress";

    const fill = document.createElement("span");
    const percentageValue = getGoalProgress(goal);

    fill.style.width = `${percentageValue}%`;
    progress.append(fill);

    const percentage = document.createElement("span");
    percentage.className = "percentage";
    percentage.textContent = `${percentageValue}%`;

    card.append(icon, details, progress, percentage);
    container.append(card);
}

// --------------------------------------------------
// OTHER DASHBOARD BUTTONS
// --------------------------------------------------

document.getElementById("notificationBtn").addEventListener("click", () => {
    showToast("You are all caught up!");
});

document.getElementById("aiBtn").addEventListener("click", () => {
    showToast("AI Assistant needs an AI API to work.");
});

document.getElementById("prepareBtn")?.addEventListener("click", () => {
    showToast("Project preparation will be available when this feature is connected.");
});

document.getElementById("viewGoalsBtn").addEventListener("click", () => {
    document.getElementById("goalGrid").scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
});

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        const href = link.getAttribute("href");

        if (href && href !== "#") {
            return;
        }

        event.preventDefault();

        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
        showToast(`${link.textContent.trim()} selected`);
    });
});

document.getElementById("searchInput").addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.value.trim() !== "") {
        showToast("Searching for: " + event.target.value.trim());
    }
});

// --------------------------------------------------
// START
// --------------------------------------------------

initializeTasks();
