/**
 * StudentOS — Study Plan Interactive Controller
 * Unified Multi-View Flow:
 * 1. View A: Study Plan Overview (Starting page)
 * 2. View B: Edit Plan Preferences (Dynamic diff tracking & commitment modal)
 * 3. View C: Edit Your Schedule (Moved Friday session, Edit session panel, Discard / Save)
 * 4. View D: Review Your Study Plan (3rd UI: Rationale, Suggestions, Edit & Accept Plan)
 * 5. View E: Plan Accepted & Saved (4th UI: Plan saved summary & Start first study session)
 * 6. Assistant Drawer & Real-Time Dynamic Toast Feedback
 */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================
    // 1. ALL 5 VIEWS & SEAMLESS SWITCHING
    // =========================================================
    const aiAssistantView = document.getElementById("aiAssistantView");
    const studyPlanView = document.getElementById("studyPlanView");
    const editPreferencesView = document.getElementById("editPreferencesView");
    const editScheduleView = document.getElementById("editScheduleView");
    const reviewPlanView = document.getElementById("reviewPlanView");
    const planAcceptedView = document.getElementById("planAcceptedView");
    const mainScheduleView = document.getElementById("mainScheduleView");
    const coursesGoalsView = document.getElementById("coursesGoalsView");
    const dashboardView = document.getElementById("dashboardView");
    const sidebarNavDashboard = document.getElementById("sidebarNavDashboard");

    const views = {
        aiAssistant: aiAssistantView,
        dashboard: dashboardView,
        plan: studyPlanView,
        preferences: editPreferencesView,
        schedule: editScheduleView,
        review: reviewPlanView,
        accepted: planAcceptedView,
        mainSchedule: mainScheduleView,
        coursesGoals: coursesGoalsView
    };

    const sidebarNavStudyPlan = document.getElementById("sidebarNavStudyPlan");
    const sidebarNavSchedule = document.getElementById("sidebarNavSchedule");

    function updateSidebarNav(viewKey) {
        const navCoursesGoals = document.getElementById("navCoursesGoals");

        // Clear all active indicators
        if (sidebarNavDashboard) {
            sidebarNavDashboard.classList.remove("active");
            sidebarNavDashboard.removeAttribute("aria-current");
        }
        if (sidebarNavStudyPlan) {
            sidebarNavStudyPlan.classList.remove("active");
            sidebarNavStudyPlan.removeAttribute("aria-current");
        }
        if (sidebarNavSchedule) {
            sidebarNavSchedule.classList.remove("active");
            sidebarNavSchedule.removeAttribute("aria-current");
        }
        if (navCoursesGoals) {
            navCoursesGoals.classList.remove("active");
            navCoursesGoals.removeAttribute("aria-current");
        }

        const navAssistant = document.getElementById("navAssistant");
        if (navAssistant) {
            navAssistant.classList.remove("active");
            navAssistant.removeAttribute("aria-current");
        }

        if (viewKey === "aiAssistant") {
            if (navAssistant) {
                navAssistant.classList.add("active");
                navAssistant.setAttribute("aria-current", "page");
            }
            try {
                if (window.location.hash !== "#aiAssistant" && window.location.hash !== "") {
                    history.replaceState(null, null, " ");
                }
            } catch (err) {}
        } else if (viewKey === "dashboard") {
            if (sidebarNavDashboard) {
                sidebarNavDashboard.classList.add("active");
                sidebarNavDashboard.setAttribute("aria-current", "page");
            }
            try {
                if (window.location.hash !== "#dashboard") {
                    history.replaceState(null, null, "#dashboard");
                }
            } catch (err) {}
        } else if (viewKey === "mainSchedule") {
            if (sidebarNavSchedule) {
                sidebarNavSchedule.classList.add("active");
                sidebarNavSchedule.setAttribute("aria-current", "page");
            }
            try {
                if (window.location.hash !== "#schedule") {
                    history.replaceState(null, null, "#schedule");
                }
            } catch (err) {}
        } else if (viewKey === "coursesGoals") {
            if (navCoursesGoals) {
                navCoursesGoals.classList.add("active");
                navCoursesGoals.setAttribute("aria-current", "page");
            }
            try {
                if (window.location.hash !== "#courses") {
                    history.replaceState(null, null, "#courses");
                }
            } catch (err) {}
        } else {
            if (sidebarNavStudyPlan) {
                sidebarNavStudyPlan.classList.add("active");
                sidebarNavStudyPlan.setAttribute("aria-current", "page");
            }
            try {
                if (window.location.hash === "#schedule" || window.location.hash === "#courses" || window.location.hash === "#goals" || window.location.hash === "#dashboard") {
                    history.replaceState(null, null, " ");
                }
            } catch (err) {}
        }
    }

    // Toast Notification (Disabled completely per user request)
    const planToast = document.getElementById("planToast");
    let toastTimeout = null;

    function showToast(message) {
        // Disabled: all pop up messages removed per user request
        return;
    }

    function showView(viewKey) {
        const mainContent = document.getElementById("mainContent");
        const aiView = document.getElementById("aiAssistantView");

        if (viewKey === "aiAssistant") {
            if (mainContent) mainContent.hidden = true;
            if (aiView) {
                aiView.hidden = false;
                aiView.classList.add("active-view");
            }
            Object.keys(views).forEach((key) => {
                const panel = views[key];
                if (panel && key !== "aiAssistant") {
                    panel.hidden = true;
                    panel.classList.remove("active-view");
                }
            });
        } else {
            if (aiView) {
                aiView.hidden = true;
                aiView.classList.remove("active-view");
            }
            if (mainContent) mainContent.hidden = false;

            Object.keys(views).forEach((key) => {
                const panel = views[key];
                if (panel && key !== "aiAssistant") {
                    if (key === viewKey) {
                        panel.hidden = false;
                        panel.classList.add("active-view");
                    } else {
                        panel.hidden = true;
                        panel.classList.remove("active-view");
                    }
                }
            });
        }

        updateSidebarNav(viewKey);
        window.scrollTo({ top: 0, behavior: "instant" });

        if (viewKey === "preferences" && typeof updateChangesSummary === "function") {
            updateChangesSummary();
        }
        if (viewKey === "dashboard") {
            if (typeof syncDashboardWithState === "function") {
                syncDashboardWithState();
            } else if (typeof window.syncDashboardWithState === "function") {
                window.syncDashboardWithState();
            }
        }
    }
    window.showView = showView;

    // =========================================================
    // 2. VIEW A: STUDY PLAN OVERVIEW NAVIGATION
    // =========================================================
    const btnEditPreferences = document.getElementById("btnEditPreferences");
    const btnEditSchedule = document.getElementById("btnEditSchedule");
    const linkOpenScheduleOverview = document.getElementById("linkOpenScheduleOverview");
    const btnMoreWeeks = document.getElementById("btnMoreWeeks");

    // Dynamic Display Targets in Main Plan
    const displayTargetDate = document.getElementById("displayTargetDate");
    const displayPace = document.getElementById("displayPace");
    const inputTargetDate = document.getElementById("inputTargetDate");
    const prefChangesText = document.getElementById("prefChangesText");

    let lastViewBeforePreferences = "review";

    if (btnEditPreferences) {
        btnEditPreferences.addEventListener("click", () => {
            lastViewBeforePreferences = "plan";
            showView("preferences");
        });
    }

    if (btnEditSchedule) {
        btnEditSchedule.addEventListener("click", () => {
            showView("schedule");
            showToast("Opening schedule editor for CS50P...");
        });
    }

    if (linkOpenScheduleOverview) {
        linkOpenScheduleOverview.addEventListener("click", (e) => {
            e.preventDefault();
            showView("mainSchedule");
        });
    }

    if (btnMoreWeeks) {
        btnMoreWeeks.addEventListener("click", () => {
            showToast("Curriculum breakdown: All 19 weeks loaded.");
        });
    }

    // Direct Sidebar navigation items for Study Plan and Schedule
    const navAssistant = document.getElementById("navAssistant");
    if (navAssistant) {
        navAssistant.addEventListener("click", (e) => {
            e.preventDefault();
            showView("aiAssistant");
            if (typeof window.navigateToStep === "function") {
                window.navigateToStep("welcome");
            }
        });
    }

    if (sidebarNavStudyPlan) {
        sidebarNavStudyPlan.addEventListener("click", (e) => {
            e.preventDefault();
            showView("plan");
        });
    }

    if (sidebarNavSchedule) {
        sidebarNavSchedule.addEventListener("click", (e) => {
            e.preventDefault();
            showView("mainSchedule");
        });
    }

    const navCoursesGoals = document.getElementById("navCoursesGoals");
    if (navCoursesGoals) {
        navCoursesGoals.addEventListener("click", (e) => {
            e.preventDefault();
            showView("coursesGoals");
        });
    }

    // Courses & Goals interactions
    const btnGoalReview = document.getElementById("btnGoalReview");
    if (btnGoalReview) {
        btnGoalReview.addEventListener("click", () => {
            showView("plan");
        });
    }

    const btnGoalUpdateTarget = document.getElementById("btnGoalUpdateTarget");
    if (btnGoalUpdateTarget) {
        btnGoalUpdateTarget.addEventListener("click", () => {
            showView("preferences");
        });
    }

    const courseRowCs50 = document.getElementById("courseRowCs50");
    if (courseRowCs50) {
        courseRowCs50.addEventListener("click", () => {
            showView("plan");
        });
    }

    const btnGoalCreatePlan = document.getElementById("btnGoalCreatePlan");
    if (btnGoalCreatePlan) {
        btnGoalCreatePlan.addEventListener("click", () => {
            const promptInput = document.getElementById("assistantPromptInput");
            if (promptInput) {
                promptInput.value = "Help me fit revision for the DBMS mid-semester exam around my CS50P sessions.";
            }
            const floatingAskWidget = document.getElementById("floatingAskWidget") || document.getElementById("floatingWidget");
            if (floatingAskWidget) floatingAskWidget.click();
        });
    }

    const btnAddGoal = document.getElementById("btnAddGoal");
    if (btnAddGoal) {
        btnAddGoal.addEventListener("click", () => {
            const commitmentModal = document.getElementById("commitmentModal");
            if (commitmentModal && typeof commitmentModal.showModal === "function") {
                const title = document.getElementById("modalCommitmentTitle");
                if (title) title.textContent = "Add Course / Goal";
                commitmentModal.showModal();
            }
        });
    }

    const brandLink = document.querySelector(".brand-link");
    if (brandLink) {
        brandLink.addEventListener("click", (e) => {
            e.preventDefault();
            showView("dashboard");
        });
    }

    // =========================================================
    // 3. VIEW B: EDIT PLAN PREFERENCES & COMMITMENTS
    // =========================================================
    const btnBackToPlan = document.getElementById("btnBackToPlan");
    const btnCancelPreferences = document.getElementById("btnCancelPreferences");
    const btnRegeneratePlan = document.getElementById("btnRegeneratePlan");

    if (btnBackToPlan) {
        btnBackToPlan.addEventListener("click", (e) => {
            e.preventDefault();
            showView(lastViewBeforePreferences || "review");
        });
    }

    if (btnCancelPreferences) {
        btnCancelPreferences.addEventListener("click", () => {
            showView(lastViewBeforePreferences || "review");
            showToast("Preferences changes discarded.");
        });
    }

    // Baseline preferences
    const baseline = {
        hours: "5–8 h",
        sessionLength: "45 min",
        weekdayEvenings: true,
        saturdayMornings: true,
        saturdayAfternoons: true,
        earlyMornings: false,
        sundayRest: true,
        targetDate: "15 March 2027",
        spread: "evenly"
    };

    let currentHours = "5–8 h";
    let currentSessionLength = "60 min";

    const chkWeekdayEvenings = document.getElementById("chkWeekdayEvenings");
    const chkSaturdayMornings = document.getElementById("chkSaturdayMornings");
    const chkSaturdayAfternoons = document.getElementById("chkSaturdayAfternoons");
    const chkEarlyMornings = document.getElementById("chkEarlyMornings");
    const toggleSundayRest = document.getElementById("toggleSundayRest");
    const spreadRadios = document.querySelectorAll('input[name="spreadSessions"]');

    let addedCommitments = [];
    let removedCommitments = [];
    let editedCommitments = [];

    function updateChangesSummary() {
        if (!prefChangesText) return;

        const changes = [];

        if (currentHours !== baseline.hours) {
            changes.push(`hours ${currentHours}`);
        }

        if (currentSessionLength !== baseline.sessionLength) {
            changes.push(`session length ${currentSessionLength}`);
        }

        if (chkSaturdayAfternoons && !chkSaturdayAfternoons.checked && baseline.saturdayAfternoons) {
            changes.push("Saturday afternoons off");
        } else if (chkSaturdayAfternoons && chkSaturdayAfternoons.checked && !baseline.saturdayAfternoons) {
            changes.push("Saturday afternoons on");
        }

        if (chkWeekdayEvenings && !chkWeekdayEvenings.checked && baseline.weekdayEvenings) {
            changes.push("weekday evenings off");
        }

        if (chkSaturdayMornings && !chkSaturdayMornings.checked && baseline.saturdayMornings) {
            changes.push("Saturday mornings off");
        }

        if (chkEarlyMornings && chkEarlyMornings.checked && !baseline.earlyMornings) {
            changes.push("early mornings on");
        }

        if (toggleSundayRest && !toggleSundayRest.checked && baseline.sundayRest) {
            changes.push("Sunday study enabled");
        }

        const curDate = inputTargetDate ? inputTargetDate.value.trim() : baseline.targetDate;
        if (curDate && curDate !== baseline.targetDate) {
            changes.push(`target date ${curDate}`);
        }

        let curSpread = "evenly";
        spreadRadios.forEach((r) => {
            if (r.checked) curSpread = r.value;
        });
        if (curSpread === "weekends") {
            changes.push("more on weekends");
        } else if (curSpread === "frontload") {
            changes.push("front-load near exams");
        }

        addedCommitments.forEach((name) => {
            changes.push(`added ${name}`);
        });
        removedCommitments.forEach((name) => {
            changes.push(`removed ${name}`);
        });
        editedCommitments.forEach((name) => {
            changes.push(`updated ${name}`);
        });

        if (changes.length === 0) {
            prefChangesText.textContent = "No changes made";
        } else if (changes.length === 1) {
            prefChangesText.textContent = `1 change · ${changes[0]}`;
        } else {
            prefChangesText.textContent = `${changes.length} changes · ${changes.join(", ")}`;
        }
    }

    document.querySelectorAll(".segment-group").forEach((group) => {
        const buttons = group.querySelectorAll(".segment-btn");
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                buttons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");

                const val = btn.textContent.trim();
                if (val.includes("h")) {
                    currentHours = val;
                } else if (val.includes("min")) {
                    currentSessionLength = val;
                }

                updateChangesSummary();
            });
        });
    });

    [chkWeekdayEvenings, chkSaturdayMornings, chkSaturdayAfternoons, chkEarlyMornings, toggleSundayRest].forEach((el) => {
        if (el) {
            el.addEventListener("change", updateChangesSummary);
        }
    });

    spreadRadios.forEach((r) => {
        r.addEventListener("change", updateChangesSummary);
    });

    if (inputTargetDate) {
        inputTargetDate.addEventListener("input", updateChangesSummary);
    }

    // Commitments Modal & List
    const commitmentsList = document.getElementById("commitmentsList");
    const btnAddCommitment = document.getElementById("btnAddCommitment");
    const commitmentModal = document.getElementById("commitmentModal");
    const modalCommitmentTitle = document.getElementById("modalCommitmentTitle");
    const modalCloseCommitmentBtn = document.getElementById("modalCloseCommitmentBtn");
    const btnCancelCommitment = document.getElementById("btnCancelCommitment");
    const commitmentForm = document.getElementById("commitmentForm");
    const commitmentNameInput = document.getElementById("commitmentNameInput");
    const commitmentTimingInput = document.getElementById("commitmentTimingInput");
    const commitmentEditIndex = document.getElementById("commitmentEditIndex");

    let activeEditingItem = null;

    function openCommitmentModal(isEdit = false, itemEl = null) {
        if (!commitmentModal) return;

        if (isEdit && itemEl) {
            activeEditingItem = itemEl;
            modalCommitmentTitle.textContent = "Edit fixed commitment";
            const name = itemEl.querySelector(".commitment-name")?.textContent.trim() || "";
            const timing = itemEl.querySelector(".commitment-timing")?.textContent.trim() || "";
            commitmentNameInput.value = name;
            commitmentTimingInput.value = timing;
            commitmentEditIndex.value = itemEl.id || "edit";
        } else {
            activeEditingItem = null;
            modalCommitmentTitle.textContent = "Add fixed commitment";
            commitmentNameInput.value = "";
            commitmentTimingInput.value = "";
            commitmentEditIndex.value = "-1";
        }

        commitmentModal.showModal();
        commitmentNameInput.focus();
    }

    function closeCommitmentModal() {
        if (!commitmentModal) return;
        commitmentModal.close();
        activeEditingItem = null;
    }

    if (btnAddCommitment) {
        btnAddCommitment.addEventListener("click", () => {
            openCommitmentModal(false);
        });
    }

    if (modalCloseCommitmentBtn) {
        modalCloseCommitmentBtn.addEventListener("click", closeCommitmentModal);
    }

    if (btnCancelCommitment) {
        btnCancelCommitment.addEventListener("click", closeCommitmentModal);
    }

    function attachCommitmentEvents(item) {
        const editBtn = item.querySelector(".btn-edit-commitment");
        const removeBtn = item.querySelector(".btn-remove-commitment");
        const name = item.querySelector(".commitment-name")?.textContent.trim() || "Commitment";

        if (editBtn) {
            editBtn.addEventListener("click", () => {
                openCommitmentModal(true, item);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                const currentName = item.querySelector(".commitment-name")?.textContent.trim() || name;

                if (!removedCommitments.includes(currentName)) {
                    removedCommitments.push(currentName);
                }
                addedCommitments = addedCommitments.filter((n) => n !== currentName);
                editedCommitments = editedCommitments.filter((n) => n !== currentName);

                item.remove();
                updateChangesSummary();
                showToast(`Removed "${currentName}" from fixed commitments.`);
            });
        }
    }

    document.querySelectorAll(".commitment-item").forEach((item) => {
        attachCommitmentEvents(item);
    });

    if (commitmentForm) {
        commitmentForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = commitmentNameInput.value.trim();
            const timing = commitmentTimingInput.value.trim();

            if (!name || !timing) return;

            if (activeEditingItem) {
                const nameEl = activeEditingItem.querySelector(".commitment-name");
                const timingEl = activeEditingItem.querySelector(".commitment-timing");

                if (nameEl) nameEl.textContent = name;
                if (timingEl) timingEl.textContent = timing;

                if (!editedCommitments.includes(name)) {
                    editedCommitments.push(name);
                }

                showToast(`Updated "${name}" commitment.`);
            } else {
                const newItem = document.createElement("div");
                newItem.className = "commitment-item";
                newItem.dataset.name = name;
                newItem.dataset.timing = timing;

                newItem.innerHTML = `
                    <div class="commitment-info">
                        <svg class="commitment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <div class="commitment-texts">
                            <strong class="commitment-name">${escapeHtml(name)}</strong>
                            <span class="commitment-timing">${escapeHtml(timing)}</span>
                        </div>
                    </div>
                    <div class="commitment-actions">
                        <button type="button" class="btn-icon-box btn-edit-commitment" aria-label="Edit commitment" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                        </button>
                        <button type="button" class="btn-icon-box btn-remove-commitment" aria-label="Remove commitment" title="Remove">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                `;

                if (commitmentsList) {
                    commitmentsList.appendChild(newItem);
                }

                attachCommitmentEvents(newItem);

                if (!addedCommitments.includes(name)) {
                    addedCommitments.push(name);
                }

                showToast(`Added "${name}" to fixed commitments.`);
            }

            closeCommitmentModal();
            updateChangesSummary();
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    if (btnRegeneratePlan) {
        btnRegeneratePlan.addEventListener("click", () => {
            const targetDateVal = inputTargetDate?.value.trim() || "15 Mar 2027";
            const paceVal = `4 sessions · ~${currentHours.replace(" h", "")} h / week`;

            // Update Target Date and Pace metrics across views
            if (displayTargetDate) displayTargetDate.textContent = targetDateVal;
            if (displayPace) displayPace.innerHTML = `4 sessions · ~${currentHours.replace(" h", "")}<br>h a week`;

            document.querySelectorAll("#reviewTargetDate, #acceptedTargetDate").forEach((el) => {
                el.textContent = targetDateVal;
            });
            document.querySelectorAll("#reviewPace, #acceptedPace").forEach((el) => {
                el.textContent = paceVal;
            });

            // USER REQUIREMENT:
            // "in edit preferences if regenerate plan is clicked , this page must come remove the other feature and add htis for regenerate plan"
            showView("review"); // Navigates directly to "Review your study plan" (Images 1 & 2)

            showToast("✓ Plan regenerated! Review your suggested study plan.");
            addDrawerMessage(`I have regenerated your study plan based on your preferences (${currentHours}/wk, ${currentSessionLength} sessions, target ${targetDateVal}). Check the suggested schedule and accept whenever you are ready!`);
        });
    }

    // =========================================================
    // 4. VIEW C: EDIT YOUR SCHEDULE (IMAGES 1 & 2)
    // =========================================================
    const btnDiscardScheduleChanges = document.getElementById("btnDiscardScheduleChanges");
    const btnSaveAndReview = document.getElementById("btnSaveAndReview");
    const btnCloseEditSession = document.getElementById("btnCloseEditSession");
    const btnRemoveSessionAction = document.getElementById("btnRemoveSessionAction");
    const btnApplySessionAction = document.getElementById("btnApplySessionAction");
    const scheduleChangeText = document.getElementById("scheduleChangeText");
    const movedSessionBlock = document.querySelector(".moved-session-active");

    // Close session edit panel
    if (btnCloseEditSession) {
        btnCloseEditSession.addEventListener("click", () => {
            const panel = document.querySelector(".edit-session-panel");
            if (panel) {
                panel.style.display = panel.style.display === "none" ? "block" : "none";
            }
        });
    }

    // Remove session action
    if (btnRemoveSessionAction) {
        btnRemoveSessionAction.addEventListener("click", () => {
            if (movedSessionBlock) {
                movedSessionBlock.style.opacity = "0.3";
                movedSessionBlock.style.textDecoration = "line-through";
            }
            if (scheduleChangeText) {
                scheduleChangeText.textContent = "1 change · Problem Set 1 removed from Friday slot";
            }
            showToast("Problem Set 1 removed from Friday schedule.");
        });
    }

    // Apply session action
    if (btnApplySessionAction) {
        btnApplySessionAction.addEventListener("click", () => {
            showToast("✓ Session updated: Friday 30 Oct, 7:00 PM (60 min).");
        });
    }

    /**
     * KEY USER REQUIREMENT:
     * "if i click discard changes the 3rd ui should come"
     */
    if (btnDiscardScheduleChanges) {
        btnDiscardScheduleChanges.addEventListener("click", () => {
            showView("review"); // 3RD UI: Review your study plan
            showToast("Schedule changes discarded. Reviewing suggested plan.");
        });
    }

    if (btnSaveAndReview) {
        btnSaveAndReview.addEventListener("click", () => {
            showView("review"); // 3RD UI: Review your study plan
            showToast("✓ Schedule changes saved. Reviewing suggested plan.");
        });
    }

    // =========================================================
    // 5. VIEW D: 3RD UI — REVIEW YOUR STUDY PLAN (IMAGES 3 & 4)
    // =========================================================
    const btnReviewEditPreferences = document.getElementById("btnReviewEditPreferences");
    const btnReviewEditSchedule = document.getElementById("btnReviewEditSchedule");
    const btnAcceptPlan = document.getElementById("btnAcceptPlan");
    const sideReviewChatForm = document.getElementById("sideReviewChatForm");

    // Review Tabs: Week | List | Milestones
    const tabReviewWeek = document.getElementById("tabReviewWeek");
    const tabReviewList = document.getElementById("tabReviewList");
    const tabReviewMilestones = document.getElementById("tabReviewMilestones");

    const reviewTabWeekContent = document.getElementById("reviewTabWeekContent");
    const reviewTabListContent = document.getElementById("reviewTabListContent");
    const reviewTabMilestonesContent = document.getElementById("reviewTabMilestonesContent");

    function setReviewSubTab(activeTabName) {
        const tabs = [
            { name: "week", btn: tabReviewWeek, content: reviewTabWeekContent },
            { name: "list", btn: tabReviewList, content: reviewTabListContent },
            { name: "milestones", btn: tabReviewMilestones, content: reviewTabMilestonesContent }
        ];

        tabs.forEach((tab) => {
            if (tab.btn) {
                if (tab.name === activeTabName) {
                    tab.btn.classList.add("active");
                } else {
                    tab.btn.classList.remove("active");
                }
            }
            if (tab.content) {
                tab.content.hidden = (tab.name !== activeTabName);
            }
        });
    }

    if (tabReviewWeek) {
        tabReviewWeek.addEventListener("click", () => {
            setReviewSubTab("week");
            showToast("Showing weekly schedule calendar.");
        });
    }

    if (tabReviewList) {
        tabReviewList.addEventListener("click", () => {
            setReviewSubTab("list");
            showToast("Showing detailed session breakdown list.");
        });
    }

    if (tabReviewMilestones) {
        tabReviewMilestones.addEventListener("click", () => {
            setReviewSubTab("milestones");
            showToast("Showing 4-phase course milestones.");
        });
    }

    // Week Navigation Arrows (< and >)
    const btnReviewPrevWeek = document.getElementById("btnReviewPrevWeek");
    const btnReviewNextWeek = document.getElementById("btnReviewNextWeek");
    const reviewWeekLabel = document.getElementById("reviewWeekLabel");

    let currentWeekIndex = 1;
    const weekRanges = [
        "Week 1 of 19 · 26 Oct – 1 Nov",
        "Week 2 of 19 · 2 Nov – 8 Nov",
        "Week 3 of 19 · 9 Nov – 15 Nov",
        "Week 4 of 19 · 16 Nov – 22 Nov",
        "Week 5 of 19 · 23 Nov – 29 Nov"
    ];

    if (btnReviewPrevWeek) {
        btnReviewPrevWeek.addEventListener("click", () => {
            if (currentWeekIndex > 1) {
                currentWeekIndex--;
                if (reviewWeekLabel) reviewWeekLabel.textContent = weekRanges[currentWeekIndex - 1];
                showToast(`Viewing ${weekRanges[currentWeekIndex - 1]}`);
            } else {
                showToast("Already at Week 1 (Curriculum start).");
            }
        });
    }

    if (btnReviewNextWeek) {
        btnReviewNextWeek.addEventListener("click", () => {
            if (currentWeekIndex < weekRanges.length) {
                currentWeekIndex++;
                if (reviewWeekLabel) reviewWeekLabel.textContent = weekRanges[currentWeekIndex - 1];
                showToast(`Viewing ${weekRanges[currentWeekIndex - 1]}`);
            } else {
                showToast("Viewing next block in the 19-week plan.");
            }
        });
    }

    // Interactive Suggestion Buttons
    const btnMoveSaturday = document.getElementById("btnMoveSaturday");
    const btnShorterSessions = document.getElementById("btnShorterSessions");
    const btnAddRevisionWeek = document.getElementById("btnAddRevisionWeek");

    if (btnMoveSaturday) {
        btnMoveSaturday.addEventListener("click", () => {
            const satBlock = document.getElementById("satSessionBlock");
            const satTime = document.getElementById("satSessionTime");
            const timeSatSession = document.getElementById("timeSatSession");

            if (satBlock) {
                satBlock.style.top = "25%"; // shift to 11 AM
            }
            if (satTime) {
                satTime.textContent = "11 AM–12:30 PM";
            }
            if (timeSatSession) {
                timeSatSession.textContent = "Sat 31 Oct · 11:00 AM";
            }
            showToast("✓ Moved Saturday session to 11:00 AM.");
            addDrawerMessage("I've shifted your Saturday study session to 11:00 AM – 12:30 PM as requested!");
        });
    }

    if (btnShorterSessions) {
        btnShorterSessions.addEventListener("click", () => {
            showToast("✓ Sessions shortened to 45 min each.");
            addDrawerMessage("I've trimmed session targets to 45 minutes each. Your schedule will add micro-sessions to keep your 8 Mar finish date.");
        });
    }

    if (btnAddRevisionWeek) {
        btnAddRevisionWeek.addEventListener("click", () => {
            showToast("✓ Revision week added before the CS50P final project.");
            addDrawerMessage("Added a dedicated revision & practice week before Week 9 so you can thoroughly review all core concepts.");
        });
    }

    if (btnReviewEditPreferences) {
        btnReviewEditPreferences.addEventListener("click", () => {
            lastViewBeforePreferences = "review";
            showView("preferences");
        });
    }

    if (btnReviewEditSchedule) {
        btnReviewEditSchedule.addEventListener("click", () => {
            showView("schedule");
        });
    }

    /**
     * KEY USER REQUIREMENT:
     * "and there in that page if i click save plan the 4th ui must come do this much"
     */
    if (btnAcceptPlan) {
        btnAcceptPlan.addEventListener("click", () => {
            showView("accepted"); // 4TH UI: Your study plan is on your schedule
            showToast("🎉 Plan accepted! 76 sessions added to your schedule.");
            addDrawerMessage("Your CS50P study plan is officially accepted and saved to your calendar! Your first session begins Mon 26 Oct at 7:00 PM.");
        });
    }

    // Also support any element with save-plan intention
    document.querySelectorAll(".btn-accept-cyan, [data-action='save-plan']").forEach((btn) => {
        if (btn !== btnAcceptPlan) {
            btn.addEventListener("click", () => {
                showView("accepted");
                showToast("🎉 Plan accepted and saved!");
            });
        }
    });

    // Assistant Suggestions in 3rd UI
    document.querySelectorAll(".suggestion-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const prompt = btn.textContent.trim();
            showToast(`Applying suggestion: "${prompt}"...`);
            openDrawer(prompt);
        });
    });

    if (sideReviewChatForm) {
        sideReviewChatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = sideReviewChatForm.querySelector(".drawer-input");
            const val = input ? input.value.trim() : "";
            if (!val) return;

            openDrawer();
            addDrawerMessage(val, true);
            if (input) input.value = "";

            setTimeout(() => {
                const lower = val.toLowerCase();
                if (lower.includes("saturday") || lower.includes("weekend")) {
                    addDrawerMessage("Saturday study sessions are currently set for 10:00 AM. You can use the 'Move Saturday to 11 AM' quick button above to adjust!");
                } else if (lower.includes("exam") || lower.includes("revision")) {
                    addDrawerMessage("I've planned your review milestone by 13 Dec for midterm unit tests, and a dedicated buffer week before your final project.");
                } else {
                    addDrawerMessage(`Regarding "${val}": CS50P sessions are balanced after college and skip gym nights. You're on track to finish 1 week early on 8 Mar 2027.`);
                }
            }, 450);
        });
    }

    // =========================================================
    // 6. VIEW E: 4TH UI — PLAN ACCEPTED VIEW (IMAGE 5)
    // =========================================================
    // VIEW E: PLAN ACCEPTED & LECTURE 1 INTERACTIVE PANEL
    // =========================================================
    const btnStartFirstSession = document.getElementById("btnStartFirstSession");
    const btnAcceptedViewSchedule = document.getElementById("btnAcceptedViewSchedule");
    const btnAcceptedGoDashboard = document.getElementById("btnAcceptedGoDashboard");
    const acceptedMonLecture1 = document.getElementById("acceptedMonLecture1");
    const acceptedWedLecture1 = document.getElementById("acceptedWedLecture1");
    const lecture1DetailDrawer = document.getElementById("lecture1DetailDrawer");
    const btnCloseLecture1Drawer = document.getElementById("btnCloseLecture1Drawer");
    const btnDrawerCloseAction = document.getElementById("btnDrawerCloseAction");
    const btnDrawerStartSession = document.getElementById("btnDrawerStartSession");
    const firstSessionCard = document.querySelector(".first-session-card");

    function openLecture1Drawer() {
        if (lecture1DetailDrawer) {
            lecture1DetailDrawer.hidden = false;
            showToast("Opening session details for Lecture 1 · Functions, variables");
        }
    }

    function closeLecture1Drawer() {
        if (lecture1DetailDrawer) {
            lecture1DetailDrawer.hidden = true;
        }
    }

    // Calendar session block click: Lecture 1 (Mon 26 Oct)
    if (acceptedMonLecture1) {
        acceptedMonLecture1.addEventListener("click", () => {
            openLecture1Drawer();
        });
    }

    // Calendar session block click: Lecture 1 part 2 (Wed 28 Oct)
    if (acceptedWedLecture1) {
        acceptedWedLecture1.addEventListener("click", () => {
            openLecture1Drawer();
        });
    }

    // First session card click
    if (firstSessionCard) {
        firstSessionCard.addEventListener("click", (e) => {
            if (e.target.closest("#btnStartFirstSession")) return; // Let start button handle its own click
            openLecture1Drawer();
        });
    }

    // Drawer close buttons
    if (btnCloseLecture1Drawer) {
        btnCloseLecture1Drawer.addEventListener("click", closeLecture1Drawer);
    }
    if (btnDrawerCloseAction) {
        btnDrawerCloseAction.addEventListener("click", closeLecture1Drawer);
    }

    // Start session action from drawer
    if (btnDrawerStartSession) {
        btnDrawerStartSession.addEventListener("click", () => {
            closeLecture1Drawer();
            showToast("🚀 Starting study session: Lecture 1 · Functions, variables! Timer is running.");
            openDrawer("I've started your study session for 'Lecture 1 · Functions, variables'. I'm here if you have questions while taking notes!");
        });
    }

    if (btnStartFirstSession) {
        btnStartFirstSession.addEventListener("click", () => {
            showToast("🚀 Starting study session: Lecture 1 · Functions, variables! Timer is running.");
            openDrawer("I've started your study session for 'Lecture 1 · Functions, variables'. I'm here if you have questions while taking notes!");
        });
    }

    if (btnAcceptedViewSchedule) {
        btnAcceptedViewSchedule.addEventListener("click", () => {
            showView("mainSchedule");
        });
    }

    if (btnAcceptedGoDashboard) {
        btnAcceptedGoDashboard.addEventListener("click", () => {
            window.location.href = "Overview.html";
        });
    }

    // Accepted Plan Tabs: Week | List | Milestones
    const tabAcceptedWeek = document.getElementById("tabAcceptedWeek");
    const tabAcceptedList = document.getElementById("tabAcceptedList");
    const tabAcceptedMilestones = document.getElementById("tabAcceptedMilestones");
    const acceptedTabWeekContent = document.getElementById("acceptedTabWeekContent");
    const acceptedTabListContent = document.getElementById("acceptedTabListContent");
    const acceptedTabMilestonesContent = document.getElementById("acceptedTabMilestonesContent");

    function setAcceptedSubTab(activeTabName) {
        const tabs = [
            { name: "week", btn: tabAcceptedWeek, content: acceptedTabWeekContent },
            { name: "list", btn: tabAcceptedList, content: acceptedTabListContent },
            { name: "milestones", btn: tabAcceptedMilestones, content: acceptedTabMilestonesContent }
        ];

        tabs.forEach((tab) => {
            if (tab.btn) {
                tab.btn.classList.toggle("active", tab.name === activeTabName);
            }
            if (tab.content) {
                tab.content.hidden = (tab.name !== activeTabName);
            }
        });
    }

    if (tabAcceptedWeek) {
        tabAcceptedWeek.addEventListener("click", () => {
            setAcceptedSubTab("week");
            showToast("Showing weekly schedule calendar.");
        });
    }

    if (tabAcceptedList) {
        tabAcceptedList.addEventListener("click", () => {
            setAcceptedSubTab("list");
            showToast("Showing detailed session breakdown list.");
        });
    }

    if (tabAcceptedMilestones) {
        tabAcceptedMilestones.addEventListener("click", () => {
            setAcceptedSubTab("milestones");
            showToast("Showing 4-phase course milestones.");
        });
    }

    // Accepted Week Navigation Arrows
    const btnAcceptedPrevWeek = document.getElementById("btnAcceptedPrevWeek");
    const btnAcceptedNextWeek = document.getElementById("btnAcceptedNextWeek");
    const acceptedWeekLabel = document.getElementById("acceptedWeekLabel");
    let currentAcceptedWeekIndex = 1;

    if (btnAcceptedPrevWeek) {
        btnAcceptedPrevWeek.addEventListener("click", () => {
            if (currentAcceptedWeekIndex > 1) {
                currentAcceptedWeekIndex--;
                if (acceptedWeekLabel) acceptedWeekLabel.textContent = weekRanges[currentAcceptedWeekIndex - 1];
                showToast(`Viewing ${weekRanges[currentAcceptedWeekIndex - 1]}`);
            } else {
                showToast("Already at Week 1 (Curriculum start).");
            }
        });
    }

    if (btnAcceptedNextWeek) {
        btnAcceptedNextWeek.addEventListener("click", () => {
            if (currentAcceptedWeekIndex < weekRanges.length) {
                currentAcceptedWeekIndex++;
                if (acceptedWeekLabel) acceptedWeekLabel.textContent = weekRanges[currentAcceptedWeekIndex - 1];
                showToast(`Viewing ${weekRanges[currentAcceptedWeekIndex - 1]}`);
            } else {
                showToast("Viewing next block in the 19-week plan.");
            }
        });
    }

    // =========================================================
    // 7. FLOATING WIDGET & ASSISTANT DRAWER CONTROLLER
    // =========================================================
    const btnRevisePlan = document.getElementById("btnRevisePlan");
    const sidebarAskBtn = document.getElementById("sidebarAskBtn");
    const openAssistantBtn = document.getElementById("openAssistantBtn");
    const assistantDrawer = document.getElementById("assistantDrawer");
    const drawerCloseBtn = document.getElementById("drawerCloseBtn");
    const drawerChatForm = document.getElementById("drawerChatForm");
    const drawerChatInput = document.getElementById("drawerChatInput");
    const drawerChatHistory = document.getElementById("drawerChatHistory");

    function openDrawer(initialPrompt = "") {
        if (!assistantDrawer) return;
        assistantDrawer.classList.add("is-open");
        assistantDrawer.setAttribute("aria-hidden", "false");

        if (initialPrompt && drawerChatInput) {
            drawerChatInput.value = initialPrompt;
            drawerChatInput.focus();
        } else if (drawerChatInput) {
            drawerChatInput.focus();
        }
    }

    function closeDrawer() {
        if (!assistantDrawer) return;
        assistantDrawer.classList.remove("is-open");
        assistantDrawer.setAttribute("aria-hidden", "true");
    }

    if (openAssistantBtn) {
        openAssistantBtn.addEventListener("click", () => {
            if (assistantDrawer && assistantDrawer.classList.contains("is-open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });
    }

    if (drawerCloseBtn) {
        drawerCloseBtn.addEventListener("click", closeDrawer);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && assistantDrawer && assistantDrawer.classList.contains("is-open")) {
            closeDrawer();
        }
    });

    if (btnRevisePlan) {
        btnRevisePlan.addEventListener("click", () => {
            openDrawer("I'd like to revise my study schedule for CS50P.");
            showToast("Opening StudentOS revision assistant...");
        });
    }

    if (sidebarAskBtn) {
        sidebarAskBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof window.openAiAssistantView === "function") {
                window.openAiAssistantView();
            } else {
                showView("aiAssistant");
            }
        });
    }

    function addDrawerMessage(text, isUser = false) {
        if (!drawerChatHistory) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-msg ${isUser ? "user" : "assistant"}`;

        if (!isUser) {
            const strong = document.createElement("strong");
            strong.textContent = "StudentOS:";
            msgDiv.appendChild(strong);
        }

        const p = document.createElement("p");
        p.textContent = text;
        msgDiv.appendChild(p);

        drawerChatHistory.appendChild(msgDiv);
        drawerChatHistory.scrollTop = drawerChatHistory.scrollHeight;
    }

    if (drawerChatForm && drawerChatInput) {
        drawerChatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = drawerChatInput.value.trim();
            if (!text) return;

            addDrawerMessage(text, true);
            drawerChatInput.value = "";

            setTimeout(() => {
                const lower = text.toLowerCase();
                if (lower.includes("preference") || lower.includes("pace")) {
                    addDrawerMessage("You can edit your pace or session duration anytime by clicking 'Edit preferences' in the top action bar.");
                } else if (lower.includes("commitment") || lower.includes("gym") || lower.includes("dbms")) {
                    addDrawerMessage("Your fixed commitments (College, Gym, DBMS exam) are protected. Study sessions will never overlap with them.");
                } else if (lower.includes("schedule") || lower.includes("friday") || lower.includes("move")) {
                    addDrawerMessage("You can drag sessions or customize times directly in the 'Edit schedule' view.");
                } else {
                    addDrawerMessage(`Understood! I've noted: "${text}". Your study plan remains locked to your 8 Mar 2027 completion target.`);
                }
            }, 450);
        });
    }


        // =========================================================
    // 7. MAIN SCHEDULE WORKSPACE LOGIC (FIGMA EXACT MATCH)
    // =========================================================
    // =========================================================
    // 7. MAIN SCHEDULE WORKSPACE LOGIC (FIGMA EXACT MATCH)
    // =========================================================
    function initScheduleWorkspace() {

        // =========================================================
        // A. DATA STORE: 7-DAY SCHEDULES (FIGMA DAY VIEW MATCH)
        // =========================================================
        const dayScheduleData = {
            mon: {
                id: "mon",
                dayName: "Monday",
                title: "Monday, 26 October",
                navDate: "Mon 26 Oct",
                isToday: false,
                timeline: [
                    { time: "9:00 AM", title: "College", meta: "9:00 AM – 4:30 PM · fixed", type: "commitment" },
                    { time: "7:00 PM", title: "Week 1 · Lecture 1 Functions, variables", meta: "7:00 – 8:00 PM · 60 min · Completed", type: "completed" },
                    { time: "9:00 PM", text: "Wind down — Nothing scheduled after 9 PM", type: "winddown" }
                ],
                tasksHeading: "Monday's tasks",
                tasks: [
                    { text: "Watch CS50P Lecture 1", checked: true },
                    { text: "Take core concept notes", checked: true },
                    { text: "Run print() REPL examples", checked: true }
                ],
                glanceHeading: "Monday at a glance",
                glance: {
                    planned: "60 min (Completed)",
                    free: "4:30 – 11:00 PM",
                    nextRest: "Sunday 1 Nov"
                }
            },
            tue: {
                id: "tue",
                dayName: "Tuesday",
                title: "Tuesday, 27 October",
                navDate: "Tue 27 Oct",
                isToday: false,
                timeline: [
                    { time: "9:00 AM", title: "College", meta: "9:00 AM – 4:30 PM · fixed", type: "commitment" },
                    { time: "6:00 PM", title: "Gym", meta: "6:00 – 7:30 PM · fixed", type: "commitment" },
                    { time: "8:00 PM", title: "Python REPL Practice", meta: "8:00 – 9:00 PM · Optional", type: "optional" },
                    { time: "9:00 PM", text: "Wind down — Nothing scheduled after 9 PM", type: "winddown" }
                ],
                tasksHeading: "Tuesday's tasks",
                tasks: [
                    { text: "Gym strength workout", checked: true },
                    { text: "Review Python functions notes", checked: false },
                    { text: "Prep for Wednesday session", checked: false }
                ],
                glanceHeading: "Tuesday at a glance",
                glance: {
                    planned: "Optional 60 min",
                    free: "4:30 – 11:00 PM",
                    nextRest: "Sunday 1 Nov"
                }
            },
            wed: {
                id: "wed",
                dayName: "Wednesday",
                title: "Wednesday, 28 October",
                navDate: "Wed 28 Oct",
                isToday: false,
                timeline: [
                    { time: "9:00 AM", title: "College", meta: "9:00 AM – 4:30 PM · fixed", type: "commitment" },
                    { time: "7:00 PM", title: "Week 1 · Lecture 1 part 2 + shorts", meta: "7:00 – 8:30 PM · 90 min · Missed", type: "missed" },
                    { time: "9:00 PM", text: "Wind down — Buffer slot suggested on Sunday", type: "winddown" }
                ],
                tasksHeading: "Wednesday's tasks",
                tasks: [
                    { text: "Return values review", checked: false },
                    { text: "f-strings practice exercises", checked: false },
                    { text: "Move session to Sunday buffer", checked: false }
                ],
                glanceHeading: "Wednesday at a glance",
                glance: {
                    planned: "90 min (Missed)",
                    free: "4:30 – 11:00 PM",
                    nextRest: "Sunday 1 Nov"
                }
            },
            thu: {
                id: "thu",
                dayName: "Thursday",
                title: "Thursday, 29 October",
                navDate: "Today · Thu 29 Oct",
                isToday: true,
                timeline: [
                    { time: "9:00 AM", title: "College", meta: "9:00 AM – 4:30 PM · fixed", type: "commitment" },
                    { time: "6:00 PM", title: "Gym", meta: "6:00 – 7:30 PM · fixed", type: "commitment" },
                    { time: "7:40 PM", title: "Recap: Lecture 1", meta: "20 min · optional", type: "optional" },
                    { time: "8:00 PM", title: "Week 1 · Problem Set 1", meta: "8:00 – 9:00 PM · 60 min", type: "active" },
                    { time: "9:00 PM", text: "Wind down — Nothing scheduled after 9 PM", type: "winddown" }
                ],
                tasksHeading: "Today's tasks",
                tasks: [
                    { text: "Watch Lecture 1 recap", checked: true },
                    { text: "Indoor Voice", checked: false },
                    { text: "Playback Speed", checked: false },
                    { text: "Making Faces", checked: false }
                ],
                glanceHeading: "Today at a glance",
                glance: {
                    planned: "60 min + 20 min optional",
                    free: "6:00 – 11:00 PM",
                    nextRest: "Sunday 1 Nov"
                }
            },
            fri: {
                id: "fri",
                dayName: "Friday",
                title: "Friday, 30 October",
                navDate: "Fri 30 Oct",
                isToday: false,
                timeline: [
                    { time: "9:00 AM", title: "College", meta: "9:00 AM – 4:30 PM · fixed", type: "commitment" },
                    { time: "7:00 PM", title: "Problem Set 1 · Code Review", meta: "7:00 – 8:00 PM · 60 min", type: "active" },
                    { time: "9:00 PM", text: "Wind down — Nothing scheduled after 9 PM", type: "winddown" }
                ],
                tasksHeading: "Friday's tasks",
                tasks: [
                    { text: "Submit Problem Set 1", checked: false },
                    { text: "Verify check50 test results", checked: false },
                    { text: "Weekend schedule check", checked: false }
                ],
                glanceHeading: "Friday at a glance",
                glance: {
                    planned: "60 min",
                    free: "4:30 – 11:00 PM",
                    nextRest: "Sunday 1 Nov"
                }
            },
            sat: {
                id: "sat",
                dayName: "Saturday",
                title: "Saturday, 31 October",
                navDate: "Sat 31 Oct",
                isToday: false,
                timeline: [
                    { time: "10:00 AM", title: "Week 2 · Conditionals", meta: "10:00 – 11:30 AM · 90 min", type: "active" },
                    { time: "2:00 PM", title: "Conditionals Practice Lab", meta: "2:00 – 3:30 PM · Optional", type: "optional" },
                    { time: "9:00 PM", text: "Wind down — Nothing scheduled after 9 PM", type: "winddown" }
                ],
                tasksHeading: "Saturday's tasks",
                tasks: [
                    { text: "Watch Conditionals lecture", checked: false },
                    { text: "Try boolean operators exercises", checked: false },
                    { text: "Test if/elif/else branch examples", checked: false }
                ],
                glanceHeading: "Saturday at a glance",
                glance: {
                    planned: "90 min + 90 min optional",
                    free: "All afternoon",
                    nextRest: "Tomorrow (Sunday)"
                }
            },
            sun: {
                id: "sun",
                dayName: "Sunday",
                title: "Sunday, 1 November",
                navDate: "Sun 1 Nov",
                isToday: false,
                timeline: [
                    { time: "10:00 AM", title: "Suggested: Catch-up / Revision", meta: "10:00 – 11:30 AM · Needs your OK", type: "buffer" },
                    { time: "1:00 PM", title: "Personal Time / Rest & Reset", meta: "Free schedule", type: "commitment" },
                    { time: "9:00 PM", text: "Wind down — Week 2 starts tomorrow", type: "winddown" }
                ],
                tasksHeading: "Sunday's tasks",
                tasks: [
                    { text: "Buffer slot for missed Wed session", checked: false },
                    { text: "Review Week 1 progress", checked: false },
                    { text: "Rest and recharge", checked: false }
                ],
                glanceHeading: "Sunday at a glance",
                glance: {
                    planned: "90 min buffer slot",
                    free: "All day",
                    nextRest: "Today (Rest day)"
                }
            }
        };

        const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
        let currentScheduleMode = "week"; // "week" or "day"
        let currentSelectedDay = "thu";   // Defaults to Thursday 29 Oct (screenshot)

        // DOM Elements
        const scheduleSubtitle = document.getElementById("scheduleSubtitle");
        const scheduleWeekLayout = document.getElementById("scheduleWeekLayout");
        const scheduleDayLayout = document.getElementById("scheduleDayLayout");
        const scheduleLegend = document.getElementById("scheduleLegend");
        const btnViewDay = document.getElementById("btnViewDay");
        const btnViewWeek = document.getElementById("btnViewWeek");
        const btnPrevDate = document.getElementById("btnPrevDate");
        const btnNextDate = document.getElementById("btnNextDate");
        const btnToday = document.getElementById("btnToday");
        const currentDateRange = document.getElementById("currentDateRange");

        // Week Calendar Sessions Data
        const sessionsData = {
            "problemset1-thu": {
                id: "problemset1-thu",
                status: "Upcoming - tonight",
                statusType: "upcoming",
                title: "Week 1 · Problem Set 1",
                when: "Thu 29 Oct · 8:00 – 9:00 PM",
                duration: "60 minutes",
                course: "CS50P · Harvard, edX",
                goal: "Counts toward: Finish Week 1 by 1 Nov",
                tasks: ["Indoor Voice", "Playback Speed", "Making Faces"]
            },
            "lecture1-mon": {
                id: "lecture1-mon",
                status: "Completed",
                statusType: "completed",
                title: "Week 1 · Lecture 1 Functions, variables",
                when: "Mon 26 Oct · 7:00 – 8:00 PM",
                duration: "60 minutes",
                course: "CS50P · Harvard, edX",
                goal: "Counts toward: Finish Week 1 by 1 Nov",
                tasks: ["Watch Lecture 1 stream", "Take core concept notes", "Run print() REPL examples"]
            },
            "gym-tue": {
                id: "gym-tue",
                status: "Commitment",
                statusType: "commitment",
                title: "Gym Workout",
                when: "Tue 27 Oct · 6:00 – 7:30 PM",
                duration: "90 minutes",
                course: "Personal Health",
                goal: "Fixed non-study routine",
                tasks: ["Strength training", "Stretching & cool down"]
            },
            "lecture1-wed": {
                id: "lecture1-wed",
                status: "Missed",
                statusType: "missed",
                title: "Week 1 · Lecture 1 part 2 + shorts",
                when: "Wed 28 Oct · 7:00 – 8:30 PM",
                duration: "90 minutes",
                course: "CS50P · Harvard, edX",
                goal: "Counts toward: Finish Week 1 by 1 Nov",
                tasks: ["Return values review", "f-strings practice"]
            },
            "gym-thu": {
                id: "gym-thu",
                status: "Commitment",
                statusType: "commitment",
                title: "Gym Workout",
                when: "Thu 29 Oct · 6:00 – 7:30 PM",
                duration: "90 minutes",
                course: "Personal Health",
                goal: "Fixed non-study routine",
                tasks: ["Cardio & core routine"]
            },
            "college-mon": {
                id: "college-mon",
                status: "Commitment",
                statusType: "commitment",
                title: "College Classes",
                when: "Mon 26 Oct · 9:00 AM – 4:30 PM",
                duration: "7.5 hours",
                course: "B.Tech CSE Year 2",
                goal: "Semester curriculum",
                tasks: ["Data Structures lecture", "Computer Networks lab"]
            },
            "week2-sat": {
                id: "week2-sat",
                status: "Upcoming",
                statusType: "upcoming",
                title: "Week 2 · Conditionals",
                when: "Sat 31 Oct · 10:00 – 11:30 AM",
                duration: "90 minutes",
                course: "CS50P · Harvard, edX",
                goal: "Counts toward: Finish Week 2 by 8 Nov",
                tasks: ["Watch Lecture 2 on boolean logic", "Test if/elif/else conditions in Python"]
            },
            "buffer-sun": {
                id: "buffer-sun",
                status: "Suggested - Buffer",
                statusType: "buffer",
                title: "Suggested: Catch-up / Revision",
                when: "Sun 1 Nov · 10:00 – 11:30 AM",
                duration: "90 minutes",
                course: "CS50P · Harvard, edX",
                goal: "Keep buffer slot for missed lecture",
                tasks: ["Complete missed Wed Lecture 1 part 2", "Review Problem Set 1 submission"]
            }
        };

        const weekDateRanges = [
            "19 Oct – 25 Oct 2026",
            "26 Oct – 1 Nov 2026",
            "2 Nov – 8 Nov 2026",
            "9 Nov – 15 Nov 2026"
        ];
        let currentWeekIndex = 1;

        function escapeHtml(str) {
            return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        // =========================================================
        // B. RENDER DAY SCHEDULE (FIGMA SCREENSHOT MATCH)
        // =========================================================
        function renderDaySchedule(dayKey) {
            const data = dayScheduleData[dayKey] || dayScheduleData["thu"];
            currentSelectedDay = dayKey;

            // Update header subtitle
            if (scheduleSubtitle) {
                scheduleSubtitle.textContent = data.title;
            }

            // Update date range
            if (currentDateRange) {
                currentDateRange.textContent = data.navDate;
            }

            // Render Left Timeline Rows
            const timelineContainer = document.getElementById("dayTimelineRows");
            if (timelineContainer) {
                let html = "";
                data.timeline.forEach((item) => {
                    if (item.type === "winddown") {
                        html += `
                            <div class="timeline-row timeline-wind-down-row">
                                <div class="timeline-time">${escapeHtml(item.time)}</div>
                                <div class="timeline-wind-down-text">${escapeHtml(item.text)}</div>
                            </div>
                        `;
                    } else {
                        let cardClass = "commitment-card";
                        if (item.type === "active") cardClass = "study-active-card";
                        else if (item.type === "optional") cardClass = "optional-card";
                        else if (item.type === "completed") cardClass = "completed-card";
                        else if (item.type === "missed") cardClass = "missed-card";
                        else if (item.type === "buffer") cardClass = "buffer-card";

                        html += `
                            <div class="timeline-row">
                                <div class="timeline-time">${escapeHtml(item.time)}</div>
                                <div class="timeline-event-card ${cardClass}" tabindex="0" role="button" aria-label="${escapeHtml(item.title)}: ${escapeHtml(item.meta)}">
                                    <div class="timeline-event-title">${escapeHtml(item.title)}</div>
                                    <div class="timeline-event-meta">${escapeHtml(item.meta)}</div>
                                </div>
                            </div>
                        `;
                    }
                });
                timelineContainer.innerHTML = html;
            }

            // Render Right Top Card: Today's Tasks
            const tasksHeading = document.getElementById("dayTasksCardHeading");
            if (tasksHeading) tasksHeading.textContent = data.tasksHeading;

            const tasksList = document.getElementById("dayTasksList");
            if (tasksList) {
                let tasksHtml = "";
                data.tasks.forEach((t) => {
                    tasksHtml += `
                        <label class="day-task-item">
                            <input type="checkbox" class="task-checkbox" ${t.checked ? "checked" : ""}>
                            <span class="custom-check-box" aria-hidden="true"></span>
                            <span class="task-label">${escapeHtml(t.text)}</span>
                        </label>
                    `;
                });
                tasksList.innerHTML = tasksHtml;
            }

            // Render Right Bottom Card: Today at a Glance
            const glanceHeading = document.getElementById("dayGlanceCardHeading");
            if (glanceHeading) glanceHeading.textContent = data.glanceHeading;

            const glancePlanned = document.getElementById("glancePlannedStudy");
            if (glancePlanned) glancePlanned.textContent = data.glance.planned;

            const glanceFree = document.getElementById("glanceFreeAfter");
            if (glanceFree) glanceFree.textContent = data.glance.free;

            const glanceRest = document.getElementById("glanceNextRest");
            if (glanceRest) glanceRest.textContent = data.glance.nextRest;

            // Bind checkbox toggles
            if (tasksList) {
                tasksList.querySelectorAll(".task-checkbox").forEach((cb) => {
                    cb.addEventListener("change", () => {
                        const lbl = cb.closest(".day-task-item")?.querySelector(".task-label");
                        if (lbl) lbl.style.color = cb.checked ? "#8d869c" : "#e2e8f0";
                    });
                });
            }
        }

        // =========================================================
        // C. SWITCHING BETWEEN DAY VIEW & WEEK VIEW
        // =========================================================
                function switchToDayView(dayKey = "thu") {
            currentScheduleMode = "day";
            renderDaySchedule(dayKey);

            if (btnViewDay) {
                btnViewDay.classList.add("active");
                btnViewDay.setAttribute("aria-selected", "true");
            }
            if (btnViewWeek) {
                btnViewWeek.classList.remove("active");
                btnViewWeek.setAttribute("aria-selected", "false");
            }

            // Absolutely ensure Week view is hidden and Day view is visible
            if (scheduleWeekLayout) {
                scheduleWeekLayout.hidden = true;
                scheduleWeekLayout.style.display = "none";
            }
            if (scheduleDayLayout) {
                scheduleDayLayout.hidden = false;
                scheduleDayLayout.style.display = "grid";
            }
            if (scheduleLegend) {
                scheduleLegend.hidden = true;
                scheduleLegend.style.display = "none";
            }
            if (btnToday) {
                btnToday.style.display = (dayKey === "thu") ? "none" : "";
            }
        }

        function switchToWeekView() {
            currentScheduleMode = "week";

            if (btnViewWeek) {
                btnViewWeek.classList.add("active");
                btnViewWeek.setAttribute("aria-selected", "true");
            }
            if (btnViewDay) {
                btnViewDay.classList.remove("active");
                btnViewDay.setAttribute("aria-selected", "false");
            }

            if (scheduleSubtitle) {
                scheduleSubtitle.textContent = "Your planned sessions around college and commitments.";
            }
            if (currentDateRange) {
                currentDateRange.textContent = weekDateRanges[currentWeekIndex] || "26 Oct – 1 Nov 2026";
            }

            // Absolutely ensure Day view is hidden and Week view is visible
            if (scheduleDayLayout) {
                scheduleDayLayout.hidden = true;
                scheduleDayLayout.style.display = "none";
            }
            if (scheduleWeekLayout) {
                scheduleWeekLayout.hidden = false;
                scheduleWeekLayout.style.display = "grid";
            }
            if (scheduleLegend) {
                scheduleLegend.hidden = false;
                scheduleLegend.style.display = "flex";
            }
            if (btnToday) {
                btnToday.style.display = "";
            }
        }

        // Toggle buttons click
        if (btnViewDay) {
            btnViewDay.addEventListener("click", () => {
                switchToDayView(currentSelectedDay);
            });
        }

        if (btnViewWeek) {
            btnViewWeek.addEventListener("click", () => {
                switchToWeekView();
            });
        }

        // =========================================================
        // D. CLICK ANY DAY IN WEEK VIEW TO OPEN DAY VIEW
        // =========================================================
        // 1. Click on day headers (Mon 26, Tue 27, Wed 28, Thu 29, Fri 30, Sat 31, Sun 1)
        document.querySelectorAll("#mainScheduleView .day-col-header").forEach((header) => {
            header.addEventListener("click", (e) => {
                const day = header.getAttribute("data-day");
                if (day) {
                    switchToDayView(day);
                }
            });
        });

        // 2. Click on day columns in the weekly grid
        document.querySelectorAll("#mainScheduleView .day-column").forEach((col) => {
            col.addEventListener("click", (e) => {
                const day = col.getAttribute("data-day");
                if (day) {
                    switchToDayView(day);
                }
            });
        });

        // =========================================================
        // E. DATE NAVIGATION (< > Today)
        // =========================================================
        if (btnPrevDate) {
            btnPrevDate.addEventListener("click", () => {
                if (currentScheduleMode === "day") {
                    const idx = dayOrder.indexOf(currentSelectedDay);
                    if (idx > 0) {
                        switchToDayView(dayOrder[idx - 1]);
                    }
                } else {
                    if (currentWeekIndex > 0) {
                        currentWeekIndex--;
                        if (currentDateRange) currentDateRange.textContent = weekDateRanges[currentWeekIndex];
                    }
                }
            });
        }

        if (btnNextDate) {
            btnNextDate.addEventListener("click", () => {
                if (currentScheduleMode === "day") {
                    const idx = dayOrder.indexOf(currentSelectedDay);
                    if (idx < dayOrder.length - 1) {
                        switchToDayView(dayOrder[idx + 1]);
                    }
                } else {
                    if (currentWeekIndex < weekDateRanges.length - 1) {
                        currentWeekIndex++;
                        if (currentDateRange) currentDateRange.textContent = weekDateRanges[currentWeekIndex];
                    }
                }
            });
        }

        if (btnToday) {
            btnToday.addEventListener("click", () => {
                if (currentScheduleMode === "day") {
                    switchToDayView("thu");
                } else {
                    currentWeekIndex = 1;
                    if (currentDateRange) currentDateRange.textContent = weekDateRanges[currentWeekIndex];
                    selectWeekSession("problemset1-thu");
                }
            });
        }

        // =========================================================
        // F. WEEK VIEW SESSION SELECTION
        // =========================================================
        const detailStatusText = document.getElementById("detailStatusText");
        const detailSessionTitle = document.getElementById("detailSessionTitle");
        const detailSessionWhen = document.getElementById("detailSessionWhen");
        const detailSessionDuration = document.getElementById("detailSessionDuration");
        const detailSessionCourse = document.getElementById("detailSessionCourse");
        const detailSessionGoal = document.getElementById("detailSessionGoal");
        const tasksChecklist = document.getElementById("tasksChecklist");
        const sessionStatusBadge = document.querySelector("#mainScheduleView .session-status-badge");
        const badgeDot = document.querySelector("#mainScheduleView .badge-dot-cyan");

        function selectSession(sessionId) {
            selectWeekSession(sessionId);
        }
        function selectWeekSession(sessionId) {
            const session = sessionsData[sessionId];
            if (!session) return;

            document.querySelectorAll("#mainScheduleView .event-block").forEach((el) => {
                el.classList.remove("selected-active-session");
            });

            const activeBlock = document.querySelector(`#mainScheduleView [data-session-id="${sessionId}"]`);
            if (activeBlock) {
                activeBlock.classList.add("selected-active-session");
            }

            if (detailStatusText) detailStatusText.textContent = session.status;
            if (detailSessionTitle) detailSessionTitle.textContent = session.title;
            if (detailSessionWhen) detailSessionWhen.textContent = session.when;
            if (detailSessionDuration) detailSessionDuration.textContent = session.duration;
            if (detailSessionCourse) detailSessionCourse.textContent = session.course;
            if (detailSessionGoal) detailSessionGoal.textContent = session.goal;

            if (sessionStatusBadge && badgeDot) {
                if (session.statusType === "completed") {
                    sessionStatusBadge.style.background = "rgba(16, 185, 129, 0.12)";
                    sessionStatusBadge.style.borderColor = "rgba(16, 185, 129, 0.35)";
                    detailStatusText.style.color = "#10b981";
                    badgeDot.style.background = "#10b981";
                    badgeDot.style.boxShadow = "0 0 8px #10b981";
                } else if (session.statusType === "missed") {
                    sessionStatusBadge.style.background = "rgba(239, 68, 68, 0.12)";
                    sessionStatusBadge.style.borderColor = "rgba(239, 68, 68, 0.35)";
                    detailStatusText.style.color = "#ef4444";
                    badgeDot.style.background = "#ef4444";
                    badgeDot.style.boxShadow = "0 0 8px #ef4444";
                } else if (session.statusType === "commitment") {
                    sessionStatusBadge.style.background = "rgba(255, 255, 255, 0.08)";
                    sessionStatusBadge.style.borderColor = "rgba(255, 255, 255, 0.18)";
                    detailStatusText.style.color = "#94a3b8";
                    badgeDot.style.background = "#94a3b8";
                    badgeDot.style.boxShadow = "none";
                } else {
                    sessionStatusBadge.style.background = "rgba(0, 229, 255, 0.1)";
                    sessionStatusBadge.style.borderColor = "rgba(0, 229, 255, 0.28)";
                    detailStatusText.style.color = "var(--cyan)";
                    badgeDot.style.background = "var(--cyan)";
                    badgeDot.style.boxShadow = "0 0 8px var(--cyan)";
                }
            }

            if (tasksChecklist) {
                tasksChecklist.innerHTML = "";
                session.tasks.forEach((t, idx) => {
                    const label = document.createElement("label");
                    label.className = "task-check-item";
                    const isChecked = idx === 0 && session.statusType === "upcoming";
                    label.innerHTML = `
                        <input type="checkbox" class="task-checkbox" ${isChecked ? "checked" : ""}>
                        <span class="custom-check-box" aria-hidden="true"></span>
                        <span class="task-label">${escapeHtml(t)}</span>
                    `;
                    tasksChecklist.appendChild(label);
                });
            }
        }

        // =========================================================
        // G. MODALS & ASSISTANT DRAWER
        // =========================================================
        const btnRescheduleAction = document.getElementById("btnRescheduleAction");
        const rescheduleModal = document.getElementById("rescheduleModal");
        const btnCloseRescheduleModal = document.getElementById("btnCloseRescheduleModal");
        const btnCancelReschedule = document.getElementById("btnCancelReschedule");
        const btnConfirmReschedule = document.getElementById("btnConfirmReschedule");
        const rescheduleDaySelect = document.getElementById("rescheduleDaySelect");
        const modalSessionLabel = document.getElementById("modalSessionLabel");

        function openRescheduleModal() {
            if (rescheduleModal) {
                if (modalSessionLabel && detailSessionTitle) {
                    modalSessionLabel.textContent = detailSessionTitle.textContent;
                }
                rescheduleModal.hidden = false;
            }
        }

        function closeRescheduleModal() {
            if (rescheduleModal) rescheduleModal.hidden = true;
        }

        if (btnRescheduleAction) btnRescheduleAction.addEventListener("click", openRescheduleModal);
        if (btnCloseRescheduleModal) btnCloseRescheduleModal.addEventListener("click", closeRescheduleModal);
        if (btnCancelReschedule) btnCancelReschedule.addEventListener("click", closeRescheduleModal);

        if (btnConfirmReschedule) {
            btnConfirmReschedule.addEventListener("click", () => {
                const newSlot = rescheduleDaySelect ? rescheduleDaySelect.value : "Friday 30 Oct · 7:00 PM";
                if (detailSessionWhen) detailSessionWhen.textContent = newSlot;
                closeRescheduleModal();
            });
        }

        const btnAddSession = document.getElementById("btnAddSession");
        const addSessionModal = document.getElementById("addSessionModal");
        const btnCloseAddSessionModal = document.getElementById("btnCloseAddSessionModal");
        const btnCancelAddSession = document.getElementById("btnCancelAddSession");
        const btnConfirmAddSession = document.getElementById("btnConfirmAddSession");
        const newSessionTitle = document.getElementById("newSessionTitle");

        function openAddSessionModal() {
            if (addSessionModal) addSessionModal.hidden = false;
        }

        function closeAddSessionModal() {
            if (addSessionModal) addSessionModal.hidden = true;
        }

        if (btnAddSession) btnAddSession.addEventListener("click", openAddSessionModal);
        if (btnCloseAddSessionModal) btnCloseAddSessionModal.addEventListener("click", closeAddSessionModal);
        if (btnCancelAddSession) btnCancelAddSession.addEventListener("click", closeAddSessionModal);

        if (btnConfirmAddSession) {
            btnConfirmAddSession.addEventListener("click", () => {
                const title = newSessionTitle && newSessionTitle.value.trim() ? newSessionTitle.value.trim() : "Custom Study Session";
                closeAddSessionModal();
                if (detailSessionTitle) detailSessionTitle.textContent = title;
                if (detailStatusText) detailStatusText.textContent = "Upcoming";
            });
        }

        const floatingAskWidget = document.getElementById("floatingAskWidget");
        const scheduleAssistantDrawer = document.getElementById("scheduleAssistantDrawer");
        const btnCloseScheduleDrawer = document.getElementById("btnCloseScheduleDrawer");
        const schedDrawerChatForm = document.getElementById("schedDrawerChatForm");
        const schedDrawerChatInput = document.getElementById("schedDrawerChatInput");
        const drawerChatArea = document.getElementById("drawerChatArea");

        function openScheduleDrawer(initialMessage = null) {
            if (scheduleAssistantDrawer) {
                scheduleAssistantDrawer.hidden = false;
                if (initialMessage && drawerChatArea) {
                    const bubble = document.createElement("div");
                    bubble.className = "chat-bubble assistant-bubble";
                    bubble.innerHTML = `<p>${escapeHtml(initialMessage)}</p>`;
                    drawerChatArea.appendChild(bubble);
                    drawerChatArea.scrollTop = drawerChatArea.scrollHeight;
                }
            }
        }

        function closeScheduleDrawer() {
            if (scheduleAssistantDrawer) scheduleAssistantDrawer.hidden = true;
        }

        if (floatingAskWidget) floatingAskWidget.addEventListener("click", () => openScheduleDrawer());
        if (btnCloseScheduleDrawer) btnCloseScheduleDrawer.addEventListener("click", closeScheduleDrawer);

        if (schedDrawerChatForm && schedDrawerChatInput) {
            schedDrawerChatForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const text = schedDrawerChatInput.value.trim();
                if (!text) return;

                if (drawerChatArea) {
                    const userBubble = document.createElement("div");
                    userBubble.className = "chat-bubble user-bubble";
                    userBubble.innerHTML = `<p>${escapeHtml(text)}</p>`;
                    drawerChatArea.appendChild(userBubble);
                    drawerChatArea.scrollTop = drawerChatArea.scrollHeight;
                }

                schedDrawerChatInput.value = "";

                setTimeout(() => {
                    if (drawerChatArea) {
                        const reply = document.createElement("div");
                        reply.className = "chat-bubble assistant-bubble";
                        const lower = text.toLowerCase();
                        if (lower.includes("reschedule") || lower.includes("move") || lower.includes("friday")) {
                            reply.innerHTML = "<p>You can move tonight's Problem Set 1 to Friday 7:00 PM or use your Sunday buffer slot at 10:00 AM.</p>";
                        } else if (lower.includes("college") || lower.includes("gym")) {
                            reply.innerHTML = "<p>Your fixed commitments (College: 9:00 AM – 4:30 PM, Gym: 6:00 – 7:30 PM) remain locked and protected.</p>";
                        } else {
                            reply.innerHTML = `<p>Noted! Tonight you have <strong>Week 1 · Problem Set 1</strong> scheduled at 8:00 PM for 60 min.</p>`;
                        }
                        drawerChatArea.appendChild(reply);
                        drawerChatArea.scrollTop = drawerChatArea.scrollHeight;
                    }
                }, 400);
            });
        }

        const btnStartSessionAction = document.getElementById("btnStartSessionAction");
        if (btnStartSessionAction) {
            btnStartSessionAction.addEventListener("click", () => {
                openScheduleDrawer("I've started your study session for '" + (detailSessionTitle ? detailSessionTitle.textContent : "Problem Set 1") + "'. Timer active. Good luck!");
            });
        }

        // Initialize Schedule in Day view by default (matching Image 2)
        switchToDayView("thu");
    }

    initScheduleWorkspace();


    // =========================================================
    // DASHBOARD VIEW EVENT HANDLERS & NAVIGATION
    // =========================================================
        // Helper to check if a plan has been accepted
    function isPlanAccepted() {
        try {
            return localStorage.getItem("studentos_plan_accepted") === "true" || !!localStorage.getItem("studentos_study_plan");
        } catch (e) {
            return false;
        }
    }

    // Open Study Plan or AI Assistant setup if plan not accepted
    function handleViewStudyPlan(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (isPlanAccepted()) {
            showView("plan");
        } else {
            if (typeof window.openAiAssistantView === "function") {
                window.openAiAssistantView();
            } else {
                showView("aiAssistant");
            }
        }
    }

    // Navigation: Dashboard
    if (sidebarNavDashboard) {
        sidebarNavDashboard.addEventListener("click", (e) => {
            e.preventDefault();
            showView("dashboard");
        });
    }

    // Navigation: Ask StudentOS (Header button)
    const btnHeaderAsk = document.getElementById("btnHeaderAsk");
    if (btnHeaderAsk) {
        btnHeaderAsk.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof window.openAiAssistantView === "function") {
                window.openAiAssistantView();
            } else {
                showView("aiAssistant");
            }
        });
    }

    // Navigation: View Study Plan (Header button)
    const btnHeaderStudyPlan = document.getElementById("btnHeaderStudyPlan");
    if (btnHeaderStudyPlan) {
        btnHeaderStudyPlan.addEventListener("click", handleViewStudyPlan);
    }

    // Card 1: Ask StudentOS Quick Card
    const cardAskStudentOS = document.getElementById("cardAskStudentOS");
    if (cardAskStudentOS) {
        cardAskStudentOS.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof window.openAiAssistantView === "function") {
                window.openAiAssistantView();
            } else {
                showView("aiAssistant");
            }
        });
    }

    // Card 2: View Study Plan Quick Card
    const cardViewStudyPlan = document.getElementById("cardViewStudyPlan");
    if (cardViewStudyPlan) {
        cardViewStudyPlan.addEventListener("click", handleViewStudyPlan);
    }

    // Card 3: Edit Schedule Quick Card
    const cardEditSchedule = document.getElementById("cardEditSchedule");
    if (cardEditSchedule) {
        cardEditSchedule.addEventListener("click", (e) => {
            e.preventDefault();
            showView("mainSchedule");
        });
    }

    // Card 4: Next up: Study Session (opens lecture session details drawer)
    const cardNextUpSession = document.getElementById("cardNextUpSession");
    if (cardNextUpSession) {
        cardNextUpSession.addEventListener("click", (e) => {
            e.preventDefault();
            openLecture1Drawer();
        });
    }

    // Next Up: Start Session button (opens lecture session details drawer)
    const btnDashStartSession = document.getElementById("btnDashStartSession");
    if (btnDashStartSession) {
        btnDashStartSession.addEventListener("click", (e) => {
            e.preventDefault();
            openLecture1Drawer();
        });
    }

    // Next Up: Reschedule button (opens reschedule modal)
    const btnDashReschedule = document.getElementById("btnDashReschedule");
    if (btnDashReschedule) {
        btnDashReschedule.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = document.getElementById("rescheduleModal");
            if (modal) {
                modal.hidden = false;
            } else {
                showView("mainSchedule");
            }
        });
    }

    // Priorities List: Toggle and persist checkbox states to localStorage
    const prioritiesList = document.getElementById("prioritiesList");
    if (prioritiesList) {
        prioritiesList.addEventListener("change", (e) => {
            if (e.target && (e.target.type === "checkbox" || e.target.classList.contains("task-checkbox"))) {
                const row = e.target.closest ? e.target.closest(".priority-row") : null;
                const textEl = row?.querySelector(".priority-text") || row?.querySelector(".priority-name");
                if (textEl) {
                    if (e.target.checked) {
                        textEl.style.textDecoration = "line-through";
                        textEl.style.opacity = "0.5";
                    } else {
                        textEl.style.textDecoration = "none";
                        textEl.style.opacity = "1";
                    }
                }

                // Persist checkbox states
                try {
                    const checkboxes = prioritiesList.querySelectorAll(".task-checkbox");
                    const states = Array.from(checkboxes).map((cb) => cb.checked);
                    localStorage.setItem("studentos_priorities_state", JSON.stringify(states));
                } catch (err) {}
            }
        });
    }

    // Current Goal: Course Track Link
    const linkCourseTrack = document.getElementById("linkCourseTrack");
    if (linkCourseTrack) {
        linkCourseTrack.addEventListener("click", (e) => {
            e.preventDefault();
            showView("coursesGoals");
        });
    }

    // This Week: Full Schedule Link
    const linkFullSchedule = document.getElementById("linkFullSchedule");
    if (linkFullSchedule) {
        linkFullSchedule.addEventListener("click", (e) => {
            e.preventDefault();
            showView("mainSchedule");
        });
    }

    // This Week: Mini Day Column Pills (navigate to schedule day)
    const miniDayCols = document.querySelectorAll(".mini-day-col");
    miniDayCols.forEach((col) => {
        col.addEventListener("click", (e) => {
            e.preventDefault();
            const dayAttr = col.getAttribute("data-day");
            const dayLabel = col.querySelector(".mini-day-label")?.textContent.trim().toLowerCase();
            const day = dayAttr || dayLabel || "thu";
            showView("mainSchedule");
            if (typeof switchToDayView === "function") {
                switchToDayView(day);
            }
        });
    });

    // Needs your attention: Accept buffer button
    const btnAcceptSundayBuffer = document.getElementById("btnAcceptSundayBuffer");
    const attentionCard = document.getElementById("attentionCard");
    if (btnAcceptSundayBuffer) {
        btnAcceptSundayBuffer.addEventListener("click", () => {
            try {
                localStorage.setItem("studentos_attention_state", "accepted");
            } catch (e) {}
            btnAcceptSundayBuffer.innerHTML = "<span>✓ Sunday Buffer Accepted</span>";
            btnAcceptSundayBuffer.disabled = true;
            btnAcceptSundayBuffer.style.opacity = "0.7";
            if (typeof showToast === "function") {
                showToast("Sunday buffer slot scheduled for 1 Nov, 10:00 AM");
            }
        });
    }

    // Needs your attention: Dismiss button
    const btnDismissAttention = document.getElementById("btnDismissAttention");
    if (btnDismissAttention) {
        btnDismissAttention.addEventListener("click", () => {
            try {
                localStorage.setItem("studentos_attention_state", "dismissed");
            } catch (e) {}
            if (attentionCard) {
                attentionCard.style.display = "none";
            }
        });
    }

    // Floating Ask Widget
    const floatingAskWidget = document.getElementById("floatingAskWidget") || document.getElementById("floatingWidget");
    if (floatingAskWidget) {
        floatingAskWidget.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof window.openAiAssistantView === "function") {
                window.openAiAssistantView();
            } else {
                showView("aiAssistant");
            }
        });
    }

    // Sidebar Nav: Study Plan
    if (sidebarNavStudyPlan) {
        sidebarNavStudyPlan.addEventListener("click", handleViewStudyPlan);
    }


    // =========================================================
    // 7. CONSOLIDATED STUDENTOS AI ASSISTANT CONTROLLER
    // =========================================================
    function initAiAssistantModule() {
/**
 * StudentOS AI Assistant
 * Provides dynamic step-by-step study plan onboarding matching the Figma reference.
 */

"use strict";

// State
const state = {
  currentStep: "welcome", // "welcome" | "profile" | "goal" | "course" | "availability" | "plan"
  theme: "dark",
  calendarOpen: true, // Step 3 calendar starts open as in reference
  selectedDate: "15 March 2027",
  simulateTimeout: false, // For testing Scenario C: planner timeout / failure
  completedSteps: {
    profile: false,
    goal: false,
    course: false,
    availability: false,
    plan: false,
  },
  answers: {
    profile: {
      name: "Aarav Mehta",
      college: "Northfield Institute of Technology",
      year: "2nd year",
      degree: "B.Tech, Computer Science",
    },
    goal: {
      type: "Finish an online course",
      description: "Finish CS50's Introduction to Programming with Python",
      summary: "Finish CS50's Python course",
    },
    course: {
      name: "CS50P — Harvard, on edX",
      progress: "Finished week 1 of 10",
      targetDate: "15 March 2027",
      shortName: "CS50P - edX",
      effort: "≈ 6-8 hours a week",
    },
    availability: {
      hours: "5-8 h",
      studyTimes: ["Early mornings", "Evenings"],
      sessionLength: "60 min",
      restDay: "Sunday",
    },
  },
};

// DOM Elements
const workspaceLayout =
  document.getElementById("workspace-layout") ||
  document.getElementById("content-layout");
const contentLayout = workspaceLayout;
const chatScroller = document.getElementById("chat-scroller");
const welcomeScreen = document.getElementById("welcome-screen");
const stepFlow = document.getElementById("step-flow");
const chatHistory = document.getElementById("chat-history");
const stepCardWrapper = document.getElementById("step-card-wrapper");
const detailsPanel = document.getElementById("details-panel");

// Stepper Elements
const stepperNodes = {
  profile: document.getElementById("stepper-profile"),
  goal: document.getElementById("stepper-goal"),
  course: document.getElementById("stepper-course"),
  availability: document.getElementById("stepper-availability"),
  plan: document.getElementById("stepper-plan"),
};

const stepperLines = {
  profileGoal: document.getElementById("line-profile-goal"),
  goalCourse: document.getElementById("line-goal-course"),
  courseAvailability: document.getElementById("line-course-availability"),
  availabilityPlan: document.getElementById("line-availability-plan"),
};

// Sidebar Details
const sidebarDetails = {
  name: document.getElementById("sidebar-detail-name"),
  college: document.getElementById("sidebar-detail-college"),
  year: document.getElementById("sidebar-detail-year"),
  degree: document.getElementById("sidebar-detail-degree"),
  goal: document.getElementById("sidebar-detail-goal"),
  course: document.getElementById("sidebar-detail-course"),
  target: document.getElementById("sidebar-detail-target"),
  hours: document.getElementById("sidebar-detail-hours"),
  times: document.getElementById("sidebar-detail-times"),

  iconProfile: document.getElementById("detail-icon-profile"),
  iconGoal: document.getElementById("detail-icon-goal"),
  iconCourse: document.getElementById("detail-icon-course"),
  iconAvailability: document.getElementById("detail-icon-availability"),

  editProfile: document.getElementById("edit-profile-btn"),
  editGoal: document.getElementById("edit-goal-btn"),
  editCourse: document.getElementById("edit-course-btn"),
  editAvailability: document.getElementById("edit-availability-btn"),
};

// Controls & Buttons
const startSetupBtn = document.getElementById("start-setup-btn");
const showQuestionsBtn = document.getElementById("show-questions-btn");
const questionsDialog = document.getElementById("questions-dialog");
const closeQuestionsBtn = document.getElementById("close-questions");
const startFromPreviewBtn = document.getElementById("start-from-preview");

const themeDarkBtn = document.getElementById("theme-dark-btn");
const themeLightBtn = document.getElementById("theme-light-btn");
const fullscreenToggle = document.getElementById("fullscreen-toggle");

const composerForm = document.getElementById("composer-form");
const messageInput = document.getElementById("message-input");
const attachBtn = document.getElementById("attach-btn");
const attachmentInput = document.getElementById("attachment-input");
const attachmentName = document.getElementById("attachment-name");

// Helper: Assistant Message Template (uses StudentOS_symbol.png emblem)
function createAssistantMessage(author, time, text) {
  const article = document.createElement("article");
  article.className = "chat-message assistant-message";
  article.innerHTML = `
    <div class="message-avatar">
      <img src="StudentOS_symbol.png" alt="StudentOS" />
    </div>
    <div class="message-content">
      <div class="message-meta">
        <strong class="meta-author">${author}</strong>
        <span class="meta-time">${time}</span>
      </div>
      <p class="message-text">${text}</p>
    </div>
  `;
  return article;
}

// Helper: User Message Bubble
function createUserBubble(text) {
  const div = document.createElement("div");
  div.className = "user-bubble";
  div.textContent = text;
  return div;
}

// Helper: Summary Chip
function createSummaryChip(text, editStepKey) {
  const div = document.createElement("div");
  div.className = "chat-summary-chip";
  div.innerHTML = `
    <span class="chip-dot">◉</span>
    <span>${text}</span>
    <button class="chip-edit-btn" type="button" data-edit-step="${editStepKey}">Edit</button>
  `;
  const editBtn = div.querySelector(".chip-edit-btn");
  editBtn.addEventListener("click", () => {
    navigateToStep(editStepKey);
  });
  return div;
}

// Update Details Panel
function updateDetailsPanel(missingList = []) {
  const { profile, goal, course, availability } = state.answers;

  if (detailsPanel) {
    detailsPanel.hidden = false;
  }

  const isProfileMissing = missingList.some((m) => m.category === "profile");
  const isGoalMissing = missingList.some((m) => m.category === "goal");
  const isCourseMissing = missingList.some((m) => m.category === "course");
  const isAvailabilityMissing = missingList.some((m) => m.category === "availability");

  const warningIconSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px;">
      <circle cx="12" cy="12" r="9" stroke="#f87171" stroke-width="2" fill="none"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="#f87171" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="16" r="1" fill="#f87171"/>
    </svg>
  `;

  // Profile Card
  if (isProfileMissing) {
    sidebarDetails.name.innerHTML = profile.name || '<span class="detail-missing-text">Missing</span>';
    sidebarDetails.college.innerHTML = profile.college || '<span class="detail-missing-text">Missing</span>';
    sidebarDetails.year.innerHTML = profile.year || '<span class="detail-missing-text">Missing</span>';
    sidebarDetails.degree.innerHTML = profile.degree || '<span class="detail-missing-text">Missing</span>';
    sidebarDetails.editProfile.hidden = false;
    sidebarDetails.editProfile.className = "detail-fix-btn";
    sidebarDetails.editProfile.textContent = "Fix";
    sidebarDetails.iconProfile.className = "detail-icon warning";
    sidebarDetails.iconProfile.innerHTML = warningIconSvg;
  } else if (state.completedSteps.profile || (state.currentStep !== "welcome" && state.currentStep !== "profile")) {
    sidebarDetails.name.textContent = profile.name || "Aarav Mehta";
    sidebarDetails.college.textContent = profile.college || "—";
    sidebarDetails.year.textContent = profile.year || "—";
    sidebarDetails.degree.textContent = profile.degree || "—";
    sidebarDetails.editProfile.hidden = false;
    sidebarDetails.editProfile.className = "detail-edit-btn";
    sidebarDetails.editProfile.textContent = "Edit";
    sidebarDetails.iconProfile.className = "detail-icon completed";
    sidebarDetails.iconProfile.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px;">
        <circle cx="12" cy="12" r="9" fill="#10b981" stroke="#10b981"/>
        <path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
  } else {
    sidebarDetails.name.textContent = profile.name || "Aarav Mehta";
    sidebarDetails.college.textContent = "—";
    sidebarDetails.year.textContent = "—";
    sidebarDetails.degree.textContent = "—";
    sidebarDetails.editProfile.hidden = true;
    sidebarDetails.editProfile.className = "detail-edit-btn";
    sidebarDetails.editProfile.textContent = "Edit";
    sidebarDetails.iconProfile.className = "detail-icon";
    sidebarDetails.iconProfile.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
    `;
  }

  // Goal Card
  if (isGoalMissing) {
    sidebarDetails.goal.innerHTML = '<span class="detail-missing-text">Missing</span>';
    sidebarDetails.editGoal.hidden = false;
    sidebarDetails.editGoal.className = "detail-fix-btn";
    sidebarDetails.editGoal.textContent = "Fix";
    sidebarDetails.iconGoal.className = "detail-icon warning";
    sidebarDetails.iconGoal.innerHTML = warningIconSvg;
  } else if (state.completedSteps.goal || (state.currentStep !== "welcome" && state.currentStep !== "profile" && state.currentStep !== "goal")) {
    sidebarDetails.goal.textContent = goal.summary || goal.description;
    sidebarDetails.editGoal.hidden = false;
    sidebarDetails.editGoal.className = "detail-edit-btn";
    sidebarDetails.editGoal.textContent = "Edit";
    sidebarDetails.iconGoal.className = "detail-icon completed";
    sidebarDetails.iconGoal.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px;">
        <circle cx="12" cy="12" r="9" fill="#10b981" stroke="#10b981"/>
        <path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
  } else {
    sidebarDetails.goal.textContent = "Not yet";
    sidebarDetails.editGoal.hidden = true;
    sidebarDetails.editGoal.className = "detail-edit-btn";
    sidebarDetails.editGoal.textContent = "Edit";
    sidebarDetails.iconGoal.className = "detail-icon";
    sidebarDetails.iconGoal.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
    `;
  }

  // Course Card
  const missingCourseName = missingList.some((m) => m.field === "courseName");
  const missingTargetDate = missingList.some((m) => m.field === "targetDate");
  if (isCourseMissing) {
    sidebarDetails.course.innerHTML = missingCourseName ? '<span class="detail-missing-text">Missing</span>' : (course.shortName || course.name);
    sidebarDetails.target.innerHTML = missingTargetDate ? '<span class="detail-missing-text">Missing</span>' : (course.targetDate || "Not yet");
    sidebarDetails.editCourse.hidden = false;
    sidebarDetails.editCourse.className = "detail-fix-btn";
    sidebarDetails.editCourse.textContent = "Fix";
    sidebarDetails.iconCourse.className = "detail-icon warning";
    sidebarDetails.iconCourse.innerHTML = warningIconSvg;
  } else if (state.completedSteps.course) {
    sidebarDetails.course.textContent = course.shortName || course.name;
    sidebarDetails.target.textContent = course.targetDate;
    sidebarDetails.editCourse.hidden = false;
    sidebarDetails.editCourse.className = "detail-edit-btn";
    sidebarDetails.editCourse.textContent = "Edit";
    sidebarDetails.iconCourse.className = "detail-icon completed";
    sidebarDetails.iconCourse.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px;">
        <circle cx="12" cy="12" r="9" fill="#10b981" stroke="#10b981"/>
        <path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
  } else if (state.currentStep === "course") {
    sidebarDetails.course.textContent = course.shortName || course.name;
    sidebarDetails.target.textContent = "Choosing...";
    sidebarDetails.editCourse.hidden = true;
    sidebarDetails.editCourse.className = "detail-edit-btn";
    sidebarDetails.editCourse.textContent = "Edit";
    sidebarDetails.iconCourse.className = "detail-icon";
    sidebarDetails.iconCourse.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
    `;
  } else {
    sidebarDetails.course.textContent = "Not yet";
    sidebarDetails.target.textContent = "Not yet";
    sidebarDetails.editCourse.hidden = true;
    sidebarDetails.editCourse.className = "detail-edit-btn";
    sidebarDetails.editCourse.textContent = "Edit";
    sidebarDetails.iconCourse.className = "detail-icon";
    sidebarDetails.iconCourse.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
    `;
  }

  // Availability Card
  const missingHours = missingList.some((m) => m.field === "hours");
  const missingTimes = missingList.some((m) => m.field === "studyTimes");
  if (isAvailabilityMissing) {
    sidebarDetails.hours.innerHTML = missingHours ? '<span class="detail-missing-text">Missing</span>' : (availability.hours || "Not yet");
    sidebarDetails.times.innerHTML = missingTimes ? '<span class="detail-missing-text">Missing</span>' : (availability.studyTimes && availability.studyTimes.length ? availability.studyTimes.join(", ") : "Not yet");
    sidebarDetails.editAvailability.hidden = false;
    sidebarDetails.editAvailability.className = "detail-fix-btn";
    sidebarDetails.editAvailability.textContent = "Fix";
    sidebarDetails.iconAvailability.className = "detail-icon warning";
    sidebarDetails.iconAvailability.innerHTML = warningIconSvg;
  } else if (state.completedSteps.availability || state.currentStep === "plan") {
    sidebarDetails.hours.textContent = availability.hours;
    sidebarDetails.times.textContent = availability.studyTimes.join(", ");
    sidebarDetails.editAvailability.hidden = false;
    sidebarDetails.editAvailability.className = "detail-edit-btn";
    sidebarDetails.editAvailability.textContent = "Edit";
    sidebarDetails.iconAvailability.className = "detail-icon completed";
    sidebarDetails.iconAvailability.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px;">
        <circle cx="12" cy="12" r="9" fill="#10b981" stroke="#10b981"/>
        <path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
  } else {
    sidebarDetails.hours.textContent = "Not yet";
    sidebarDetails.times.textContent = "Not yet";
    sidebarDetails.editAvailability.hidden = true;
    sidebarDetails.editAvailability.className = "detail-edit-btn";
    sidebarDetails.editAvailability.textContent = "Edit";
    sidebarDetails.iconAvailability.className = "detail-icon";
    sidebarDetails.iconAvailability.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
    `;
  }

  // Keep dashboard and sidebar synchronized with AI Assistant state
  if (typeof syncDashboardWithState === "function") {
    syncDashboardWithState();
  }
}

