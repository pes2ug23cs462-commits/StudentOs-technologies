
document.addEventListener("DOMContentLoaded", () => {
  const timelineList = document.getElementById("timelineList");
  const tabs = document.querySelectorAll(".timeline-tab");
  const typeSelect = document.getElementById("eventTypeSelect");
  const addButton = document.getElementById("addMilestoneButton");
  const modal = document.getElementById("milestoneModal");
  const form = document.getElementById("milestoneForm");
  const closeButton = document.getElementById("closeMilestoneButton");
  const cancelButton = document.getElementById("cancelMilestoneButton");
  const searchInput = document.getElementById("globalSearch");
  const emptyState = document.getElementById("emptyTimeline");
  const toast = document.getElementById("toast");
  const notificationButton = document.getElementById("notificationButton");

  let activeCategory = "all";
  let toastTimeout;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function getCategoryClass(category) {
    const classes = {
      Academic: "academic-tag",
      Experience: "experience-tag",
      Achievement: "achievement-tag",
      Personal: "personal-tag"
    };

    return classes[category] || "personal-tag";
  }

  function formatDate(value) {
    if (!value) return "";

    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
  }

  function getMonthValue(value) {
    const [year, month] = value.split("-").map(Number);
    return year * 12 + month;
  }

  function sortTimeline() {
    const events = [
      ...timelineList.querySelectorAll(".timeline-event")
    ];

    events.sort((a, b) => {
      const dateA = getMonthValue(a.dataset.date || "2000-01");
      const dateB = getMonthValue(b.dataset.date || "2000-01");
      return dateB - dateA;
    });

    const groups = new Map();

    events.forEach((event) => {
      const date = event.dataset.date || "2000-01";
      const year = Number(date.split("-")[0]);
      const yearLabel = `YEAR ${year - 2022} · ${year}–${String(year + 1).slice(-2)}`;

      if (!groups.has(yearLabel)) {
        groups.set(yearLabel, []);
      }

      groups.get(yearLabel).push(event);
    });

    timelineList.replaceChildren();

    groups.forEach((yearEvents, label) => {
      const yearHeading = document.createElement("div");
      yearHeading.className = "timeline-year-label";
      yearHeading.textContent = label;
      timelineList.appendChild(yearHeading);

      yearEvents.forEach((event) => timelineList.appendChild(event));
    });

    applyFilters();
  }

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    timelineList.querySelectorAll(".timeline-event").forEach((event) => {
      const matchesCategory =
        activeCategory === "all" ||
        event.dataset.category === activeCategory;

      const matchesSearch =
        !query || event.textContent.toLowerCase().includes(query);

      const visible = matchesCategory && matchesSearch;

      event.hidden = !visible;

      if (visible) visibleCount++;
    });

    timelineList.querySelectorAll(".timeline-year-label").forEach((heading) => {
      let next = heading.nextElementSibling;
      let hasVisibleEvent = false;

      while (next && !next.classList.contains("timeline-year-label")) {
        if (next.classList.contains("timeline-event") && !next.hidden) {
          hasVisibleEvent = true;
          break;
        }
        next = next.nextElementSibling;
      }

      heading.hidden = !hasVisibleEvent;
    });

    emptyState.hidden = visibleCount > 0;
  }

  function setActiveCategory(category) {
    activeCategory = category;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.filter === category;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    typeSelect.value = category;
    applyFilters();
  }

  tabs.forEach((tab) => {
    tab.setAttribute(
      "aria-selected",
      String(tab.dataset.filter === activeCategory)
    );

    tab.addEventListener("click", () => {
      setActiveCategory(tab.dataset.filter);
    });
  });

  typeSelect.addEventListener("change", () => {
    setActiveCategory(typeSelect.value);
  });

  searchInput.addEventListener("input", applyFilters);

  function openModal() {
    modal.hidden = false;
    document.getElementById("milestoneTitle").focus();
  }

  function closeModal() {
    modal.hidden = true;
    form.reset();
  }

  addButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  cancelButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = document.getElementById("milestoneTitle").value.trim();
    const category = document.getElementById("milestoneCategory").value;
    const dateValue = document.getElementById("milestoneDate").value;
    const description = document.getElementById("milestoneDescription").value.trim();

    if (!title || !dateValue) {
      showToast("Please enter a title and date.");
      return;
    }

    const article = document.createElement("article");
    article.className = "timeline-event";
    article.dataset.category = category;
    article.dataset.date = dateValue;

    const date = document.createElement("div");
    date.className = "event-date";
    date.textContent = formatDate(dateValue);

    const marker = document.createElement("div");
    marker.className = "event-marker";

    const content = document.createElement("div");
    content.className = "event-content";

    const titleRow = document.createElement("div");
    titleRow.className = "event-title-row";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const tag = document.createElement("span");
    tag.className = `event-tag ${getCategoryClass(category)}`;
    tag.textContent = category;

    titleRow.append(heading, tag);
    content.appendChild(titleRow);

    if (description) {
      const paragraph = document.createElement("p");
      paragraph.textContent = description;
      content.appendChild(paragraph);
    }

    article.append(date, marker, content);
    timelineList.appendChild(article);

    closeModal();
    sortTimeline();
    setActiveCategory(category);

    showToast("Milestone added to your timeline.");
  });

  notificationButton.addEventListener("click", () => {
    showToast("You're all caught up!");
  });

  document.querySelectorAll(".semester-button").forEach((button) => {
    button.addEventListener("click", () => {
      showToast("You're viewing Semester 7 · 2026–27.");
    });
  });

  document.querySelectorAll(".nav-link[href='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showToast(`${link.textContent.trim()} page is coming soon.`);
    });
  });

  // Attach dates to the sample events so new milestones can be sorted.
  const sampleDates = [
    "2026-10",
    "2026-07",
    "2026-06",
    "2026-03",
    "2026-01",
    "2025-05"
  ];

  timelineList.querySelectorAll(".timeline-event").forEach((event, index) => {
    event.dataset.date = sampleDates[index] || "2025-01";
  });

  sortTimeline();
});
