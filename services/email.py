import os
import smtplib
from email.message import EmailMessage


def send_verification_email(to_email, verification_code):
    gmail_address = os.environ.get("GMAIL_ADDRESS")
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD")

    if not gmail_address or not gmail_app_password:
        raise RuntimeError("Gmail settings are not configured")

    message = EmailMessage()
    message["Subject"] = "Xinon Social Email Verification"
    message["From"] = gmail_address
    message["To"] = to_email

    message.set_content(
        f"""Welcome to Xinon Social!

Your verification code is:

{verification_code}

This code is used to verify your email address.

If you did not create a Xinon Social account, you can ignore this email.
"""
    )

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(gmail_address, gmail_app_password)
        server.send_message(message)