// Safety alias for any legacy call
const updateSidebarDetails = updateDetailsPanel;

// Update Top Stepper
function updateStepper() {
  const steps = ["profile", "goal", "course", "availability", "plan"];
  const currentIndex = steps.indexOf(state.currentStep);

  steps.forEach((step, index) => {
    const node = stepperNodes[step];
    if (!node) return;
    node.classList.remove("active", "completed");
    const indicator = node.querySelector(".step-indicator");

    if (state.currentStep === "welcome") {
      if (step === "profile") {
        node.classList.add("active");
        if (indicator) indicator.innerHTML = '<span class="step-dot"></span>';
      } else {
        if (indicator) indicator.innerHTML = "";
      }
    } else {
      const isCompleted = state.completedSteps[step] || index < currentIndex;
      if (isCompleted && index !== currentIndex) {
        node.classList.add("completed");
        if (indicator) {
          indicator.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 9px; height: 9px; stroke: #000; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: none;">
              <path d="M5 13l4 4L19 7" />
            </svg>
          `;
        }
      } else if (index === currentIndex) {
        node.classList.add("active");
        if (indicator) indicator.innerHTML = '<span class="step-dot"></span>';
      } else {
        if (indicator) indicator.innerHTML = "";
      }
    }
  });

  // Lines
  const isProfileDone = state.completedSteps.profile || currentIndex > 0;
  const isGoalDone = state.completedSteps.goal || currentIndex > 1;
  const isCourseDone = state.completedSteps.course || currentIndex > 2;
  const isAvailabilityDone = state.completedSteps.availability || currentIndex > 3;

  if (stepperLines.profileGoal) stepperLines.profileGoal.classList.toggle("completed", isProfileDone);
  if (stepperLines.goalCourse) stepperLines.goalCourse.classList.toggle("completed", isGoalDone);
  if (stepperLines.courseAvailability) stepperLines.courseAvailability.classList.toggle("completed", isCourseDone);
  if (stepperLines.availabilityPlan) stepperLines.availabilityPlan.classList.toggle("completed", isAvailabilityDone);
}

// Render Step Flow
function navigateToStep(step) {
  state.currentStep = step;
  updateStepper();
  updateDetailsPanel();

  const chatScroller = document.getElementById("chat-scroller");

  if (step === "welcome") {
    welcomeScreen.hidden = false;
    stepFlow.hidden = true;
    chatHistory.innerHTML = "";
    stepCardWrapper.innerHTML = "";
    if (chatScroller) chatScroller.scrollTop = 0;
    return;
  }

  welcomeScreen.hidden = false;
  stepFlow.hidden = false;

  // Clear previous dynamic content
  chatHistory.innerHTML = "";
  stepCardWrapper.innerHTML = "";

  if (step === "profile") {
    renderStep1Profile();
  } else if (step === "goal") {
    renderStep2Goal();
  } else if (step === "course") {
    renderStep3Course();
  } else if (step === "availability") {
    renderStep4Availability();
  } else if (step === "plan") {
    renderStep5Plan();
  }

  // Scroll smoothly to the form card
  setTimeout(() => {
    if (stepCardWrapper) {
      stepCardWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, 60);
}

// ==========================================================================
// SCREEN 2: STEP 1 - ABOUT YOU
// ==========================================================================
function renderStep1Profile() {
  // Chat History
  const msg1 = createAssistantMessage(
    "StudentOS",
    "9:41 AM",
    "Hi Aarav — to build a plan that fits, I need a few details. It takes about 3 minutes."
  );
  const userPill = createUserBubble("Set up my study plan");
  const msg2 = createAssistantMessage(
    "StudentOS",
    "9:42 AM",
    "Great. First, a bit about you — this helps me plan around your classes and term dates."
  );

  chatHistory.append(msg1, userPill, msg2);

  // Form Card
  const card = document.createElement("section");
  card.className = "form-card";
  card.innerHTML = `
    <div class="form-card-header">
      <h2 class="form-card-title">About you</h2>
      <p class="form-card-subtitle">Step 1 of 5 · You can edit this later.</p>
    </div>
    <form id="step-form-profile">
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="profile-name-input">Your name</label>
          <input class="form-input" id="profile-name-input" type="text" value="${state.answers.profile.name}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-college-input">College or institution</label>
          <input class="form-input focus-cyan" id="profile-college-input" type="text" value="${state.answers.profile.college}" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Academic year</label>
        <div class="choices-row" id="academic-year-choices">
          <button type="button" class="choice-btn" data-year="1st year">1st year</button>
          <button type="button" class="choice-btn active" data-year="2nd year">✓ 2nd year</button>
          <button type="button" class="choice-btn" data-year="3rd year">3rd year</button>
          <button type="button" class="choice-btn" data-year="4th year">4th year</button>
          <button type="button" class="choice-btn" data-year="Other">Other</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="profile-degree-input">Degree or course</label>
        <input class="form-input" id="profile-degree-input" type="text" value="${state.answers.profile.degree}" required />
      </div>

      <div class="form-card-actions">
        <button type="button" class="ghost-btn" id="skip-profile-btn">Skip for now</button>
        <button type="submit" class="primary-pill-btn" id="save-profile-btn">
          <span>&gt;</span> Save and continue
        </button>
      </div>
    </form>
  `;

  stepCardWrapper.append(card);

  // Wire Academic Year Choices
  const yearChoices = card.querySelectorAll("[data-year]");
  yearChoices.forEach((btn) => {
    const yearVal = btn.dataset.year;
    if (yearVal === state.answers.profile.year) {
      btn.classList.add("active");
      btn.textContent = `✓ ${yearVal}`;
    } else {
      btn.classList.remove("active");
      btn.textContent = yearVal;
    }

    btn.addEventListener("click", () => {
      yearChoices.forEach((b) => {
        b.classList.remove("active");
        b.textContent = b.dataset.year;
      });
      btn.classList.add("active");
      btn.textContent = `✓ ${yearVal}`;
      state.answers.profile.year = yearVal;
    });
  });

  // Skip
  card.querySelector("#skip-profile-btn").addEventListener("click", () => {
    state.completedSteps.profile = true;
    navigateToStep("goal");
  });

  // Submit
  const form = card.querySelector("#step-form-profile");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    state.answers.profile.name = card.querySelector("#profile-name-input").value.trim();
    state.answers.profile.college = card.querySelector("#profile-college-input").value.trim();
    state.answers.profile.degree = card.querySelector("#profile-degree-input").value.trim();
    state.completedSteps.profile = true;
    navigateToStep("goal");
  });
}

// ==========================================================================
// SCREEN 3: STEP 2 - YOUR LEARNING GOAL
// ==========================================================================
function renderStep2Goal() {
  // Chat History
  const summaryText = `${state.answers.profile.college} · ${state.answers.profile.year} · B.Tech CSE`;
  const chip = createSummaryChip(summaryText, "profile");

  const msg = createAssistantMessage(
    "StudentOS",
    "9:43 AM",
    "Thanks, Aarav. What would you like to work towards? Pick the closest option, or describe it in your own words."
  );

  chatHistory.append(chip, msg);

  // Form Card
  const card = document.createElement("section");
  card.className = "form-card";
  card.innerHTML = `
    <div class="form-card-header">
      <h2 class="form-card-title">Your learning goal</h2>
      <p class="form-card-subtitle">Step 2 of 5</p>
    </div>
    <form id="step-form-goal">
      <div class="form-group">
        <label class="form-label">Type of goal</label>
        <div class="choices-row" id="goal-type-choices">
          <button type="button" class="choice-btn active" data-goal-type="Finish an online course">✓ Finish an online course</button>
          <button type="button" class="choice-btn" data-goal-type="Prepare for an exam">Prepare for an exam</button>
          <button type="button" class="choice-btn" data-goal-type="Learn a new skill">Learn a new skill</button>
          <button type="button" class="choice-btn" data-goal-type="Build a project">Build a project</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="goal-desc-input">Describe your goal</label>
        <input class="form-input focus-cyan" id="goal-desc-input" type="text" value="${state.answers.goal.description}" required />
        <p class="form-hint">Specific goals make better plans — mention the course or exam if you can.</p>
      </div>

      <div class="form-card-actions">
        <button type="button" class="ghost-btn" id="back-goal-btn">&lt; Back</button>
        <button type="submit" class="primary-pill-btn" id="save-goal-btn">
          <span>&gt;</span> Continue
        </button>
      </div>
    </form>
  `;

  stepCardWrapper.append(card);

  // Wire Goal Choices
  const goalChoices = card.querySelectorAll("[data-goal-type]");
  goalChoices.forEach((btn) => {
    const val = btn.dataset.goalType;
    if (val === state.answers.goal.type) {
      btn.classList.add("active");
      btn.textContent = `✓ ${val}`;
    } else {
      btn.classList.remove("active");
      btn.textContent = val;
    }

    btn.addEventListener("click", () => {
      goalChoices.forEach((b) => {
        b.classList.remove("active");
        b.textContent = b.dataset.goalType;
      });
      btn.classList.add("active");
      btn.textContent = `✓ ${val}`;
      state.answers.goal.type = val;
    });
  });

  // Back
  card.querySelector("#back-goal-btn").addEventListener("click", () => {
    navigateToStep("profile");
  });

  // Submit
  const form = card.querySelector("#step-form-goal");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    state.answers.goal.description = card.querySelector("#goal-desc-input").value.trim();
    state.completedSteps.goal = true;
    navigateToStep("course");
  });
}

// ==========================================================================
// DATE HELPERS & CALENDAR VALIDATION
// ==========================================================================
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function getTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function formatDate(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function parseDateString(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 1. "15 March 2027" or "15 Mar 2027"
  const textMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthName = textMatch[2].toLowerCase();
    const year = parseInt(textMatch[3], 10);
    let monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName);
    if (monthIndex === -1) {
      monthIndex = MONTH_SHORT.findIndex((m) => m.toLowerCase() === monthName);
    }
    if (monthIndex !== -1) {
      const d = new Date(year, monthIndex, day);
      if (d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day) {
        return d;
      }
      return "INVALID_DATE_VALUES";
    }
  }

  // 2. "March 15, 2027" or "Mar 15, 2027"
  const textMatch2 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textMatch2) {
    const monthName = textMatch2[1].toLowerCase();
    const day = parseInt(textMatch2[2], 10);
    const year = parseInt(textMatch2[3], 10);
    let monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName);
    if (monthIndex === -1) {
      monthIndex = MONTH_SHORT.findIndex((m) => m.toLowerCase() === monthName);
    }
    if (monthIndex !== -1) {
      const d = new Date(year, monthIndex, day);
      if (d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day) {
        return d;
      }
      return "INVALID_DATE_VALUES";
    }
  }

  // 3. "YYYY-MM-DD"
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIndex >= 0 && monthIndex <= 11) {
      const d = new Date(year, monthIndex, day);
      if (d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day) {
        return d;
      }
      return "INVALID_DATE_VALUES";
    }
  }

  // 4. "DD/MM/YYYY" or "DD-MM-YYYY"
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthIndex = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (monthIndex >= 0 && monthIndex <= 11) {
      const d = new Date(year, monthIndex, day);
      if (d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day) {
        return d;
      }
      return "INVALID_DATE_VALUES";
    }
  }

  return null;
}

function validateTargetDate(str) {
  if (!str || !str.trim()) {
    return {
      valid: false,
      message: "Please choose or enter a target date.",
    };
  }

  const parsed = parseDateString(str);
  if (!parsed || parsed === "INVALID_DATE_VALUES") {
    return {
      valid: false,
      message: "Please enter a valid date (e.g. 15 March 2027).",
    };
  }

  const today = getTodayMidnight();
  const parsedMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);

  if (parsedMidnight.getTime() === today.getTime()) {
    return {
      valid: false,
      message: "Target date cannot be today. Please select a date after today.",
      date: parsed,
    };
  }

  if (parsedMidnight.getTime() < today.getTime()) {
    return {
      valid: false,
      message: "This date has already passed. Choose a future date.",
      date: parsed,
    };
  }

  return {
    valid: true,
    date: parsed,
    formatted: formatDate(parsed),
  };
}

function getTargetDateHelper(targetDate) {
  if (!targetDate || !(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
    return "Enter or select a target completion date.";
  }
  const today = getTodayMidnight();
  const diffMs = targetDate.getTime() - today.getTime();
  if (diffMs <= 0) {
    return "Select a future target date.";
  }
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.round(diffDays / 7);
  if (weeks <= 1) {
    return `About ${diffDays} day${diffDays === 1 ? "" : "s"} away — ambitious timeline.`;
  }
  return `About ${weeks} weeks away — comfortable for 9 weeks of material.`;
}

// ==========================================================================
// SCREEN 4: STEP 3 - COURSE AND TARGET DATE
// ==========================================================================
function renderStep3Course() {
  // Chat History
  const chip = createSummaryChip(`Goal: ${state.answers.goal.summary}`, "goal");

  const msg = createAssistantMessage(
    "StudentOS",
    "9:44 AM",
    "Good choice. Which course or platform is it on, and when do you want to finish? I'll check the date is realistic before we go on."
  );

  chatHistory.append(chip, msg);

  // Parse initial selected date or set future date
  if (state.answers.course.targetDate) {
    const targetParsed = parseDateString(state.answers.course.targetDate);
    if (targetParsed && targetParsed !== "INVALID_DATE_VALUES" && targetParsed.getTime() > getTodayMidnight().getTime()) {
      state.selectedDate = state.answers.course.targetDate;
    }
  }

  let initialParsed = parseDateString(state.selectedDate);
  if (!initialParsed || initialParsed === "INVALID_DATE_VALUES" || initialParsed.getTime() <= getTodayMidnight().getTime()) {
    const candidate = parseDateString("15 March 2027");
    if (candidate && candidate !== "INVALID_DATE_VALUES" && candidate.getTime() > getTodayMidnight().getTime()) {
      state.selectedDate = "15 March 2027";
      initialParsed = candidate;
    } else {
      const future = new Date();
      future.setMonth(future.getMonth() + 4);
      state.selectedDate = formatDate(future);
      initialParsed = future;
    }
  }

  const initialHelperText = getTargetDateHelper(initialParsed);

  // Calendar View State for this step
  let calViewMode = "date"; // "date" | "month" | "year"
  let calViewYear = initialParsed.getFullYear();
  let calViewMonth = initialParsed.getMonth();

  function getYearRangeStart(year) {
    const curYear = getTodayMidnight().getFullYear();
    if (year <= curYear) return curYear;
    const page = Math.floor((year - curYear) / 12);
    return curYear + page * 12;
  }

  let calYearRangeStart = getYearRangeStart(calViewYear);

  // Form Card
  const card = document.createElement("section");
  card.className = "form-card";
  card.innerHTML = `
    <div class="form-card-header">
      <h2 class="form-card-title">Course and target date</h2>
      <p class="form-card-subtitle">Step 3 of 5</p>
    </div>
    <form id="step-form-course" novalidate>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="course-name-input">Course or subject</label>
          <input class="form-input" id="course-name-input" type="text" value="${state.answers.course.name}" required />
          <div id="course-error-message" class="course-error-message date-error-message" style="display: none;"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="course-progress-select">Where you are now</label>
          <select class="form-select" id="course-progress-select">
            <option value="Finished week 1 of 10" ${state.answers.course.progress === "Finished week 1 of 10" ? "selected" : ""}>Finished week 1 of 10</option>
            <option value="Just starting" ${state.answers.course.progress === "Just starting" ? "selected" : ""}>Just starting</option>
            <option value="Halfway through" ${state.answers.course.progress === "Halfway through" ? "selected" : ""}>Halfway through</option>
            <option value="Near the end" ${state.answers.course.progress === "Near the end" ? "selected" : ""}>Near the end</option>
          </select>
        </div>
      </div>

      <div class="form-grid-2" style="align-items: stretch; margin-bottom: 8px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="course-date-input">Target completion date</label>
          <div class="date-input-wrapper">
            <input class="form-input focus-cyan" id="course-date-input" type="text" value="${state.selectedDate}" placeholder="e.g. 15 March 2027" autocomplete="off" />
            <button type="button" class="date-calendar-btn" id="date-calendar-toggle" aria-label="Toggle calendar">
              <svg class="date-calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="16" rx="2" />
                <path d="M7.5 3v4M16.5 3v4M4 10h16" />
              </svg>
            </button>

            <!-- Calendar Dropdown Popup -->
            <div class="calendar-dropdown" id="calendar-dropdown" ${state.calendarOpen ? "" : 'style="display: none;"'}>
              <!-- Dynamically populated by renderCalendar() -->
            </div>
          </div>
          <div id="date-error-message" class="date-error-message" style="display: none;"></div>
          <p class="form-hint" id="date-helper-text">${initialHelperText}</p>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <div class="effort-card">
            <span class="effort-title">Course effort (from edX)</span>
            <span class="effort-value">${state.answers.course.effort}</span>
            <span class="effort-note">You can override this if you work faster or slower.</span>
          </div>
        </div>
      </div>

      <div class="form-card-actions">
        <button type="button" class="ghost-btn" id="back-course-btn">&lt; Back</button>
        <button type="submit" class="primary-pill-btn" id="save-course-btn">
          <span>&gt;</span> Continue
        </button>
      </div>
    </form>
  `;

  stepCardWrapper.append(card);

  const calDropdown = card.querySelector("#calendar-dropdown");
  const dateInput = card.querySelector("#course-date-input");
  const toggleBtn = card.querySelector("#date-calendar-toggle");
  const errorMsgEl = card.querySelector("#date-error-message");
  const helperTextEl = card.querySelector("#date-helper-text");
  const form = card.querySelector("#step-form-course");

  const courseNameInput = card.querySelector("#course-name-input");
  const courseErrorMsgEl = card.querySelector("#course-error-message");

  function showCourseError(message) {
    if (courseErrorMsgEl && courseNameInput) {
      courseErrorMsgEl.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${message}</span>
      `;
      courseErrorMsgEl.style.display = "flex";
      courseNameInput.classList.add("input-error");
    }
  }

  function clearCourseError() {
    if (courseErrorMsgEl && courseNameInput) {
      courseErrorMsgEl.style.display = "none";
      courseErrorMsgEl.innerHTML = "";
      courseNameInput.classList.remove("input-error");
    }
  }

  if (courseNameInput) {
    courseNameInput.addEventListener("input", () => {
      const val = courseNameInput.value.trim();
      if (val) {
        clearCourseError();
      }
    });

    courseNameInput.addEventListener("blur", () => {
      const val = courseNameInput.value.trim();
      if (!val) {
        showCourseError("Please enter a course or subject to continue.");
      } else {
        clearCourseError();
      }
    });
  }

  function showDateError(message) {
    errorMsgEl.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${message}</span>
    `;
    errorMsgEl.style.display = "flex";
    dateInput.classList.add("input-error");
  }

  function clearDateError() {
    errorMsgEl.style.display = "none";
    errorMsgEl.innerHTML = "";
    dateInput.classList.remove("input-error");
  }

  function updateHelperText(dateObj) {
    if (helperTextEl) {
      helperTextEl.textContent = getTargetDateHelper(dateObj);
    }
  }

  // ========================================================================
  // Dynamic 3-Mode Calendar Renderer
  // ========================================================================
  function renderCalendar() {
    if (!calDropdown) return;
    const today = getTodayMidnight();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (calViewMode === "date") {
      // 1. DATE VIEW
      const firstDayOfWeek = (new Date(calViewYear, calViewMonth, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

      const isPrevDisabled = (calViewYear < currentYear) || (calViewYear === currentYear && calViewMonth <= currentMonth);

      const selectedParsed = parseDateString(state.selectedDate);
      const hasSelected = selectedParsed && selectedParsed !== "INVALID_DATE_VALUES";

      let daysHtml = "";
      for (let i = 0; i < firstDayOfWeek; i++) {
        daysHtml += `<div class="cal-day-empty"></div>`;
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(calViewYear, calViewMonth, day, 0, 0, 0, 0);
        const isPastOrToday = cellDate.getTime() <= today.getTime();
        const isSelected = hasSelected &&
          selectedParsed.getFullYear() === calViewYear &&
          selectedParsed.getMonth() === calViewMonth &&
          selectedParsed.getDate() === day;

        const classes = ["cal-day"];
        if (isSelected) classes.push("active");
        if (isPastOrToday) classes.push("disabled");

        daysHtml += `<button type="button" class="${classes.join(" ")}" data-day="${day}" ${isPastOrToday ? "disabled" : ""}>${day}</button>`;
      }

      calDropdown.innerHTML = `
        <div class="calendar-header">
          <button type="button" class="cal-nav-btn" id="cal-prev-btn" ${isPrevDisabled ? "disabled" : ""} aria-label="Previous month">&lt;</button>
          <div class="calendar-header-titles">
            <button type="button" class="cal-title-btn" id="cal-month-title-btn" title="Choose month">${MONTH_NAMES[calViewMonth]}</button>
            <button type="button" class="cal-title-btn" id="cal-year-title-btn" title="Choose year">${calViewYear}</button>
          </div>
          <button type="button" class="cal-nav-btn" id="cal-next-btn" aria-label="Next month">&gt;</button>
        </div>
        <div class="calendar-weekdays">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>
        <div class="calendar-grid" id="calendar-days-grid">
          ${daysHtml}
        </div>
      `;

      const prevBtn = calDropdown.querySelector("#cal-prev-btn");
      const nextBtn = calDropdown.querySelector("#cal-next-btn");
      const monthTitleBtn = calDropdown.querySelector("#cal-month-title-btn");
      const yearTitleBtn = calDropdown.querySelector("#cal-year-title-btn");

      if (prevBtn && !isPrevDisabled) {
        prevBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (calViewMonth === 0) {
            calViewMonth = 11;
            calViewYear--;
          } else {
            calViewMonth--;
          }
          renderCalendar();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (calViewMonth === 11) {
            calViewMonth = 0;
            calViewYear++;
          } else {
            calViewMonth++;
          }
          renderCalendar();
        });
      }

      if (monthTitleBtn) {
        monthTitleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewMode = "month";
          renderCalendar();
        });
      }

      if (yearTitleBtn) {
        yearTitleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewMode = "year";
          calYearRangeStart = getYearRangeStart(calViewYear);
          renderCalendar();
        });
      }

      calDropdown.querySelectorAll(".cal-day:not(:disabled)").forEach((dayBtn) => {
        dayBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const d = parseInt(dayBtn.dataset.day, 10);
          const pickedDate = new Date(calViewYear, calViewMonth, d);
          const formatted = formatDate(pickedDate);

          state.selectedDate = formatted;
          state.answers.course.targetDate = formatted;
          dateInput.value = formatted;
          clearDateError();
          updateHelperText(pickedDate);
          renderCalendar();
        });
      });

    } else if (calViewMode === "month") {
      // 2. MONTH SELECTION VIEW
      const selectedParsed = parseDateString(state.selectedDate);
      const hasSelected = selectedParsed && selectedParsed !== "INVALID_DATE_VALUES";

      let monthsHtml = "";
      for (let m = 0; m < 12; m++) {
        const isPastMonth = (calViewYear < currentYear) || (calViewYear === currentYear && m < currentMonth);
        const isSelected = hasSelected && selectedParsed.getFullYear() === calViewYear && selectedParsed.getMonth() === m;

        const classes = ["cal-grid-item"];
        if (isSelected) classes.push("active");
        if (isPastMonth) classes.push("disabled");

        monthsHtml += `<button type="button" class="${classes.join(" ")}" data-month="${m}" ${isPastMonth ? "disabled" : ""}>${MONTH_SHORT[m]}</button>`;
      }

      const isPrevYearDisabled = calViewYear <= currentYear;

      calDropdown.innerHTML = `
        <div class="calendar-header">
          <button type="button" class="cal-nav-btn" id="cal-month-prev-year-btn" ${isPrevYearDisabled ? "disabled" : ""} aria-label="Previous year">&lt;</button>
          <div class="calendar-header-titles">
            <span class="calendar-title-label">Select Month</span>
            <button type="button" class="cal-title-btn" id="cal-month-to-year-btn" title="Choose year">${calViewYear}</button>
          </div>
          <button type="button" class="cal-nav-btn" id="cal-month-next-year-btn" aria-label="Next year">&gt;</button>
        </div>
        <div class="calendar-selection-grid">
          ${monthsHtml}
        </div>
      `;

      const prevYearBtn = calDropdown.querySelector("#cal-month-prev-year-btn");
      const nextYearBtn = calDropdown.querySelector("#cal-month-next-year-btn");
      const toYearBtn = calDropdown.querySelector("#cal-month-to-year-btn");

      if (prevYearBtn && !isPrevYearDisabled) {
        prevYearBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewYear--;
          renderCalendar();
        });
      }

      if (nextYearBtn) {
        nextYearBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewYear++;
          renderCalendar();
        });
      }

      if (toYearBtn) {
        toYearBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewMode = "year";
          calYearRangeStart = getYearRangeStart(calViewYear);
          renderCalendar();
        });
      }

      calDropdown.querySelectorAll(".cal-grid-item:not(:disabled)").forEach((mBtn) => {
        mBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewMonth = parseInt(mBtn.dataset.month, 10);
          calViewMode = "date";
          renderCalendar();
        });
      });

    } else if (calViewMode === "year") {
      // 3. YEAR SELECTION VIEW
      const selectedParsed = parseDateString(state.selectedDate);
      const hasSelected = selectedParsed && selectedParsed !== "INVALID_DATE_VALUES";

      const rangeEnd = calYearRangeStart + 11;
      const isPrevRangeDisabled = calYearRangeStart <= currentYear;

      let yearsHtml = "";
      for (let y = calYearRangeStart; y <= rangeEnd; y++) {
        const isPastYear = y < currentYear;
        const isSelected = hasSelected && selectedParsed.getFullYear() === y;

        const classes = ["cal-grid-item"];
        if (isSelected) classes.push("active");
        if (isPastYear) classes.push("disabled");

        yearsHtml += `<button type="button" class="${classes.join(" ")}" data-year="${y}" ${isPastYear ? "disabled" : ""}>${y}</button>`;
      }

      calDropdown.innerHTML = `
        <div class="calendar-header">
          <button type="button" class="cal-nav-btn" id="cal-year-prev-range-btn" ${isPrevRangeDisabled ? "disabled" : ""} aria-label="Previous years">&lt;</button>
          <span class="calendar-title-label">${calYearRangeStart} – ${rangeEnd}</span>
          <button type="button" class="cal-nav-btn" id="cal-year-next-range-btn" aria-label="Next years">&gt;</button>
        </div>
        <div class="calendar-selection-grid">
          ${yearsHtml}
        </div>
      `;

      const prevRangeBtn = calDropdown.querySelector("#cal-year-prev-range-btn");
      const nextRangeBtn = calDropdown.querySelector("#cal-year-next-range-btn");

      if (prevRangeBtn && !isPrevRangeDisabled) {
        prevRangeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calYearRangeStart = Math.max(currentYear, calYearRangeStart - 12);
          renderCalendar();
        });
      }

      if (nextRangeBtn) {
        nextRangeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calYearRangeStart += 12;
          renderCalendar();
        });
      }

      calDropdown.querySelectorAll(".cal-grid-item:not(:disabled)").forEach((yBtn) => {
        yBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          calViewYear = parseInt(yBtn.dataset.year, 10);
          calViewMode = "date";
          renderCalendar();
        });
      });
    }
  }

  // Initial render of calendar contents
  renderCalendar();

  // Toggle calendar dropdown on button click
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.calendarOpen = !state.calendarOpen;
    calDropdown.style.display = state.calendarOpen ? "block" : "none";
    if (state.calendarOpen) {
      renderCalendar();
    }
  });

  // Open calendar on date input click
  dateInput.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!state.calendarOpen) {
      state.calendarOpen = true;
      calDropdown.style.display = "block";
      renderCalendar();
    }
  });

  // Real-time manual typing validation
  dateInput.addEventListener("input", () => {
    const val = dateInput.value.trim();
    if (!val) {
      clearDateError();
      return;
    }
    const validation = validateTargetDate(val);
    if (validation.valid) {
      clearDateError();
      state.selectedDate = validation.formatted;
      updateHelperText(validation.date);
      calViewYear = validation.date.getFullYear();
      calViewMonth = validation.date.getMonth();
      renderCalendar();
    }
  });

  // Blur validation
  dateInput.addEventListener("blur", () => {
    const val = dateInput.value.trim();
    const validation = validateTargetDate(val);
    if (!validation.valid) {
      showDateError(validation.message);
    } else {
      clearDateError();
      dateInput.value = validation.formatted;
      state.selectedDate = validation.formatted;
      updateHelperText(validation.date);
    }
  });

  // Back button
  card.querySelector("#back-course-btn").addEventListener("click", () => {
    navigateToStep("goal");
  });

  // Continue button validation & submission
  function handleCourseSubmit(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }

    let hasError = false;

    // Validate Course or subject
    const cName = courseNameInput ? courseNameInput.value.trim() : "";
    if (!cName) {
      showCourseError("Please enter a course or subject to continue.");
      if (courseNameInput) courseNameInput.focus();
      hasError = true;
    } else {
      clearCourseError();
    }

    // Validate Target completion date
    const inputVal = dateInput.value.trim();
    const validation = validateTargetDate(inputVal);

    if (!validation.valid) {
      showDateError(validation.message);
      if (!hasError) {
        dateInput.focus();
      }
      if (!state.calendarOpen) {
        state.calendarOpen = true;
        calDropdown.style.display = "block";
        renderCalendar();
      }
      hasError = true;
    } else {
      clearDateError();
    }

    if (hasError) {
      return;
    }

    // Both valid: update state
    state.answers.course.name = cName;
    state.answers.course.shortName = cName.includes("—")
      ? cName.split("—")[0].trim()
      : cName;

    const courseProgressSelect = card.querySelector("#course-progress-select");
    if (courseProgressSelect) {
      state.answers.course.progress = courseProgressSelect.value;
    }

    state.selectedDate = validation.formatted;
    state.answers.course.targetDate = validation.formatted;
    state.completedSteps.course = true;
    state.calendarOpen = false;

    updateDetailsPanel();
    navigateToStep("availability");
  }

  form.addEventListener("submit", handleCourseSubmit);

  const saveCourseBtn = card.querySelector("#save-course-btn");
  if (saveCourseBtn) {
    saveCourseBtn.addEventListener("click", handleCourseSubmit);
  }
}

// ==========================================================================
// STEP 4: AVAILABILITY ("Your week")
// ==========================================================================
function renderStep4Availability() {
  const chip = createSummaryChip(
    `${state.answers.course.name} · ${state.answers.course.targetDate}`,
    "course"
  );
  const msg = createAssistantMessage(
    "StudentOS",
    "9:45 AM",
    "Tell me how much time you can set aside, what your week already looks like, and when you prefer to study."
  );

  chatHistory.append(chip, msg);

  const card = document.createElement("section");
  card.className = "form-card";
  card.innerHTML = `
    <div class="form-card-header">
      <h2 class="form-card-title">Your week</h2>
      <p class="form-card-subtitle">Step 4 of 5</p>
    </div>
    <form id="step-form-availability">
      <div class="form-group">
        <label class="form-label">Hours you can study each week</label>
        <div class="choices-row" id="hours-choices">
          <button type="button" class="choice-btn" data-hours="Under 3 h">Under 3 h</button>
          <button type="button" class="choice-btn" data-hours="3-5 h">3-5 h</button>
          <button type="button" class="choice-btn active" data-hours="5-8 h">✓ 5-8 h</button>
          <button type="button" class="choice-btn" data-hours="8 h +">8 h +</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Preferred study times</label>
        <div class="choices-row" id="times-choices">
          <button type="button" class="choice-btn active" data-time="Early mornings">✓ Early mornings</button>
          <button type="button" class="choice-btn" data-time="Afternoons">Afternoons</button>
          <button type="button" class="choice-btn active" data-time="Evenings">✓ Evenings</button>
          <button type="button" class="choice-btn" data-time="Weekends">Weekends</button>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Session length</label>
          <select class="form-select" id="session-select">
            <option value="45 min">45 min</option>
            <option value="60 min" selected>60 min</option>
            <option value="90 min">90 min</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Rest day</label>
          <select class="form-select" id="rest-select">
            <option value="Sunday" selected>Sunday</option>
            <option value="Saturday">Saturday</option>
            <option value="None">None</option>
          </select>
        </div>
      </div>

      <div class="form-card-actions">
        <button type="button" class="ghost-btn" id="back-avail-btn">&lt; Back</button>
        <button type="submit" class="primary-pill-btn" id="save-avail-btn">
          <span>&gt;</span> Continue
        </button>
      </div>
    </form>
  `;

  stepCardWrapper.append(card);

  // Wire hours
  const hourBtns = card.querySelectorAll("[data-hours]");
  hourBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      hourBtns.forEach((b) => {
        b.classList.remove("active");
        b.textContent = b.dataset.hours;
      });
      btn.classList.add("active");
      btn.textContent = `✓ ${btn.dataset.hours}`;
      state.answers.availability.hours = btn.dataset.hours;
    });
  });

  // Wire times
  const timeBtns = card.querySelectorAll("[data-time]");
  timeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const val = btn.dataset.time;
      if (btn.classList.contains("active")) {
        btn.textContent = `✓ ${val}`;
        if (!state.answers.availability.studyTimes.includes(val)) {
          state.answers.availability.studyTimes.push(val);
        }
      } else {
        btn.textContent = val;
        state.answers.availability.studyTimes = state.answers.availability.studyTimes.filter((t) => t !== val);
      }
    });
  });

  // Back
  card.querySelector("#back-avail-btn").addEventListener("click", () => {
    navigateToStep("course");
  });

  // Submit
  const form = card.querySelector("#step-form-availability");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    state.answers.availability.sessionLength = card.querySelector("#session-select").value;
    state.answers.availability.restDay = card.querySelector("#rest-select").value;
    state.completedSteps.availability = true;
    navigateToStep("plan");
  });
}

// ==========================================================================
// STEP 5: PLAN REVIEW ("Ready to build your plan")
// ==========================================================================
function renderStep5Plan() {
  const timesStr = state.answers.availability.studyTimes && state.answers.availability.studyTimes.length
    ? state.answers.availability.studyTimes.join(", ")
    : "Early mornings, Evenings";
  const hoursStr = state.answers.availability.hours || "5-8 h";
  const chip = createSummaryChip(`Availability: ${hoursStr} · ${timesStr}`, "availability");
  const msg = createAssistantMessage(
    "StudentOS",
    "9:46 AM",
    "That's everything I need. Here's a summary — check it over, edit anything that's off, and I'll build your plan."
  );

  chatHistory.append(chip, msg);

  const card = document.createElement("section");
  card.className = "form-card";
  const courseName = state.answers.course.name || "CS50P — Harvard, on edX";
  const targetDateDisplay = state.answers.course.targetDate || "Not yet";
  const hoursDisplay = state.answers.availability.hours || "Hours not set";

  card.innerHTML = `
    <div class="form-card-header">
      <h2 class="form-card-title">Ready to build your plan</h2>
      <p class="form-card-subtitle">Step 5 of 5 · Review and confirm</p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 14px;">
        <strong style="color: #00d9eb; font-size: 13px; display: block; margin-bottom: 6px;">Plan Overview</strong>
        <p style="font-size: 13px; color: #dedbe8; line-height: 1.5;">
          <strong>${courseName}</strong><br/>
          Target: ${targetDateDisplay} (${hoursDisplay} per week)
        </p>
      </div>
    </div>
    <div class="form-card-actions">
      <button type="button" class="ghost-btn" id="back-plan-btn">&lt; Back</button>
      <button type="button" class="primary-pill-btn" id="build-plan-btn">
        <span>✓</span> Build my plan
      </button>
    </div>
  `;

  stepCardWrapper.append(card);

  card.querySelector("#back-plan-btn").addEventListener("click", () => {
    navigateToStep("availability");
  });

  card.querySelector("#build-plan-btn").addEventListener("click", () => {
    handleBuildPlan();
  });
}

// ==========================================================================
// PLAN VALIDATION, GENERATION, TIMEOUT & SUCCESS CONTROLLER
// ==========================================================================

function validateAllPlanRequirements() {
  const missing = [];
  const { profile, goal, course, availability } = state.answers;

  // 1. Profile: Name, College, Year, Degree
  const profileComplete = Boolean(
    profile.name && profile.name.trim() &&
    profile.college && profile.college.trim() &&
    profile.year && profile.year.trim() &&
    profile.degree && profile.degree.trim()
  );
  if (!profileComplete) {
    missing.push({
      stepKey: "profile",
      field: "profile",
      title: "Profile details",
      reason: "Add your college, year, and degree so I can fit around your term dates.",
      category: "profile",
    });
  }

  // 2. Goal
  const goalComplete = Boolean((goal.description && goal.description.trim()) || (goal.summary && goal.summary.trim()));
  if (!goalComplete) {
    missing.push({
      stepKey: "goal",
      field: "goal",
      title: "Study goal",
      reason: "Tell me what you want to achieve so I can build a relevant study plan.",
      category: "goal",
    });
  }

  // 3. Course name
  if (!course.name || !course.name.trim() || course.name === "Not yet") {
    missing.push({
      stepKey: "course",
      field: "courseName",
      title: "Course or subject",
      reason: "Add a course or subject so I know what curriculum to pace.",
      category: "course",
    });
  }

  // 4. Target completion date
  const dateCheck = validateTargetDate(course.targetDate);
  if (!dateCheck.valid) {
    missing.push({
      stepKey: "course",
      field: "targetDate",
      title: "Target completion date",
      reason: "Add a target date so I know how to pace the remaining weeks.",
      category: "course",
    });
  }

  // 5. Availability hours
  if (!availability.hours || availability.hours === "Not yet" || !availability.hours.trim()) {
    missing.push({
      stepKey: "availability",
      field: "hours",
      title: "Hours available per week",
      reason: "Choose a range so I don't overbook your week.",
      category: "availability",
    });
  }

  // 6. Availability times
  if (!availability.studyTimes || !Array.isArray(availability.studyTimes) || availability.studyTimes.length === 0) {
    missing.push({
      stepKey: "availability",
      field: "studyTimes",
      title: "Preferred study times",
      reason: "Select your preferred times so I schedule your study slots conveniently.",
      category: "availability",
    });
  }

  return missing;
}

function handleBuildPlan() {
  const missing = validateAllPlanRequirements();
  if (missing.length > 0) {
    updateDetailsPanel(missing);
    renderMissingValidationView(missing);
  } else {
    updateDetailsPanel([]);
    startPlanPreparationFlow();
  }
}

function renderMissingValidationView(missingList) {
  chatHistory.innerHTML = "";
  stepCardWrapper.innerHTML = "";

  const timesStr = state.answers.availability.studyTimes && state.answers.availability.studyTimes.length
    ? state.answers.availability.studyTimes.join(", ")
    : "Early mornings, Evenings";
  const hoursStr = state.answers.availability.hours || "5-8 h";
  const chip = createSummaryChip(`Availability: ${hoursStr} · ${timesStr}`, "availability");
  const assistantSummaryMsg = createAssistantMessage(
    "StudentOS",
    "9:46 AM",
    "That's everything I need. Here's a summary — check it over, edit anything that's off, and I'll build your plan."
  );
  const userBubble = createUserBubble("Build my plan");
  const assistantPrompt = createAssistantMessage(
    "StudentOS",
    "9:47 AM",
    "I need a couple more details before I can build your plan."
  );

  chatHistory.append(chip, assistantSummaryMsg, userBubble, assistantPrompt);

  const card = document.createElement("section");
  card.className = "validation-missing-card";
  card.id = "validation-missing-card";

  const count = missingList.length;
  const headerHtml = `
    <div class="missing-card-header">
      <span class="missing-header-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 18px; height: 18px;">
          <circle cx="12" cy="12" r="9" stroke="#f87171" stroke-width="2" fill="none"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="#f87171" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1" fill="#f87171"/>
        </svg>
      </span>
      <h2 class="missing-header-title">${count} required detail${count === 1 ? "" : "s are"} missing</h2>
    </div>
  `;

  let blocksHtml = '<div class="missing-fields-list">';

  missingList.forEach((item) => {
    if (item.field === "targetDate") {
      const curDateVal = state.answers.course.targetDate && state.answers.course.targetDate !== "Choosing..." && state.answers.course.targetDate !== "Not yet"
        ? state.answers.course.targetDate
        : "";
      blocksHtml += `
        <div class="missing-field-block" id="block-targetDate">
          <label class="missing-field-label">Target completion date <span class="badge-required">Required</span></label>
          <div class="date-input-wrapper" style="position: relative;">
            <input class="form-input focus-cyan" id="missing-date-input" type="text" value="${curDateVal}" placeholder="e.g. 15 March 2027" style="border-color: #f87171;" autocomplete="off" />
            <button type="button" class="date-calendar-btn" id="missing-date-toggle" aria-label="Toggle calendar">
              <svg class="date-calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="16" rx="2" />
                <path d="M7.5 3v4M16.5 3v4M4 10h16" />
              </svg>
            </button>
            <div class="calendar-dropdown" id="missing-cal-dropdown" style="display: none;"></div>
          </div>
          <div id="missing-date-error" class="date-error-message" style="display: none;"></div>
          <span class="missing-field-reason">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            ${item.reason}
          </span>
        </div>
      `;
    } else if (item.field === "hours") {
      const options = ["1-4 h", "5-8 h", "9-12 h", "13+ h"];
      blocksHtml += `
        <div class="missing-field-block" id="block-hours">
          <label class="missing-field-label">Hours available per week <span class="badge-required">Required</span></label>
          <div class="pill-group" id="missing-hours-group" style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${options.map((h) => `
              <button type="button" class="choice-pill-btn ${state.answers.availability.hours === h ? "active" : ""}" data-hours="${h}" style="${!state.answers.availability.hours ? "border-color: rgba(248, 113, 113, 0.4);" : ""}">
                ${h}
              </button>
            `).join("")}
          </div>
          <span class="missing-field-reason">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            ${item.reason}
          </span>
        </div>
      `;
    } else if (item.field === "studyTimes") {
      const times = ["Early mornings", "Mornings", "Afternoons", "Evenings", "Late nights"];
      blocksHtml += `
        <div class="missing-field-block" id="block-studyTimes">
          <label class="missing-field-label">Preferred study times <span class="badge-required">Required</span></label>
          <div class="pill-group" id="missing-times-group" style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${times.map((t) => {
              const active = (state.answers.availability.studyTimes || []).includes(t);
              return `<button type="button" class="choice-pill-btn ${active ? "active" : ""}" data-time="${t}">${t}</button>`;
            }).join("")}
          </div>
          <span class="missing-field-reason">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            ${item.reason}
          </span>
        </div>
      `;
    } else if (item.field === "goal") {
      blocksHtml += `
        <div class="missing-field-block" id="block-goal">
          <label class="missing-field-label">Study goal <span class="badge-required">Required</span></label>
          <input type="text" class="form-input focus-cyan" id="missing-goal-input" placeholder="e.g. Finish CS50 Python" value="${state.answers.goal.description || state.answers.goal.summary || ""}" style="border-color: #f87171;" />
          <span class="missing-field-reason">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            ${item.reason}
          </span>
        </div>
      `;
    } else if (item.field === "courseName") {
      blocksHtml += `
        <div class="missing-field-block" id="block-courseName">
          <label class="missing-field-label">Course or subject <span class="badge-required">Required</span></label>
          <input type="text" class="form-input focus-cyan" id="missing-course-input" placeholder="e.g. CS50P — Harvard, on edX" value="${state.answers.course.name || ""}" style="border-color: #f87171;" />
          <span class="missing-field-reason">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            ${item.reason}
          </span>
        </div>
      `;
    } else if (item.field === "profile") {
      blocksHtml += `
        <div class="missing-field-block" id="block-profile">
          <label class="missing-field-label">Profile details <span class="badge-required">Required</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <input type="text" class="form-input focus-cyan" id="missing-college-input" placeholder="College or institution" value="${state.answers.profile.college || ""}" style="border-color: #f87171;" />
            <input type="text" class="form-input focus-cyan" id="missing-degree-input" placeholder="Degree or course" value="${state.answers.profile.degree || ""}" style="border-color: #f87171;" />
          </div>
          <span class="missing-field-reason">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            ${item.reason}
          </span>
        </div>
      `;
    }
  });

  blocksHtml += "</div>";

  const actionsHtml = `
    <div class="form-card-actions" style="margin-top: 18px;">
      <button type="button" class="ghost-btn" id="missing-back-btn">&lt; Back</button>
      <button type="button" class="primary-pill-btn" id="missing-build-plan-btn">
        <span>✓</span> Build my plan
      </button>
    </div>
  `;

  card.innerHTML = headerHtml + blocksHtml + actionsHtml;
  stepCardWrapper.append(card);

  // Wire up dynamic handlers inside the missing validation card

  // 1. Target Date handling
  const dateInput = card.querySelector("#missing-date-input");
  const dateToggle = card.querySelector("#missing-date-toggle");
  const calDropdown = card.querySelector("#missing-cal-dropdown");
  const dateError = card.querySelector("#missing-date-error");

  if (dateInput && dateToggle && calDropdown) {
    let calYear = 2027;
    let calMonth = 2; // March

    function renderMiniCal() {
      const today = getTodayMidnight();
      const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
      const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      let html = `
        <div class="cal-header">
          <button type="button" class="cal-nav-btn" id="mini-cal-prev">&lt;</button>
          <div class="cal-title">${monthNames[calMonth]} ${calYear}</div>
          <button type="button" class="cal-nav-btn" id="mini-cal-next">&gt;</button>
        </div>
        <div class="cal-weekdays">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>
        <div class="cal-days-grid">
      `;

      for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day-empty"></div>';
      }

      for (let d = 1; d <= totalDays; d++) {
        const cellDate = new Date(calYear, calMonth, d, 0, 0, 0, 0);
        const isPastOrToday = cellDate.getTime() <= today.getTime();
        html += `<div class="cal-day ${isPastOrToday ? "disabled" : ""}" data-day="${d}">${d}</div>`;
      }

      html += "</div>";
      calDropdown.innerHTML = html;

      calDropdown.querySelector("#mini-cal-prev").addEventListener("click", (e) => {
        e.stopPropagation();
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderMiniCal();
      });

      calDropdown.querySelector("#mini-cal-next").addEventListener("click", (e) => {
        e.stopPropagation();
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderMiniCal();
      });

      calDropdown.querySelectorAll(".cal-day:not(.disabled)").forEach((dayEl) => {
        dayEl.addEventListener("click", (e) => {
          e.stopPropagation();
          const day = parseInt(dayEl.getAttribute("data-day"), 10);
          const pickedDate = new Date(calYear, calMonth, day, 0, 0, 0, 0);
          const formatted = formatDate(pickedDate);
          dateInput.value = formatted;
          state.answers.course.targetDate = formatted;
          state.selectedDate = formatted;
          state.completedSteps.course = true;
          calDropdown.style.display = "none";
          dateInput.style.borderColor = "";
          if (dateError) dateError.style.display = "none";
          updateDetailsPanel(validateAllPlanRequirements());
        });
      });
    }

    dateToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = calDropdown.style.display !== "none";
      calDropdown.style.display = isOpen ? "none" : "block";
      if (!isOpen) renderMiniCal();
    });

    dateInput.addEventListener("input", () => {
      const val = dateInput.value.trim();
      const check = validateTargetDate(val);
      if (check.valid) {
        state.answers.course.targetDate = check.formatted;
        state.selectedDate = check.formatted;
        state.completedSteps.course = true;
        dateInput.style.borderColor = "";
        if (dateError) dateError.style.display = "none";
        updateDetailsPanel(validateAllPlanRequirements());
      } else {
        dateInput.style.borderColor = "#f87171";
      }
    });
  }

  // 2. Hours buttons handling
  const hoursGroup = card.querySelector("#missing-hours-group");
  if (hoursGroup) {
    hoursGroup.querySelectorAll(".choice-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        hoursGroup.querySelectorAll(".choice-pill-btn").forEach((b) => {
          b.classList.remove("active");
          b.style.borderColor = "";
        });
        btn.classList.add("active");
        const chosen = btn.getAttribute("data-hours");
        state.answers.availability.hours = chosen;
        state.completedSteps.availability = true;
        updateDetailsPanel(validateAllPlanRequirements());
      });
    });
  }

  // 3. Study times handling
  const timesGroup = card.querySelector("#missing-times-group");
  if (timesGroup) {
    timesGroup.querySelectorAll(".choice-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const timeVal = btn.getAttribute("data-time");
        if (!state.answers.availability.studyTimes) {
          state.answers.availability.studyTimes = [];
        }
        const idx = state.answers.availability.studyTimes.indexOf(timeVal);
        if (idx >= 0) {
          state.answers.availability.studyTimes.splice(idx, 1);
          btn.classList.remove("active");
        } else {
          state.answers.availability.studyTimes.push(timeVal);
          btn.classList.add("active");
        }
        updateDetailsPanel(validateAllPlanRequirements());
      });
    });
  }

  // 4. Goal input handling
  const goalInput = card.querySelector("#missing-goal-input");
  if (goalInput) {
    goalInput.addEventListener("input", () => {
      const val = goalInput.value.trim();
      state.answers.goal.description = val;
      state.answers.goal.summary = val;
      if (val) {
        state.completedSteps.goal = true;
        goalInput.style.borderColor = "";
      }
      updateDetailsPanel(validateAllPlanRequirements());
    });
  }

  // 5. Course name input handling
  const courseInput = card.querySelector("#missing-course-input");
  if (courseInput) {
    courseInput.addEventListener("input", () => {
      const val = courseInput.value.trim();
      state.answers.course.name = val;
      state.answers.course.shortName = val.split("—")[0].trim() || val;
      if (val) courseInput.style.borderColor = "";
      updateDetailsPanel(validateAllPlanRequirements());
    });
  }

  // 6. Profile inputs handling
  const collegeInput = card.querySelector("#missing-college-input");
  const degreeInput = card.querySelector("#missing-degree-input");
  if (collegeInput && degreeInput) {
    const updateProfile = () => {
      state.answers.profile.college = collegeInput.value.trim();
      state.answers.profile.degree = degreeInput.value.trim();
      updateDetailsPanel(validateAllPlanRequirements());
    };
    collegeInput.addEventListener("input", updateProfile);
    degreeInput.addEventListener("input", updateProfile);
  }

  // Navigation actions
  card.querySelector("#missing-back-btn").addEventListener("click", () => {
    navigateToStep("availability");
  });

  card.querySelector("#missing-build-plan-btn").addEventListener("click", () => {
    handleBuildPlan();
  });
}

function generateStudyPlan(answers) {
  const targetDateParsed = parseDateString(answers.course.targetDate) || new Date();
  const today = getTodayMidnight();
  const diffMs = Math.max(0, targetDateParsed.getTime() - today.getTime());
  const weeksCount = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));

  const hours = answers.availability.hours || "5-8 h";
  const sessionsCount = hours.includes("1-4") ? "3" : hours.includes("9-12") ? "5" : hours.includes("13") ? "6" : "4";

  const m1Date = new Date(today.getTime() + Math.round(diffMs * 0.33));
  const m2Date = new Date(today.getTime() + Math.round(diffMs * 0.67));
  const m3Date = targetDateParsed;

  const plan = {
    id: "plan_" + Date.now(),
    courseName: answers.course.name || "CS50P — Harvard, on edX",
    targetDate: answers.course.targetDate || formatDate(targetDateParsed),
    weeksCount: weeksCount,
    weeklyHours: answers.availability.hours || "5-8 h",
    sessionsPerWeek: sessionsCount,
    sessionLength: answers.availability.sessionLength || "60 min",
    studyTimes: answers.availability.studyTimes || ["Early mornings", "Evenings"],
    restDay: answers.availability.restDay || "Sunday",
    college: answers.profile.college || "Northfield Institute of Technology",
    degree: answers.profile.degree || "B.Tech, Computer Science",
    milestones: [
      { id: 1, title: "Milestone 1: Core Fundamentals & Concept Mastery", date: formatDate(m1Date) },
      { id: 2, title: "Milestone 2: Intermediate Problem Sets & Mini-Project", date: formatDate(m2Date) },
      { id: 3, title: "Milestone 3: Final Project Submission & Exam Review", date: formatDate(m3Date) },
    ],
    createdAt: new Date().toISOString(),
  };

  return plan;
}

function startPlanPreparationFlow() {
  chatHistory.innerHTML = "";
  stepCardWrapper.innerHTML = "";

  const chip = createSummaryChip(
    `${state.answers.course.shortName || state.answers.course.name} · Target: ${state.answers.course.targetDate}`,
    "course"
  );
  const userMsg = createUserBubble("Build my plan");

  // Dynamic values
  const targetDateObj = parseDateString(state.answers.course.targetDate) || new Date();
  const today = getTodayMidnight();
  const diffMs = Math.max(0, targetDateObj.getTime() - today.getTime());
  const diffWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
  const courseShort = state.answers.course.shortName || (state.answers.course.name ? state.answers.course.name.split("—")[0].trim() : "your course");
  const restDay = state.answers.availability.restDay || "Sunday";
  const hours = state.answers.availability.hours || "5-8 h";
  const sessionsCount = hours.includes("1-4") ? "2-3" : hours.includes("9-12") ? "5-6" : hours.includes("13") ? "6-7" : "4-5";

  const assistantMsg = createAssistantMessage(
    "StudentOS",
    "9:50 AM",
    `Building your plan now — I'll fit ${diffWeeks} weeks of ${courseShort} around college, the gym and your ${restDay} rest.`
  );

  chatHistory.append(chip, userMsg, assistantMsg);

  const card = document.createElement("section");
  card.className = "prep-card";
  card.id = "prep-card";
  card.innerHTML = `
    <div class="prep-card-header">
      <div class="prep-spinner"></div>
      <h2 class="prep-header-title">Preparing your personalised plan...</h2>
    </div>
    <div class="prep-stages-list">
      <div class="prep-stage-item in-progress" id="prep-stage-1">
        <div class="stage-status-icon" id="stage-icon-1">
          <div class="prep-spinner" style="width: 14px; height: 14px; border-width: 1.5px;"></div>
        </div>
        <div class="stage-info">
          <span class="stage-title">Reading your week</span>
          <span class="stage-subtitle">College, gym, rest days and free hours.</span>
        </div>
      </div>

      <div class="prep-stage-item pending" id="prep-stage-2">
        <div class="stage-status-icon" id="stage-icon-2">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: #6b667b; stroke-width: 2; fill: none;"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 15 15"/></svg>
        </div>
        <div class="stage-info">
          <span class="stage-title">Fitting ${diffWeeks} weeks of lectures and problem sets</span>
          <span class="stage-subtitle">Around ${sessionsCount} sessions a week.</span>
        </div>
      </div>

      <div class="prep-stage-item pending" id="prep-stage-3">
        <div class="stage-status-icon" id="stage-icon-3">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: #6b667b; stroke-width: 2; fill: none;"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 15 15"/></svg>
        </div>
        <div class="stage-info">
          <span class="stage-title">Adding buffer time</span>
          <span class="stage-subtitle">So a missed session doesn't push your date.</span>
        </div>
      </div>

      <div class="prep-stage-item pending" id="prep-stage-4">
        <div class="stage-status-icon" id="stage-icon-4">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: #6b667b; stroke-width: 2; fill: none;"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 15 15"/></svg>
        </div>
        <div class="stage-info">
          <span class="stage-title">Setting milestones</span>
          <span class="stage-subtitle">Checkpoints you can track.</span>
        </div>
      </div>
    </div>
    <div class="prep-progress-bar-container">
      <div class="prep-progress-bar-fill" id="prep-progress-fill" style="width: 15%;"></div>
    </div>
    <p class="prep-footer-note">Usually takes a few seconds. Nothing is saved until you accept.</p>
  `;

  stepCardWrapper.append(card);

  const checkSvg = `
    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">
      <circle cx="12" cy="12" r="9" fill="#10b981" stroke="#10b981"/>
      <path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `;
  const spinnerSvg = `<div class="prep-spinner" style="width: 14px; height: 14px; border-width: 1.5px;"></div>`;

  const fillEl = card.querySelector("#prep-progress-fill");

  function setStage(idx, status) {
    const item = card.querySelector(`#prep-stage-${idx}`);
    const icon = card.querySelector(`#stage-icon-${idx}`);
    if (!item || !icon) return;
    item.className = `prep-stage-item ${status}`;
    if (status === "completed") {
      icon.innerHTML = checkSvg;
    } else if (status === "in-progress") {
      icon.innerHTML = spinnerSvg;
    }
  }

  // Animation timeline through stages
  setTimeout(() => {
    setStage(1, "completed");
    setStage(2, "in-progress");
    if (fillEl) fillEl.style.width = "40%";
  }, 600);

  setTimeout(() => {
    setStage(2, "completed");
    setStage(3, "in-progress");
    if (fillEl) fillEl.style.width = "65%";
  }, 1200);

  setTimeout(() => {
    setStage(3, "completed");
    setStage(4, "in-progress");
    if (fillEl) fillEl.style.width = "88%";
  }, 1800);

  setTimeout(() => {
    setStage(4, "completed");
    if (fillEl) fillEl.style.width = "100%";
  }, 2400);

  setTimeout(() => {
    if (state.simulateTimeout) {
      renderPlannerTimeoutView();
    } else {
      const plan = generateStudyPlan(state.answers);
      try {
        localStorage.setItem("studentos_study_plan", JSON.stringify(plan));
      } catch (e) {}
      renderPlanSuccessView(plan);
    }
  }, 2900);
}

function renderPlannerTimeoutView() {
  chatHistory.innerHTML = "";
  stepCardWrapper.innerHTML = "";

  const chip = createSummaryChip(
    `${state.answers.course.shortName || state.answers.course.name} · Target: ${state.answers.course.targetDate}`,
    "course"
  );
  const userMsg = createUserBubble("Build my plan");
  const assistantMsg = createAssistantMessage(
    "StudentOS",
    "9:51 AM",
    "I couldn't finish your plan this time. That's on my side, not something you did — all your answers are still here."
  );

  chatHistory.append(chip, userMsg, assistantMsg);

  const card = document.createElement("section");
  card.className = "timeout-card";
  card.id = "timeout-card";
  card.innerHTML = `
    <div class="timeout-top-box">
      <svg class="timeout-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r="1" fill="#f87171"/>
      </svg>
      <div>
        <h2 class="timeout-title">The planner timed out</h2>
        <p class="timeout-desc">It took too long to fit your sessions. Retrying usually works. If it keeps happening, try fewer preferred time windows.</p>
      </div>
    </div>

    <div class="timeout-saved-box">
      <div class="timeout-saved-header">Saved and ready to reuse</div>
      <div class="timeout-saved-list">
        <div class="timeout-saved-item">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#10b981"/><path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          <span>${state.answers.course.shortName || state.answers.course.name} · finish by ${state.answers.course.targetDate}</span>
        </div>
        <div class="timeout-saved-item">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#10b981"/><path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          <span>${state.answers.availability.hours} a week · ${state.answers.availability.studyTimes.join(" and ").toLowerCase()} · ${state.answers.availability.sessionLength || "60 min"} sessions</span>
        </div>
        <div class="timeout-saved-item">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#10b981"/><path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          <span>College ${state.answers.profile.college || "Northfield"} · Rest on ${state.answers.availability.restDay || "Sunday"}</span>
        </div>
      </div>
    </div>

    <div class="timeout-actions">
      <button type="button" class="ghost-btn" id="timeout-edit-btn">Edit preferences</button>
      <button type="button" class="primary-pill-btn" id="timeout-retry-btn">
        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.5; fill: none; margin-right: 4px;">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        Retry
      </button>
    </div>
  `;

  stepCardWrapper.append(card);

  card.querySelector("#timeout-edit-btn").addEventListener("click", () => {
    navigateToStep("availability");
  });

  card.querySelector("#timeout-retry-btn").addEventListener("click", () => {
    state.simulateTimeout = false;
    startPlanPreparationFlow();
  });
}

function renderPlanSuccessView(plan) {
  chatHistory.innerHTML = "";
  stepCardWrapper.innerHTML = "";

  const chip = createSummaryChip(
    `${plan.courseName} · Target: ${plan.targetDate}`,
    "course"
  );
  const userMsg = createUserBubble("Build my plan");
  const assistantMsg = createAssistantMessage(
    "StudentOS",
    "9:52 AM",
    `Your study plan is ready! I've scheduled ${plan.weeksCount} weeks across ${plan.sessionsPerWeek} weekly sessions, with buffers built in before your target date of ${plan.targetDate}.`
  );

  chatHistory.append(chip, userMsg, assistantMsg);

  const card = document.createElement("section");
  card.className = "plan-result-card";
  card.id = "plan-result-card";
  card.innerHTML = `
    <div class="form-card-header">
      <h2 class="form-card-title">Personalised Study Plan Generated</h2>
      <p class="form-card-subtitle">Review your scheduled milestones and commit when ready</p>
    </div>

    <div class="plan-overview-grid">
      <div class="plan-stat-box">
        <div class="plan-stat-val">${plan.weeksCount} wks</div>
        <div class="plan-stat-lbl">Duration</div>
      </div>
      <div class="plan-stat-box">
        <div class="plan-stat-val">${plan.weeklyHours}</div>
        <div class="plan-stat-lbl">Weekly Effort</div>
      </div>
      <div class="plan-stat-box">
        <div class="plan-stat-val">${plan.sessionsPerWeek} / wk</div>
        <div class="plan-stat-lbl">Study Sessions</div>
      </div>
      <div class="plan-stat-box">
        <div class="plan-stat-val">${plan.restDay}</div>
        <div class="plan-stat-lbl">Rest Day</div>
      </div>
    </div>

    <div class="plan-milestones">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 10px;">
        Scheduled Milestones & Checkpoints
      </div>
      ${plan.milestones.map((m) => `
        <div class="plan-milestone-item">
          <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; flex-shrink: 0;"><circle cx="12" cy="12" r="9" fill="#10b981" stroke="#10b981"/><path d="m9 12 2 2 4-4" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          <span style="flex: 1;">${m.title}</span>
          <span style="color: var(--accent-cyan); font-weight: 600; font-size: 12px;">${m.date}</span>
        </div>
      `).join("")}
    </div>

    <div class="form-card-actions">
      <button type="button" class="ghost-btn" id="success-edit-btn">Edit preferences</button>
      <button type="button" class="primary-pill-btn" id="success-accept-btn">
        <span>✓</span> Accept & View Study Plan
      </button>
    </div>
  `;

  stepCardWrapper.append(card);

  card.querySelector("#success-edit-btn").addEventListener("click", () => {
    navigateToStep("availability");
  });

  card.querySelector("#success-accept-btn").addEventListener("click", () => {
    try {
      localStorage.setItem("studentos_study_plan", JSON.stringify(plan));
      localStorage.setItem("studentos_plan_accepted", "true");
    } catch (e) {}

    if (displayTargetDate && plan.targetDate) {
      displayTargetDate.textContent = plan.targetDate;
    }
    if (displayPace && plan.weeklyHours) {
      displayPace.textContent = `${plan.weeklyHours} hrs/week`;
    }
    const heroTitle = document.querySelector(".plan-hero .hero-title");
    if (heroTitle && plan.course) {
      heroTitle.textContent = `${plan.course} Study Plan`;
    }

    if (typeof showView === "function") {
      showView("plan");
    }
  });
}

// Global hooks for testing & automation
window.triggerPlanFailure = function (flag = true) {
  state.simulateTimeout = flag;
};
window.studentOSState = state;
window.handleBuildPlan = handleBuildPlan;
window.validateAllPlanRequirements = validateAllPlanRequirements;
window.startPlanPreparationFlow = startPlanPreparationFlow;
window.navigateToStep = navigateToStep;

// ==========================================================================
// Event Listeners & Initialization
// ==========================================================================

// Stepper click navigation
Object.entries(stepperNodes).forEach(([stepKey, node]) => {
  node.addEventListener("click", () => {
    navigateToStep(stepKey);
  });
});

// Sidebar detail edit clicks
sidebarDetails.editProfile.addEventListener("click", () => navigateToStep("profile"));
sidebarDetails.editGoal.addEventListener("click", () => navigateToStep("goal"));
sidebarDetails.editCourse.addEventListener("click", () => navigateToStep("course"));
sidebarDetails.editAvailability.addEventListener("click", () => navigateToStep("availability"));

// Screen 1 Action cards
const lookAroundBtn = document.getElementById("look-around-btn");
if (lookAroundBtn) {
  lookAroundBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof showView === "function") {
      showView("dashboard");
    }
  });
}

