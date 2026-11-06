/**
 * StudentOS — Light Theme Dashboard Client Controller
 * Standalone frontend implementation for Figma preview
 */

document.addEventListener("DOMContentLoaded", () => {
    // State
    const state = {
        theme: "light",
        selectedDay: "thu",
        sessionState: "not_started", // "not_started" | "in_progress" | "rescheduled"
        sessionTime: "8:00 – 9:00 PM · 60 min",
        priorities: {
            p1: true,
            p2: false,
            p3: false,
            p4: false
        }
    };

    // DOM Elements
    const body = document.body;
    const btnThemeDark = document.getElementById("btnThemeDark");
    const btnThemeLight = document.getElementById("btnThemeLight");

    // Reschedule Modal Elements
    const rescheduleModal = document.getElementById("rescheduleModal");
    const btnDashReschedule = document.getElementById("btnDashReschedule");
    const btnCloseReschedule = document.getElementById("btnCloseReschedule");
    const btnCancelReschedule = document.getElementById("btnCancelReschedule");
    const btnConfirmReschedule = document.getElementById("btnConfirmReschedule");
    const linkChooseNewTime = document.getElementById("linkChooseNewTime");
    const rescheduleSlotList = document.getElementById("rescheduleSlotList");

    // Assistant Drawer Elements
    const assistantDrawer = document.getElementById("assistantDrawer");
    const assistantDrawerBackdrop = document.getElementById("assistantDrawerBackdrop");
    const drawerCloseBtn = document.getElementById("drawerCloseBtn");
    const sidebarAskBtn = document.getElementById("sidebarAskBtn");
    const btnHeaderAsk = document.getElementById("btnHeaderAsk");
    const cardAskStudentOS = document.getElementById("cardAskStudentOS");
    const floatingWidget = document.getElementById("floatingWidget");
    const drawerChatForm = document.getElementById("drawerChatForm");
    const drawerChatInput = document.getElementById("drawerChatInput");
    const drawerChatHistory = document.getElementById("drawerChatHistory");

    // Toast Container
    const toastContainer = document.getElementById("toastContainer");

    // Main session elements
    const btnDashStartSession = document.getElementById("btnDashStartSession");
    const btnDashStartText = document.getElementById("btnDashStartText");
    const dashSessionBadge = document.getElementById("dashSessionBadge");

    // Attention card elements
    const attentionCard = document.getElementById("attentionCard");
    const btnAcceptSundayBuffer = document.getElementById("btnAcceptSundayBuffer");
    const btnDismissAttention = document.getElementById("btnDismissAttention");

    // Mini Calendar Days
    const miniDayCols = document.querySelectorAll(".mini-day-col");

    // Quick Cards & Header Links
    const cardViewStudyPlan = document.getElementById("cardViewStudyPlan");
    const btnHeaderStudyPlan = document.getElementById("btnHeaderStudyPlan");
    const cardEditSchedule = document.getElementById("cardEditSchedule");
    const cardResumeSession = document.getElementById("cardResumeSession");
    const linkCourseTrack = document.getElementById("linkCourseTrack");
    const linkFullSchedule = document.getElementById("linkFullSchedule");

    // Sidebar navigation items
    const navItems = document.querySelectorAll(".nav-item");
    const recentConvos = document.querySelectorAll(".recent-item");
    const navSettings = document.getElementById("navSettings");
    const userProfile = document.getElementById("userProfile");

    // =========================================================
    // 1. THEME SWITCHER (PREVIEW TOGGLE)
    // =========================================================
    if (btnThemeDark && btnThemeLight) {
        btnThemeDark.addEventListener("click", () => {
            state.theme = "dark";
            body.classList.add("dark-preview");
            btnThemeDark.classList.add("active");
            btnThemeDark.setAttribute("aria-checked", "true");
            btnThemeLight.classList.remove("active");
            btnThemeLight.setAttribute("aria-checked", "false");
            showToast("Dark Theme preview mode activated.");
        });

        btnThemeLight.addEventListener("click", () => {
            state.theme = "light";
            body.classList.remove("dark-preview");
            btnThemeLight.classList.add("active");
            btnThemeLight.setAttribute("aria-checked", "true");
            btnThemeDark.classList.remove("active");
            btnThemeDark.setAttribute("aria-checked", "false");
            showToast("Light Theme restored.");
        });
    }

    // =========================================================
    // 2. TODAY'S PRIORITIES CHECKBOXES
    // =========================================================
    const checkboxes = document.querySelectorAll(".task-checkbox");
    checkboxes.forEach(cb => {
        const row = cb.closest(".priority-row");
        const id = row ? row.dataset.id : null;

        cb.addEventListener("change", () => {
            if (id) {
                state.priorities[id] = cb.checked;
            }
            if (cb.checked) {
                showToast("Task completed.");
            }
        });
    });

    // =========================================================
    // 3. WEEKLY CALENDAR DATE SELECTION
    // =========================================================
    miniDayCols.forEach(col => {
        col.addEventListener("click", (e) => {
            e.preventDefault();
            miniDayCols.forEach(c => c.classList.remove("active-today-pill"));
            col.classList.add("active-today-pill");
            const day = col.dataset.day || "day";
            const dateNum = col.querySelector(".mini-date-num")?.textContent || "";
            state.selectedDay = day;
            showToast(`Selected ${day.toUpperCase()} ${dateNum}.`);
        });
    });

    // =========================================================
    // 4. RESCHEDULE MODAL LOGIC
    // =========================================================
    function openRescheduleModal() {
        if (!rescheduleModal) return;
        rescheduleModal.classList.add("open");
        rescheduleModal.setAttribute("aria-hidden", "false");
    }

    function closeRescheduleModal() {
        if (!rescheduleModal) return;
        rescheduleModal.classList.remove("open");
        rescheduleModal.setAttribute("aria-hidden", "true");
    }

    if (btnDashReschedule) {
        btnDashReschedule.addEventListener("click", openRescheduleModal);
    }

    if (linkChooseNewTime) {
        linkChooseNewTime.addEventListener("click", (e) => {
            e.preventDefault();
            openRescheduleModal();
        });
    }

    if (btnCloseReschedule) {
        btnCloseReschedule.addEventListener("click", closeRescheduleModal);
    }

    if (btnCancelReschedule) {
        btnCancelReschedule.addEventListener("click", closeRescheduleModal);
    }

    if (rescheduleModal) {
        rescheduleModal.addEventListener("click", (e) => {
            if (e.target === rescheduleModal) {
                closeRescheduleModal();
            }
        });
    }

    // Handle slot radio selection
    if (rescheduleSlotList) {
        const slotLabels = rescheduleSlotList.querySelectorAll(".slot-option");
        slotLabels.forEach(label => {
            label.addEventListener("click", () => {
                slotLabels.forEach(l => l.classList.remove("active"));
                label.classList.add("active");
            });
        });
    }

    if (btnConfirmReschedule) {
        btnConfirmReschedule.addEventListener("click", () => {
            const selectedSlot = document.querySelector('input[name="rescheduleSlot"]:checked');
            const slotVal = selectedSlot ? selectedSlot.value : "Tomorrow 7:00 PM";
            state.sessionState = "rescheduled";
            state.sessionTime = slotVal;

            if (dashSessionBadge) {
                dashSessionBadge.textContent = "Rescheduled";
            }
            const timeLabel = document.querySelector(".focus-time-label");
            if (timeLabel) {
                timeLabel.textContent = slotVal;
            }

            closeRescheduleModal();
            showToast(`Session rescheduled to ${slotVal}.`);
        });
    }

    // =========================================================
    // 5. START STUDY SESSION ACTION
    // =========================================================
    if (btnDashStartSession) {
        btnDashStartSession.addEventListener("click", () => {
            if (state.sessionState === "not_started" || state.sessionState === "rescheduled") {
                state.sessionState = "in_progress";
                btnDashStartText.textContent = "In Progress";
                btnDashStartSession.style.background = "#059669";
                if (dashSessionBadge) {
                    dashSessionBadge.textContent = "In progress now";
                }
                showToast("Study session started for Week 1 · Problem Set 1.");
            } else {
                showToast("Study session is currently active.");
            }
        });
    }

    // =========================================================
    // 6. ATTENTION CARD ACTIONS
    // =========================================================
    if (btnAcceptSundayBuffer) {
        btnAcceptSundayBuffer.addEventListener("click", () => {
            if (attentionCard) {
                attentionCard.style.opacity = "0.4";
                attentionCard.style.pointerEvents = "none";
                setTimeout(() => {
                    attentionCard.style.display = "none";
                }, 300);
            }
            showToast("Accepted: Sunday buffer slot (1 Nov, 10:00 AM) scheduled.");
        });
    }

    if (btnDismissAttention) {
        btnDismissAttention.addEventListener("click", () => {
            if (attentionCard) {
                attentionCard.style.opacity = "0";
                setTimeout(() => {
                    attentionCard.style.display = "none";
                }, 250);
            }
            showToast("Alert dismissed.");
        });
    }

    // =========================================================
    // 7. ASSISTANT DRAWER DEMONSTRATION LOGIC
    // =========================================================
    function openAssistantDrawer() {
        if (!assistantDrawer) return;
        assistantDrawer.classList.add("open");
        assistantDrawer.setAttribute("aria-hidden", "false");
        if (assistantDrawerBackdrop) {
            assistantDrawerBackdrop.classList.add("open");
            assistantDrawerBackdrop.setAttribute("aria-hidden", "false");
        }
        if (drawerChatInput && typeof drawerChatInput.focus === "function") {
            setTimeout(() => drawerChatInput.focus(), 200);
        }
    }

    function closeAssistantDrawer() {
        if (!assistantDrawer) return;
        assistantDrawer.classList.remove("open");
        assistantDrawer.setAttribute("aria-hidden", "true");
        if (assistantDrawerBackdrop) {
            assistantDrawerBackdrop.classList.remove("open");
            assistantDrawerBackdrop.setAttribute("aria-hidden", "true");
        }
    }

    // Triggers for opening drawer
    if (sidebarAskBtn) sidebarAskBtn.addEventListener("click", openAssistantDrawer);
    if (btnHeaderAsk) btnHeaderAsk.addEventListener("click", openAssistantDrawer);
    if (cardAskStudentOS) cardAskStudentOS.addEventListener("click", openAssistantDrawer);
    if (floatingWidget) floatingWidget.addEventListener("click", openAssistantDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener("click", closeAssistantDrawer);
    if (assistantDrawerBackdrop) assistantDrawerBackdrop.addEventListener("click", closeAssistantDrawer);

    // Chat submit
    if (drawerChatForm) {
        drawerChatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = drawerChatInput.value.trim();
            if (!text) return;

            // Append user bubble
            appendChatBubble(text, "user");
            drawerChatInput.value = "";

            // Simulate assistant response
            setTimeout(() => {
                const reply = generateAssistantReply(text);
                appendChatBubble(reply, "assistant");
            }, 600);
        });
    }

    // Quick chip prompts
    const quickChips = document.querySelectorAll(".quick-chip");
    quickChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const prompt = chip.dataset.prompt || chip.textContent;
            appendChatBubble(prompt, "user");
            setTimeout(() => {
                const reply = generateAssistantReply(prompt);
                appendChatBubble(reply, "assistant");
            }, 600);
        });
    });

    function appendChatBubble(text, sender) {
        if (!drawerChatHistory) return;
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-msg ${sender}`;

        if (sender === "assistant") {
            msgDiv.innerHTML = `
                <div class="msg-avatar">
                    <img src="assets/StudentOS_symbol.png" alt="StudentOS">
                </div>
                <div class="msg-bubble">
                    <p>${escapeHtml(text)}</p>
                </div>
            `;
        } else {
            msgDiv.innerHTML = `
                <div class="msg-bubble">
                    <p>${escapeHtml(text)}</p>
                </div>
            `;
        }

        drawerChatHistory.appendChild(msgDiv);
        drawerChatHistory.scrollTop = drawerChatHistory.scrollHeight;
    }

    function generateAssistantReply(query) {
        const q = query.toLowerCase();
        if (q.includes("deadlines") || q.includes("due")) {
            return "Your next major deadline is CS50P Week 1 Problem Set, due Sunday, 1 November at 11:59 PM (3 days left).";
        }
        if (q.includes("problem set 1") || q.includes("start")) {
            return "For Problem Set 1, start with 'Indoor Voice' (prompting for input and using .lower()) before moving to 'Playback Speed' (.replace(' ', '...')). You can start your session from the dashboard!";
        }
        if (q.includes("string") || q.includes("method")) {
            return "Key Python string methods for Week 1 include .strip(), .lower(), .title(), and .replace(old, new). They return new strings without modifying the original in-place.";
        }
        return `I've noted that! StudentOS is tracking your CS50P Week 1 schedule. Would you like me to adjust any session or remind you before tonight's 8:00 PM session?`;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // =========================================================
    // 8. PREVIEW TOAST FEEDBACK FOR EXTERNAL ROUTES
    // =========================================================
    function showToast(msg) {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = msg;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.25s ease";
            setTimeout(() => toast.remove(), 250);
        }, 2600);
    }

    // Attach informative feedback to preview actions
    const previewActions = [
        { el: cardViewStudyPlan, msg: "Study Plan view (Preview: standalone Light Theme Dashboard)" },
        { el: btnHeaderStudyPlan, msg: "Study Plan view (Preview: standalone Light Theme Dashboard)" },
        { el: cardEditSchedule, msg: "Schedule view (Preview: standalone Light Theme Dashboard)" },
        { el: cardResumeSession, msg: "Resuming session: Problem Set 1 loaded." },
        { el: linkCourseTrack, msg: "Courses & Goals view (Preview: standalone Light Theme Dashboard)" },
        { el: linkFullSchedule, msg: "Schedule calendar view (Preview: standalone Light Theme Dashboard)" },
        { el: navSettings, msg: "Settings panel (Preview: standalone Light Theme Dashboard)" },
        { el: userProfile, msg: "User profile: Aarav Mehta (B.Tech CSE · Year 2)" }
    ];

    previewActions.forEach(({ el, msg }) => {
        if (el) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                showToast(msg);
            });
        }
    });

    // Inactive Sidebar Nav Items
    navItems.forEach(item => {
        if (item.id !== "sidebarNavDashboard") {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const name = item.querySelector("span")?.textContent || "Page";
                showToast(`${name} view (Preview: standalone Light Theme Dashboard)`);
            });
        }
    });

    // Recent conversations
    recentConvos.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            openAssistantDrawer();
            appendChatBubble(`Opening recent conversation: "${item.textContent.trim()}"`, "assistant");
        });
    });
});
