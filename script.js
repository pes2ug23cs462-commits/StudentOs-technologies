/* ==========================================
   StudentOS Authentication â€” JavaScript
   Frontend demo only
   ========================================== */

const screens = document.querySelectorAll(".screen");
const toast = document.getElementById("toast");

/* Switch between authentication screens */

function showScreen(screenId) {
    const target = document.getElementById(screenId);

    if (!target) return;

    screens.forEach((screen) => {
        screen.classList.remove("active");
    });

    target.classList.add("active");

    const firstInput = target.querySelector("input");

    if (firstInput) {
        setTimeout(() => {
            firstInput.focus({ preventScroll: true });
        }, 80);
    }
}

/* Display temporary messages */

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

/* Navigation links */

document.addEventListener("click", function(event) {
    const screenLink = event.target.closest("[data-screen]");

    if (screenLink) {
        event.preventDefault();
        showScreen(screenLink.dataset.screen);
        return;
    }

    const infoLink = event.target.closest("[data-info]");

    if (infoLink) {
        event.preventDefault();
        showToast(
            infoLink.dataset.info + " page is a demo placeholder."
        );
    }

    const providerButton = event.target.closest("[data-provider]");

    if (providerButton) {
        showToast(
            providerButton.dataset.provider +
            " sign-in needs provider/API setup."
        );
    }
});

/* Show or hide passwords */

document.querySelectorAll("[data-toggle]").forEach(function(button) {
    button.addEventListener("click", function() {
        const input = document.getElementById(button.dataset.toggle);

        if (!input) return;

        const reveal = input.type === "password";

        input.type = reveal ? "text" : "password";

        button.setAttribute(
            "aria-label",
            reveal ? "Hide password" : "Show password"
        );

        button.setAttribute("aria-pressed", String(reveal));
    });
});

/* Shared validation helpers */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(input, errorElement, message) {
    if (errorElement) {
        errorElement.textContent = message;
    }

    if (input) {
        input.classList.toggle("invalid-input", Boolean(message));

        if (message) {
            input.setAttribute("aria-invalid", "true");
        } else {
            input.removeAttribute("aria-invalid");
        }
    }
}

function clearFieldError(input, errorElement) {
    setError(input, errorElement, "");
}

function validateEmail(input, errorElement) {
    const value = input.value.trim();

    let message = "";

    if (!value) {
        message = "Please enter your email address.";
    } else if (!emailPattern.test(value)) {
        message = "Please enter a valid email address.";
    }

    setError(input, errorElement, message);

    return !message;
}

/* ==========================================
   LOGIN SCREEN
   ========================================== */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");

emailInput.addEventListener("input", function() {
    clearFieldError(
        emailInput,
        document.getElementById("emailError")
    );

    loginError.classList.add("hidden");
});

passwordInput.addEventListener("input", function() {
    clearFieldError(
        passwordInput,
        document.getElementById("passwordError")
    );

    loginError.classList.add("hidden");
});

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const emailValid = validateEmail(
        emailInput,
        document.getElementById("emailError")
    );

    const passwordError = document.getElementById("passwordError");
    const password = passwordInput.value;

    if (!password.trim()) {
        setError(passwordInput, passwordError, "Please enter your password.");
        return;
    }

    clearFieldError(passwordInput, passwordError);

    if (!emailValid) {
        loginError.classList.add("hidden");
        return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "";

    loginError.classList.add("hidden");
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Signing in...";
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: password
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || "Sign-in failed. Check your email and password."
            );
        }

        if (!data.access_token) {
            throw new Error("The server did not return a session token.");
        }

        sessionStorage.setItem("studentos_access_token", data.access_token);
        showToast("Signed in successfully.");
        showScreen("successScreen");
    } catch (error) {
        loginError.textContent = error.message ||
            "Unable to contact the server. Check that the backend is running.";
        loginError.classList.remove("hidden");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }
});

/* Incorrect-password demonstration screen */

document
    .getElementById("errorLoginForm")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        showToast(
            "Demo error state: these credentials have not been verified."
        );
    });

/* Validation-state demonstration screen */

const validationForm = document.getElementById("validationForm");

if (validationForm) {
    validationForm.addEventListener("submit", function(event) {
        event.preventDefault();
        showToast("This screen demonstrates inline validation errors.");
    });
}

/* ==========================================
   FORGOT PASSWORD
   ========================================== */

const forgotForm = document.getElementById("forgotForm");
const forgotEmail = document.getElementById("forgotEmail");
const forgotError = document.getElementById("forgotError");