const exitViewBtn = document.getElementById("exit-view-btn");
if (exitViewBtn) {
  exitViewBtn.addEventListener("click", () => {
    if (typeof showView === "function") {
      showView("plan");
    }
  });
}

startSetupBtn.addEventListener("click", () => {
  navigateToStep("profile");
});

showQuestionsBtn.addEventListener("click", () => {
  questionsDialog.showModal();
});

closeQuestionsBtn.addEventListener("click", () => {
  questionsDialog.close();
});

startFromPreviewBtn.addEventListener("click", () => {
  questionsDialog.close();
  navigateToStep("profile");
});

// Theme Toggle
themeDarkBtn.addEventListener("click", () => {
  document.body.classList.remove("light-theme");
  document.body.classList.add("dark-theme");
  themeDarkBtn.classList.add("active");
  themeLightBtn.classList.remove("active");
  state.theme = "dark";
});

themeLightBtn.addEventListener("click", () => {
  document.body.classList.remove("dark-theme");
  document.body.classList.add("light-theme");
  themeLightBtn.classList.add("active");
  themeDarkBtn.classList.remove("active");
  state.theme = "light";
});

// Fullscreen toggle
fullscreenToggle.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Composer Chat Form
composerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  messageInput.value = "";

  if (state.currentStep === "welcome") {
    navigateToStep("profile");
  } else {
    const bubble = createUserBubble(text);
    chatHistory.append(bubble);
    bubble.scrollIntoView({ behavior: "smooth" });
  }
});

