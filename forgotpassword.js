const forgotForm = document.getElementById("forgotForm");
const forgotEmail = document.getElementById("forgotEmail");
const forgotEmailError = document.getElementById("forgotEmailError");
const forgotMessage = document.getElementById("forgotMessage");

forgotEmail.addEventListener("input", () => {
    forgotEmailError.textContent = "";
    forgotEmail.classList.remove("invalid-input");
    forgotEmail.removeAttribute("aria-invalid");

    forgotMessage.textContent = "";
    forgotMessage.className = "forgot-message";
});

forgotForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const emailValue = forgotEmail.value.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    forgotEmailError.textContent = "";
    forgotEmail.classList.remove("invalid-input");
    forgotEmail.removeAttribute("aria-invalid");

    forgotMessage.textContent = "";
    forgotMessage.className = "forgot-message";

    if (!emailValue) {
        forgotEmailError.textContent = "Please enter your email address.";
        forgotEmail.classList.add("invalid-input");
        forgotEmail.setAttribute("aria-invalid", "true");
        forgotEmail.focus();
        return;
    }

    if (!validEmail) {
        forgotEmailError.textContent = "Please enter a valid email address.";
        forgotEmail.classList.add("invalid-input");
        forgotEmail.setAttribute("aria-invalid", "true");
        forgotEmail.focus();
        return;
    }

    forgotMessage.textContent =
        "Email format is valid. Password reset requires a connected backend.";

    forgotMessage.classList.add("success");
});