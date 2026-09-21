# Xinon Social — Modular UI Split

This version splits the existing Xinon Social UI from the modified `login_navigation_fixed.html` into separate Flask templates. The existing UI markup is retained; the main structural change is moving each view into its own page and moving CSS/JS into `static/`.

## Templates
- login.html
- home.html
- reels.html
- profile.html
- friends.html
- search.html
- notifications.html
- create_post.html
- share.html
- settings.html
- channel_create.html
- terms.html

## Important
Keep the existing `models/user.py` from the working project. Email service files are intentionally not changed by this UI split.
