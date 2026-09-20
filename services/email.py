import os
import smtplib


def send_verification_email(to_email, verification_code):

    gmail_address = os.environ.get("GMAIL_ADDRESS")
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD")

    if not gmail_address:
        raise RuntimeError("GMAIL_ADDRESS is missing")

    if not gmail_app_password:
        raise RuntimeError("GMAIL_APP_PASSWORD is missing")

    gmail_app_password = gmail_app_password.replace(" ", "")

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:

            server.ehlo()
            server.starttls()
            server.ehlo()

            server.login(
                gmail_address,
                gmail_app_password
            )

            print(
                "GMAIL LOGIN SUCCESS",
                flush=True
            )

    except Exception as error:

        print(
            "GMAIL LOGIN FAILED:",
            type(error).__name__,
            str(error),
            flush=True
        )

        raise

    print(
        "GMAIL LOGIN TEST PASSED",
        flush=True
    )
