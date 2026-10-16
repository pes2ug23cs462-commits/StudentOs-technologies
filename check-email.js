/* =========================================
   StudentOS — Check Email Page JS
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------
       ELEMENTS
       ----------------------------------------- */

    const openEmailButton = document.querySelector(".primary-button");
    const resendButton = document.querySelector(".secondary-button");
    const signInLink = document.querySelector(".signin-text a");
    const backLink = document.querySelector(".back-link");


    /* -----------------------------------------
       RESEND COUNTDOWN
       ----------------------------------------- */

    let countdown = 45;
    let timer = null;

    function startCountdown() {

        countdown = 45;

        if (resendButton) {
            resendButton.disabled = true;
            resendButton.textContent = `Resend link in 0:${String(countdown).padStart(2, "0")}`;
        }

        clearInterval(timer);

        timer = setInterval(() => {

            countdown--;

            if (countdown > 0) {

                resendButton.textContent =
                    `Resend link in 0:${String(countdown).padStart(2, "0")}`;

            } else {

                clearInterval(timer);

                resendButton.disabled = false;
                resendButton.textContent = "Resend link";

                resendButton.classList.add("resend-active");
            }

        }, 1000);
    }


    /* -----------------------------------------
       RESEND LINK
       ----------------------------------------- */

    if (resendButton) {

        resendButton.addEventListener("click", () => {

            if (resendButton.disabled) {
                return;
            }

            resendButton.classList.remove("resend-active");

            /*
             * Here you can later connect your real
             * password-reset API.
             */

            startCountdown();

            showMessage("A new password reset link has been sent.");
        });
    }


    /* -----------------------------------------
       OPEN EMAIL APP
       ----------------------------------------- */

    if (openEmailButton) {

        openEmailButton.addEventListener("click", () => {

            /*
             * Opens the user's default email application.
             * This can later be replaced with the actual
             * email provider URL required by your project.
             */

            window.location.href = "mailto:";
        });
    }


    /* -----------------------------------------
       BACK TO SIGN IN
       ----------------------------------------- */

    if (backLink) {

        backLink.addEventListener("click", (event) => {

            event.preventDefault();

            /*
             * Replace this with your actual login page
             * filename if it is different.
             */

            window.location.href = "index.html";
        });
    }


    /* -----------------------------------------
       SIGN IN LINK
       ----------------------------------------- */

    if (signInLink) {

        signInLink.addEventListener("click", (event) => {

            event.preventDefault();

            window.location.href = "index.html";
        });
    }


    /* -----------------------------------------
       TEMPORARY MESSAGE
       ----------------------------------------- */

    function showMessage(message) {

        let messageBox = document.querySelector(".js-message");

        if (!messageBox) {

            messageBox = document.createElement("div");

            messageBox.className = "js-message";

            messageBox.style.position = "fixed";
            messageBox.style.left = "50%";
            messageBox.style.bottom = "80px";
            messageBox.style.transform = "translateX(-50%)";
            messageBox.style.padding = "11px 16px";
            messageBox.style.border = "1px solid #303957";
            messageBox.style.borderRadius = "8px";
            messageBox.style.background = "#151d37";
            messageBox.style.color = "#dfe3f5";
            messageBox.style.fontSize = "12px";
            messageBox.style.zIndex = "1000";
            messageBox.style.boxShadow = "0 8px 25px rgba(0,0,0,0.25)";

            document.body.appendChild(messageBox);
        }

        messageBox.textContent = message;
        messageBox.style.opacity = "1";

        setTimeout(() => {
            messageBox.style.opacity = "0";
        }, 3000);
    }


    /* -----------------------------------------
       START INITIAL COUNTDOWN
       ----------------------------------------- */

    startCountdown();

});