// Change level colour when a skill level is picked
function applyLevel(wrap) {
    const level = wrap.querySelector("select").value.toLowerCase();
    wrap.classList.remove("level-beginner", "level-intermediate", "level-advanced");
    wrap.classList.add("level-" + level);
}
document.querySelectorAll(".select-wrap").forEach((wrap) => {
    wrap.querySelector("select").addEventListener("change", () => applyLevel(wrap));
});

// Remove a skill
document.getElementById("skillList").addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-btn");
    if (btn) btn.closest(".skill").remove();
});

// Add a goal
document.getElementById("addGoal").addEventListener("click", () => {
    const title = prompt("Goal title:");
    if (!title || !title.trim()) return;
    const meta = prompt("Category · Due date (e.g. Career · Due Dec 2027):", "General") || "";

    const li = document.createElement("li");
    li.className = "goal";
    li.innerHTML = `
    <div class="goal-top">
      <div class="item-text"><strong></strong><small></small></div>
      <span class="percent">0%</span>
      <button class="edit-btn">Edit</button>
    </div>
    <div class="progress"><span style="width: 0%"></span></div>`;
    li.querySelector("strong").textContent = title.trim();
    li.querySelector("small").textContent = meta.trim();
    document.getElementById("goalList").appendChild(li);
});