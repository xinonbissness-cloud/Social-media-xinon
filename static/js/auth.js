const API_URL =
            "https://web-production-2b6e4.up.railway.app";


        const loginPage =
            document.getElementById("loginPage");

        const registerPage =
            document.getElementById("registerPage");


        /* =========================
           LOGIN / REGISTER SWITCH
           ========================= */

        const showRegisterButton =
            document.getElementById(
                "showRegisterButton"
            );

        const backToLoginButton =
            document.getElementById(
                "backToLoginButton"
            );


        showRegisterButton.addEventListener(
            "click",
            function () {

                loginPage.classList.add("hidden");

                registerPage.classList.remove(
                    "hidden"
                );

            }
        );


        backToLoginButton.addEventListener(
            "click",
            function () {

                registerPage.classList.add(
                    "hidden"
                );

                loginPage.classList.remove(
                    "hidden"
                );

            }
        );


        /* =========================
           LOGIN
           ========================= */

        const loginForm =
            document.getElementById(
                "loginForm"
            );

        const loginResult =
            document.getElementById(
                "loginResult"
            );


        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                loginResult.textContent =
                    "Logging in...";


                const data = {

                    email:
                        document.getElementById(
                            "loginEmail"
                        ).value,

                    password:
                        document.getElementById(
                            "loginPassword"
                        ).value

                };


                try {

                    const response =
                        await fetch(
                            API_URL +
                            "/api/auth/login",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        data
                                    )

                            }
                        );


                    const responseText =
                        await response.text();


                    let responseData;


                    try {

                        responseData =
                            JSON.parse(
                                responseText
                            );

                    } catch (error) {

                        loginResult.textContent =
                            "Server Error (" +
                            response.status +
                            ")";

                        return;
                    }


                    if (response.ok) {

                        loginResult.textContent =
                            "Login successful!";

                        if (responseData.user_id) {
                            localStorage.setItem("xinon_user_id", String(responseData.user_id));
                        }

                        setTimeout(function () {
                            window.location.href = "/home";
                        }, 300);


                    } else {

                        loginResult.textContent =
                            responseData.error ||
                            "Login failed.";

                    }


                } catch (error) {

                    loginResult.textContent =
                        "Connection error:\n" +
                        error.message;

                }

            }
        );


        /* =========================
           REGISTER
           ========================= */

        const registerForm =
            document.getElementById(
                "registerForm"
            );

        const registerResult =
            document.getElementById(
                "registerResult"
            );


        registerForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                registerResult.textContent =
                    "Creating account...";


                const data = {

                    name:
                        document.getElementById(
                            "name"
                        ).value,

                    birthday:
                        document.getElementById(
                            "birthday"
                        ).value,

                    gender:
                        document.getElementById(
                            "gender"
                        ).value,

                    username:
                        document.getElementById(
                            "username"
                        ).value,

                    email:
                        document.getElementById(
                            "email"
                        ).value,

                    password:
                        document.getElementById(
                            "password"
                        ).value

                };


                try {

                    const response =
                        await fetch(
                            API_URL +
                            "/api/auth/register",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        data
                                    )

                            }
                        );


                    const responseText =
                        await response.text();


                    let responseData;


                    try {

                        responseData =
                            JSON.parse(
                                responseText
                            );

                    } catch (error) {

                        registerResult.textContent =
                            "Server Error (" +
                            response.status +
                            ")";

                        return;
                    }


                    if (response.ok) {

                        registerResult.textContent =
                            "Account created successfully!";

                    } else {

                        registerResult.textContent =
                            responseData.error ||
                            "Registration failed.";

                    }


                } catch (error) {

                    registerResult.textContent =
                        "Connection error:\n" +
                        error.message;

                }

            }
        );
