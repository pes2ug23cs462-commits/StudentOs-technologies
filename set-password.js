/* =========================================================
   STUDENTOS — SET NEW PASSWORD
   ========================================================= */


/* =========================================================
   SHOW / HIDE PASSWORD
   ========================================================= */

const passwordToggleButtons =
    document.querySelectorAll(".password-toggle");


passwordToggleButtons.forEach(function(button) {

    button.addEventListener("click", function() {

        const targetId = button.getAttribute("data-target");

        const passwordInput =
            document.getElementById(targetId);

        if (!passwordInput) {
            return;
        }


        /* Change input type */

        if (passwordInput.type === "password") {

            passwordInput.type = "text";

            button.setAttribute(
                "aria-label",
                "Hide password"
            );

        } else {

            passwordInput.type = "password";

            button.setAttribute(
                "aria-label",
                "Show password"
            );
        }

    });

});


/* =========================================================
   UPDATE PASSWORD
   ========================================================= */

const updateButton =
    document.getElementById("updatePassword");

const newPassword =
    document.getElementById("newPassword");

const confirmPassword =
    document.getElementById("confirmPassword");


if (updateButton) {

    updateButton.addEventListener("click", function() {

        const passwordValue =
            newPassword.value.trim();

        const confirmValue =
            confirmPassword.value.trim();


        /* Empty password */

        if (passwordValue === "") {

            alert("Please create a new password.");

            newPassword.focus();

            return;
        }


        /* Minimum password length */

        if (passwordValue.length < 8) {

            alert(
                "Password must be at least 8 characters long."
            );

            newPassword.focus();

            return;
        }


        /* Confirm password */

        if (confirmValue === "") {

            alert("Please confirm your new password.");

            confirmPassword.focus();

            return;
        }


        /* Password mismatch */

        if (passwordValue !== confirmValue) {

            alert(
                "Passwords do not match. Please try again."
            );

            confirmPassword.focus();

            return;
        }


        /* Successful update */

        alert("Your password has been updated successfully.");

        window.location.href = "signin.html";

    });

}