// Shift+Enter / Enter handling
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composerForm.dispatchEvent(new Event("submit"));
  }
});

// Attach file mock
attachBtn.addEventListener("click", () => {
  attachmentInput.click();
});

attachmentInput.addEventListener("change", () => {
  if (attachmentInput.files.length > 0) {
    attachmentName.textContent = attachmentInput.files[0].name;
  }
});

// Sidebar Ask StudentOS handled by main controller

// Synchronize dashboard and sidebar profile with AI Assistant answers state
function syncDashboardWithState() {
  const answers = state.answers || {};
  const profile = answers.profile || {};
  const goal = answers.goal || {};
  const course = answers.course || {};

  const fullName = (profile.name && profile.name.trim()) ? profile.name.trim() : "Aarav Mehta";
  const firstName = fullName.split(" ")[0] || "Aarav";

  // Dashboard Header Greeting
  const welcomeTitle = document.querySelector(".welcome-title");
  if (welcomeTitle) {
    welcomeTitle.textContent = `Good evening, ${firstName}`;
  }

  // AI Assistant Welcome Heading
  const aiWelcomeHeading = document.getElementById("welcome-heading");
  if (aiWelcomeHeading) {
    aiWelcomeHeading.textContent = `Welcome to StudentOS, ${firstName}`;
  }

  // Sidebar User Profile
  const sidebarUserName = document.querySelector(".user-name");
  if (sidebarUserName) {
    sidebarUserName.textContent = fullName;
  }
  const sidebarAvatar = document.querySelector(".avatar");
  if (sidebarAvatar) {
    const initials = fullName.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "AM";
    sidebarAvatar.textContent = initials;
  }
  const sidebarUserRole = document.querySelector(".user-role");
  if (sidebarUserRole) {
    const degree = profile.degree || "B.Tech CSE";
    const year = profile.year || "Year 2";
    sidebarUserRole.textContent = `${degree} · ${year}`;
  }

  // Subtitles & Course / Goal Info
  const courseName = course.name || "CS50P — Harvard, on edX";
  const courseShort = course.shortName || (course.name ? course.name.split(" ")[0] : "CS50P");
  const targetDate = course.targetDate || state.selectedDate || "15 March 2027";
  const goalDescription = goal.description || `Finish ${courseName}`;

  const welcomeSubtitle = document.querySelector(".welcome-subtitle");
  if (welcomeSubtitle) {
    welcomeSubtitle.innerHTML = `Thursday, 29 October &middot; Week 1 of your ${courseShort} plan`;
  }

  const viewPlanDesc = document.querySelector("#cardViewStudyPlan .quick-desc");
  if (viewPlanDesc) {
    viewPlanDesc.innerHTML = `${courseShort} &middot; 19 weeks`;
  }

  const goalCourseTitle = document.querySelector(".goal-course-title");
  if (goalCourseTitle) {
    goalCourseTitle.textContent = goalDescription;
  }

  const goalMetaRow = document.querySelector(".goal-meta-row");
  if (goalMetaRow) {
    goalMetaRow.innerHTML = `<span>Target: ${targetDate}</span> <span>Plan ends: 8 Mar 2027</span>`;
  }

  // Priorities Checkbox States
  const pList = document.getElementById("prioritiesList");
  if (pList) {
    let saved = null;
    try {
      const raw = localStorage.getItem("studentos_priorities_state");
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    const checkboxes = pList.querySelectorAll(".task-checkbox");
    checkboxes.forEach((cb, idx) => {
      if (saved && typeof saved[idx] === "boolean") {
        cb.checked = saved[idx];
      }
      const row = cb.closest ? cb.closest(".priority-row") : null;
      const textEl = row?.querySelector(".priority-text") || row?.querySelector(".priority-name");
      if (textEl) {
        if (cb.checked) {
          textEl.style.textDecoration = "line-through";
          textEl.style.opacity = "0.5";
        } else {
          textEl.style.textDecoration = "none";
          textEl.style.opacity = "1";
        }
      }
    });
  }

  // Attention Card Persistence
  const attCard = document.getElementById("attentionCard");
  if (attCard) {
    let attState = null;
    try {
      attState = localStorage.getItem("studentos_attention_state");
    } catch (e) {}

    if (attState === "dismissed") {
      attCard.style.display = "none";
    } else if (attState === "accepted") {
      attCard.style.display = "";
      const btnAccept = document.getElementById("btnAcceptSundayBuffer");
      if (btnAccept) {
        btnAccept.innerHTML = "<span>✓ Sunday Buffer Accepted</span>";
        btnAccept.disabled = true;
        btnAccept.style.opacity = "0.7";
      }
    } else {
      attCard.style.display = "";
      const btnAccept = document.getElementById("btnAcceptSundayBuffer");
      if (btnAccept) {
        btnAccept.innerHTML = "<span>Accept Sunday Buffer</span>";
        btnAccept.disabled = false;
        btnAccept.style.opacity = "";
      }
    }
  }
}

// Function to open AI Assistant view while preserving in-progress onboarding state
function openAiAssistantView() {
  if (typeof showView === "function") {
    showView("aiAssistant");
  }
  if (!state.currentStep) {
    navigateToStep("welcome");
  }
  const messageInput = document.getElementById("message-input");
  if (state.currentStep === "welcome" && messageInput) {
    messageInput.focus();
  }
}

// Expose on window for Dashboard & global interoperability
window.openAiAssistantView = openAiAssistantView;
window.syncDashboardWithState = syncDashboardWithState;
window.navigateToStep = navigateToStep;
window.studentOSState = state;

// Sidebar AI Assistant nav item click -> preserve in-progress setup
const navAssistant = document.getElementById("navAssistant");
if (navAssistant) {
  navAssistant.addEventListener("click", (e) => {
    e.preventDefault();
    openAiAssistantView();
  });
}

// Sidebar Ask StudentOS handled by main controller

// Outside click to close calendar if clicked outside
document.addEventListener("click", (e) => {
  const calDropdown = document.getElementById("calendar-dropdown");
  const dateInput = document.getElementById("course-date-input");
  const toggleBtn = document.getElementById("date-calendar-toggle");
  if (calDropdown && state.currentStep === "course") {
    const isInsideDropdown = calDropdown.contains(e.target);
    const isInput = dateInput && (e.target === dateInput || dateInput.contains(e.target));
    const isToggle = toggleBtn && (e.target === toggleBtn || toggleBtn.contains(e.target));
    if (!isInsideDropdown && !isInput && !isToggle) {
      state.calendarOpen = false;
      calDropdown.style.display = "none";
    }
  }
});

// Initialize on page load to Welcome screen
navigateToStep("welcome");

    }

    // Initialize AI Assistant Module
    initAiAssistantModule();

    // Default view routing: Dashboard is the default landing page
    if (window.location.hash === "#aiAssistant" || window.location.hash === "#assistant") {
        showView("aiAssistant");
    } else if (window.location.hash === "#schedule") {
        showView("mainSchedule");
    } else if (window.location.hash === "#courses" || window.location.hash === "#goals") {
        showView("coursesGoals");
    } else if (window.location.hash === "#plan") {
        if (typeof isPlanAccepted === "function" && isPlanAccepted()) {
            showView("plan");
        } else {
            showView("aiAssistant");
        }
    } else {
        // Fresh load and refresh default landing page is DASHBOARD
        showView("dashboard");
    }

    // Initial sync of dashboard data
    if (typeof syncDashboardWithState === "function") {
        syncDashboardWithState();
    } else if (typeof window.syncDashboardWithState === "function") {
        window.syncDashboardWithState();
    }

});
