/* =========================================================
   STUDENTOS — PASSWORDLESS LOGIN
   JavaScript
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");

    const phoneStatus = document.getElementById("phoneStatus");
    const emailStatus = document.getElementById("emailStatus");

    const verifyButton = document.getElementById("verifyButton");

    const otpInputs = [
        document.getElementById("otp1"),
        document.getElementById("otp2"),
        document.getElementById("otp3"),
        document.getElementById("otp4"),
        document.getElementById("otp5"),
        document.getElementById("otp6")
    ];

    const resendText = document.querySelector(
        ".code-meta span:last-child"
    );

    const expiryText = document.querySelector(
        ".code-meta span:first-child"
    );


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    // Hide "Sent" when the page first loads.
    phoneStatus.style.visibility = "hidden";
    emailStatus.style.visibility = "hidden";


    /* =====================================================
       PHONE VALIDATION
    ===================================================== */

    function isValidPhone(phone) {

        // Remove spaces and other characters
        const cleanPhone = phone.replace(/\D/g, "");

        // Indian phone number: 10 digits
        return cleanPhone.length === 10 ||
            cleanPhone.length === 12;
    }


    /* =====================================================
       EMAIL VALIDATION
    ===================================================== */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }


    /* =====================================================
       PHONE INPUT
    ===================================================== */

    phoneInput.addEventListener("input", () => {

        const value = phoneInput.value.trim();

        if (isValidPhone(value)) {

            phoneStatus.style.visibility = "visible";

        } else {

            phoneStatus.style.visibility = "hidden";
        }

    });


    /* =====================================================
       EMAIL INPUT
    ===================================================== */

    emailInput.addEventListener("input", () => {

        const value = emailInput.value.trim();

        if (isValidEmail(value)) {

            emailStatus.style.visibility = "visible";

        } else {

            emailStatus.style.visibility = "hidden";
        }

    });


    /* =====================================================
       OTP INPUTS
    ===================================================== */

    otpInputs.forEach((input, index) => {

        input.addEventListener("input", (event) => {

            // Only allow numbers
            input.value = input.value.replace(/\D/g, "");

            if (input.value.length === 1) {

                // Move to next OTP box
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }

        });


        /* =================================================
           BACKSPACE
        ================================================= */

        input.addEventListener("keydown", (event) => {

            if (
                event.key === "Backspace" &&
                input.value === "" &&
                index > 0
            ) {

                otpInputs[index - 1].focus();
            }

        });


        /* =================================================
           ARROW LEFT / RIGHT
        ================================================= */

        input.addEventListener("keydown", (event) => {

            if (
                event.key === "ArrowLeft" &&
                index > 0
            ) {

                otpInputs[index - 1].focus();
            }


            if (
                event.key === "ArrowRight" &&
                index < otpInputs.length - 1
            ) {

                otpInputs[index + 1].focus();
            }

        });


        /* =================================================
           PASTE OTP
        ================================================= */

        input.addEventListener("paste", (event) => {

            event.preventDefault();

            const pastedData =
                event.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            pastedData.split("").forEach((number, i) => {

                if (otpInputs[i]) {
                    otpInputs[i].value = number;
                }

            });

            const nextIndex =
                Math.min(pastedData.length, 5);

            otpInputs[nextIndex].focus();

        });

    });


    /* =====================================================
       ACTIVE OTP BOX
    ===================================================== */

    otpInputs.forEach((input) => {

        input.addEventListener("focus", () => {

            otpInputs.forEach((item) => {
                item.classList.remove("active");
            });

            input.classList.add("active");

        });


        input.addEventListener("blur", () => {

            input.classList.remove("active");

        });

    });


    /* =====================================================
       RESEND TIMER
    ===================================================== */

    let resendSeconds = 42;

    function updateResendTimer() {

        const minutes =
            Math.floor(resendSeconds / 60);

        const seconds =
            resendSeconds % 60;

        resendText.textContent =
            `Resend code in ${minutes}:${seconds
                .toString()
                .padStart(2, "0")}`;

        if (resendSeconds > 0) {

            resendSeconds--;

        } else {

            resendText.textContent =
                "Resend code";

            resendText.style.color =
                "#c4b5fd";

            resendText.style.cursor =
                "pointer";

        }

    }

    updateResendTimer();

    const resendInterval =
        setInterval(() => {

            if (resendSeconds > 0) {

                updateResendTimer();

            } else {

                clearInterval(resendInterval);
            }

        }, 1000);


    /* =====================================================
       CODE EXPIRY TIMER
    ===================================================== */

    let expirySeconds = 9 * 60 + 58;

    function updateExpiryTimer() {

        const minutes =
            Math.floor(expirySeconds / 60);

        const seconds =
            expirySeconds % 60;

        expiryText.textContent =
            `Code expires in ${minutes}:${seconds
                .toString()
                .padStart(2, "0")}`;

        if (expirySeconds > 0) {

            expirySeconds--;

        }

    }

    updateExpiryTimer();

    setInterval(() => {

        if (expirySeconds > 0) {
            updateExpiryTimer();
        }

    }, 1000);


    /* =====================================================
       VERIFY BUTTON
    ===================================================== */

    verifyButton.addEventListener("click", () => {

        const phone =
            phoneInput.value.trim();

        const email =
            emailInput.value.trim();

        const otp =
            otpInputs
            .map(input => input.value)
            .join("");


        /* ================================================
           CHECK PHONE
        ================================================ */

        if (!isValidPhone(phone)) {

            phoneInput.focus();

            alert("Please enter a valid phone number.");

            return;
        }


        /* ================================================
           CHECK EMAIL
        ================================================ */

        if (!isValidEmail(email)) {

            emailInput.focus();

            alert("Please enter a valid email address.");

            return;
        }


        /* ================================================
           CHECK OTP
        ================================================ */

        if (otp.length !== 6) {

            otpInputs[0].focus();

            alert("Please enter the complete 6-digit login code.");

            return;
        }


        /* ================================================
           SUCCESS
        ================================================ */

        alert("Login successful!");

        // After successful verification,
        // go to the main dashboard/index page.

        window.location.href = "index.html";

    });


    /* =====================================================
       ENTER KEY
    ===================================================== */

    [phoneInput, emailInput].forEach((input) => {

        input.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {

                verifyButton.click();

            }

        });

    });


    /* =====================================================
       RESEND CODE
    ===================================================== */

    resendText.addEventListener("click", () => {

        if (resendSeconds <= 0) {

            resendSeconds = 42;

            resendText.style.color =
                "#69738f";

            resendText.style.cursor =
                "default";

            alert("A new login code has been sent.");

        }

    });

});