forgotEmail.addEventListener("input", function() {
    clearFieldError(forgotEmail, forgotError);
});

forgotForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const valid = validateEmail(forgotEmail, forgotError);

    if (!valid) {
        forgotEmail.focus();
        return;
    }

    /*
      Demo navigation only.
      No email is actually sent.
    */

    showScreen("emailSentScreen");
});

/* ==========================================
   RESET PASSWORD
   ========================================== */

const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");

const ruleLength = document.getElementById("ruleLength");
const ruleNumber = document.getElementById("ruleNumber");

function updatePasswordRules() {
    const hasLength = newPassword.value.length >= 8;
    const hasNumber = /\d/.test(newPassword.value);

    ruleLength.classList.toggle("valid", hasLength);
    ruleNumber.classList.toggle("valid", hasNumber);

    ruleLength.textContent =
        `${hasLength ? "âœ“" : "â—‹"} At least 8 characters`;

    ruleNumber.textContent =
        `${hasNumber ? "âœ“" : "â—‹"} Contains a number`;
}

newPassword.addEventListener("input", updatePasswordRules);

document
    .getElementById("resetForm")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        const newPasswordError =
            document.getElementById("newPasswordError");

        const confirmPasswordError =
            document.getElementById("confirmPasswordError");

        let valid = true;

        if (
            newPassword.value.length < 8 ||
            !/\d/.test(newPassword.value)
        ) {
            setError(
                newPassword,
                newPasswordError,
                "Use at least 8 characters and include a number."
            );

            valid = false;
        } else {
            clearFieldError(newPassword, newPasswordError);
        }

        if (!confirmPassword.value) {
            setError(
                confirmPassword,
                confirmPasswordError,
                "Please confirm your password."
            );

            valid = false;
        } else if (
            confirmPassword.value !== newPassword.value
        ) {
            setError(
                confirmPassword,
                confirmPasswordError,
                "Passwords do not match."
            );

            valid = false;
        } else {
            clearFieldError(
                confirmPassword,
                confirmPasswordError
            );
        }

        if (!valid) return;

        /*
          Demo only: a secure backend is required
          to actually update an account password.
        */

        showScreen("successScreen");
    });

/* ==========================================
   CREATE ACCOUNT
   ========================================== */

document
    .getElementById("registerForm")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        const fullName = document.getElementById("fullName");
        const registerEmail = document.getElementById("registerEmail");
        const registerPassword = document.getElementById("registerPassword");

        const nameError = document.getElementById("fullNameError");

        const registerEmailError =
            document.getElementById("registerEmailError");

        const registerPasswordError =
            document.getElementById("registerPasswordError");

        let valid = true;

        if (fullName.value.trim().length < 2) {
            setError(
                fullName,
                nameError,
                "Please enter your full name."
            );

            valid = false;
        } else {
            clearFieldError(fullName, nameError);
        }

        if (!validateEmail(registerEmail, registerEmailError)) {
            valid = false;
        }

        if (registerPassword.value.length < 8) {
            setError(
                registerPassword,
                registerPasswordError,
                "Use at least 8 characters."
            );

            valid = false;
        } else {
            clearFieldError(
                registerPassword,
                registerPasswordError
            );
        }

        if (!valid) return;

        (async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        full_name: fullName.value.trim(),
                        email: registerEmail.value.trim(),
                        password: registerPassword.value
                    })
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const detail = data.detail;
                    const message = Array.isArray(detail)
                        ? detail.map(item => item.msg).join(" ")
                        : typeof detail === "string"
                            ? detail
                            : "Unable to create your account. Please try again.";

                    showToast(message);
                    return;
                }

                if (!data.access_token) {
                    showToast("Account created, but no session was returned.");
                    return;
                }

                sessionStorage.setItem("studentos_access_token", data.access_token);

                document.getElementById("successTitle").textContent =
                    "Account created successfully!";

                document.getElementById("successMessage").textContent =
                    "Your StudentOS account has been created.";

                document.getElementById("successDetail").textContent =
                    "Your account is ready. You can continue to StudentOS.";

                showScreen("successScreen");
            } catch (error) {
                showToast("Cannot connect to StudentOS. Check that the backend is running.");
            }
        })();
    });

/* Clear stale invalid styling while editing */

document.querySelectorAll(".field input").forEach(function(input) {
    input.addEventListener("input", function() {
        if (input.getAttribute("aria-invalid") === "true") {
            input.removeAttribute("aria-invalid");
            input.classList.remove("invalid-input");
        }
    });
});