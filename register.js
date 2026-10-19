const registerForm = document.getElementById("registerForm");

const fullName = document.getElementById("fullName");
const email = document.getElementById("registerEmail");
const password = document.getElementById("registerPassword");
const confirmPassword = document.getElementById("confirmPassword");
const agreeTerms = document.getElementById("agreeTerms");

const errorBox = document.getElementById("registerError");
const API_BASE = "http://127.0.0.1:8000";

function showError(input, messageId, message) {
    const error = document.getElementById(messageId);

    if (error) error.textContent = message;

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

function showFormMessage(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

registerForm.addEventListener("submit", async (event) => {
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

    const submitButton = registerForm.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: fullName.value.trim(),
                email: email.value.trim(),
                password: password.value
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const detail = data.detail;
            const message = Array.isArray(detail)
                ? detail.map((item) => item.msg).join(" ")
                : typeof detail === "string"
                    ? detail
                    : "Unable to create your account. Please try again.";

            showFormMessage(message);
            return;
        }

        if (!data.access_token) {
            showFormMessage(
                "Your account was created, but no session was returned. Please contact support."
            );
            return;
        }

        sessionStorage.setItem("studentos_access_token", data.access_token);

        showFormMessage("Account created successfully. Opening StudentOS...");

        window.location.href = "index.html";
    } catch (error) {
        showFormMessage(
            "Cannot connect to StudentOS. Please check that the backend is running."
        );
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
        showFormMessage(
            `${button.dataset.provider} sign-up is not configured yet.`
        );
    });
});
