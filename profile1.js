// ===== Which tab opens which page =====
// (add a new line here whenever you make a new profile page)
const TAB_PAGES = {
    achievements: "profile1.html",
    goals: "profile2.html",
    projects: "profile3.html",
    career: "profile4.html",
};

// ===== Profile tab switching =====
// Tabs listed in TAB_PAGES open their page; the rest just show a placeholder panel.
const tabs = document.querySelectorAll("button.tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const page = TAB_PAGES[tab.dataset.tab];
        if (page) {
            window.location.href = page;
            return;
        }

        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));

        tab.classList.add("active");
        const panel = document.getElementById("panel-" + tab.dataset.tab);
        if (panel) panel.classList.add("active");
    });
});

// ===== ⌘K / Ctrl+K focuses the search box =====
const searchInput = document.getElementById("globalSearch");

document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchInput) searchInput.focus();
    }
});

// ===== Edit buttons (works for achievements and goals) =====
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-btn");
    if (!btn) return;

    const item = btn.closest(".item, .goal");
    if (!item) return;

    const titleEl = item.querySelector("strong");
    const next = prompt("Edit title:", titleEl.textContent);
    if (next && next.trim()) titleEl.textContent = next.trim();
});

// ===== Add achievement (only exists on profile1.html) =====
const achievementList = document.getElementById("achievementList");
const addAchievementBtn = document.getElementById("addAchievement");

const iconSvg =
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>';

if (addAchievementBtn && achievementList) {
    addAchievementBtn.addEventListener("click", () => {
        const title = prompt("Achievement title:");
        if (!title || !title.trim()) return;

        const meta =
            prompt(
                "Category · Date (e.g. Hackathon · Oct 2026):",
                "General · " + new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })
            ) || "";

        const li = document.createElement("li");
        li.className = "item";
        li.innerHTML = `
      <span class="item-icon">${iconSvg}</span>
      <div class="item-text">
        <strong></strong>
        <small></small>
      </div>
      <span class="badge pending">Pending</span>
      <button class="edit-btn">Edit</button>
    `;
        li.querySelector("strong").textContent = title.trim();
        li.querySelector("small").textContent = meta.trim();
        achievementList.appendChild(li);
    });
}