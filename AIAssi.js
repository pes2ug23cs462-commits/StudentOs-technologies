document.querySelectorAll(".switch").forEach((toggle) => {
  toggle.addEventListener("change", () => {
    toggle.setAttribute("aria-checked", String(toggle.checked));
  });
});