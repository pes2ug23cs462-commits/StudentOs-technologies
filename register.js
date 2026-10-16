const registerForm = document.getElementById("registerForm");

const fullName = document.getElementById("fullName");
const email = document.getElementById("registerEmail");
const password = document.getElementById("registerPassword");
const confirmPassword = document.getElementById("confirmPassword");
const agreeTerms = document.getElementById("agreeTerms");

const errorBox = document.getElementById("registerError");

function showError(input, messageId, message) {
    const error = document.getElementById(messageId);

    if (error) {
        error.textContent = message;
    }

    if (input) {
        input.classList.toggle("invalid-input", Boolean(message));
        input.setAttribute("aria-invalid", message ? "true" : "false");
    }
}

function clearErrors() {
    showError(fullName, "fullNameError", "");
    showError(email, "registerEmailError", "");
    showError(password, "registerPasswordError", "");
    showError(confirmPassword, "confirmPasswordError", "");

    document.getElementById("termsError").textContent = "";
    errorBox.classList.add("hidden");
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* Show or hide password */
document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.toggle);

        if (!input) return;

        const showPassword = input.type === "password";

        input.type = showPassword ? "text" : "password";
        button.setAttribute("aria-pressed", String(showPassword));
        button.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );
    });
});

/* Clear field error while typing */
[
    [fullName, "fullNameError"],
    [email, "registerEmailError"],
    [password, "registerPasswordError"],
    [confirmPassword, "confirmPasswordError"]
].forEach(([input, errorId]) => {
    input.addEventListener("input", () => {
        showError(input, errorId, "");
        errorBox.classList.add("hidden");
    });
});

/* Form validation */
registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();

    let valid = true;

    if (fullName.value.trim().length < 2) {
        showError(fullName, "fullNameError", "Please enter your full name.");
        valid = false;
    }

    if (!isValidEmail(email.value.trim())) {
        showError(email, "registerEmailError", "Enter a valid email address.");
        valid = false;
    }

    if (password.value.length < 8) {
        showError(
            password,
            "registerPasswordError",
            "Password must contain at least 8 characters."
        );
        valid = false;
    }

    if (confirmPassword.value !== password.value) {
        showError(
            confirmPassword,
            "confirmPasswordError",
            "Passwords do not match."
        );
        valid = false;
    }

    if (!agreeTerms.checked) {
        document.getElementById("termsError").textContent =
            "Please agree to the Terms of Service and Privacy Policy.";

        valid = false;
    }

    if (!valid) return;

    errorBox.textContent =
        "Your details are valid. Connect an authentication backend to create your account.";

    errorBox.classList.remove("hidden");
});

/* Social sign-up demo */
document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
        errorBox.textContent =
            `${button.dataset.provider} sign-up requires authentication setup.`;

        errorBox.classList.remove("hidden");
    });
});