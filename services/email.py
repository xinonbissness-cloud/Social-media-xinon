import os
import smtplib
from email.message import EmailMessage


def send_verification_email(to_email, verification_code):

    gmail_address = os.environ.get("GMAIL_ADDRESS")
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD")

    if not gmail_address:
        raise RuntimeError("GMAIL_ADDRESS is not configured")

    if not gmail_app_password:
        raise RuntimeError("GMAIL_APP_PASSWORD is not configured")

    message = EmailMessage()

    message["Subject"] = "Xinon Social Email Verification"
    message["From"] = gmail_address
    message["To"] = to_email

    message.set_content(
        f"""Welcome to Xinon Social!

Your verification code is:

{verification_code}

This code will expire in 10 minutes.

If you did not create a Xinon Social account, you can ignore this email.
"""
    )

    try:

        with smtplib.SMTP(
            "smtp.gmail.com",
            587,
            timeout=30
        ) as server:

            server.ehlo()
            server.starttls()
            server.ehlo()

            server.login(
                gmail_address,
                gmail_app_password
            )

            server.send_message(message)

    except Exception as error:

        print(
            "EMAIL ERROR:",
            type(error).__name__,
            str(error)
        )

        raise
