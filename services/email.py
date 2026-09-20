import os
import requests


def send_verification_email(to_email, verification_code):
    resend_api_key = os.environ.get("RESEND_API_KEY")

    if not resend_api_key:
        raise RuntimeError("RESEND_API_KEY is missing")

    sender_email = "onboarding@resend.dev"

    email_data = {
        "from": sender_email,
        "to": [to_email],
        "subject": "Xinon Social - Email Verification Code",
        "html": f"""
        <div style="font-family: Arial, sans-serif;">
            <h2>Xinon Social</h2>
            <p>Your email verification code is:</p>
            <h1>{verification_code}</h1>
            <p>Please enter this code in Xinon Social to verify your email.</p>
        </div>
        """
    }

    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        "https://api.resend.com/emails",
        json=email_data,
        headers=headers,
        timeout=30
    )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Resend API error: {response.status_code} {response.text}"
        )

    print("RESEND EMAIL SENT:", response.text, flush=True)
