const API_URL = "";

function byId(id) { return document.getElementById(id); }
function go(path) { window.location.href = path; }
function currentUserId() { return localStorage.getItem("xinon_user_id"); }

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c];
  });
}

async function loadPosts() {
  const feed = byId("feedPosts");
  if (!feed) return;

  try {
    const response = await fetch(API_URL + "/api/posts");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load posts.");

    if (!Array.isArray(data.posts) || data.posts.length === 0) {
      feed.innerHTML = '<div class="empty-feed"><div class="empty-feed-icon">📰</div><h3>Your feed is empty</h3><p>Posts from people you follow will appear here.</p></div>';
      return;
    }

    feed.innerHTML = data.posts.map(function (post) {
      const date = new Date(post.created_at).toLocaleString();
      return '<article class="feed-post">' +
        '<div class="feed-post-header"><div class="avatar">' + escapeHtml((post.user.name || "U").charAt(0).toUpperCase()) + '</div>' +
        '<div><strong>' + escapeHtml(post.user.name) + '</strong><small>@' + escapeHtml(post.user.username) + ' · ' + escapeHtml(date) + '</small></div></div>' +
        '<p class="feed-post-content">' + escapeHtml(post.content).replace(/\n/g, "<br>") + '</p>' +
        '</article>';
    }).join("");
  } catch (error) {
    feed.innerHTML = '<div class="empty-feed"><h3>Could not load posts</h3><p>' + escapeHtml(error.message) + '</p></div>';
  }
}

function openComposer(type) {
  localStorage.setItem("xinon_post_type", type || "text");
  go("/create-post");
}

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = byId("loginForm");
  const registerForm = byId("registerForm");
  const showRegister = byId("showRegisterButton");
  const backLogin = byId("backToLoginButton");
  const loginPage = byId("loginPage");
  const registerPage = byId("registerPage");

  if (showRegister && loginPage && registerPage) {
    showRegister.onclick = function () {
      loginPage.classList.add("hidden");
      registerPage.classList.remove("hidden");
    };
  }
  if (backLogin && loginPage && registerPage) {
    backLogin.onclick = function () {
      registerPage.classList.add("hidden");
      loginPage.classList.remove("hidden");
    };
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const result = byId("loginResult");
      if (result) result.textContent = "Logging in...";
      try {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({email: byId("loginEmail")?.value, password: byId("loginPassword")?.value})
        });
        const data = await r.json().catch(function () { return {}; });
        if (r.ok) {
          if (data.user_id) localStorage.setItem("xinon_user_id", String(data.user_id));
          if (result) result.textContent = "Login successful!";
          setTimeout(function () { go("/home"); }, 200);
        } else if (result) result.textContent = data.error || "Login failed.";
      } catch (err) {
        if (result) result.textContent = "Connection error: " + err.message;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const result = byId("registerResult");
      if (result) result.textContent = "Creating account...";
      const data = {name:byId("name")?.value,birthday:byId("birthday")?.value,gender:byId("gender")?.value,username:byId("username")?.value,email:byId("email")?.value,password:byId("password")?.value};
      try {
        const r = await fetch("/api/auth/register", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
        const d = await r.json().catch(function () { return {}; });
        if (result) result.textContent = r.ok ? "Account created successfully!" : (d.error || "Registration failed.");
        if (r.ok) setTimeout(function () { if (backLogin) backLogin.click(); }, 700);
      } catch (err) {
        if (result) result.textContent = "Connection error: " + err.message;
      }
    });
  }

  const routes = {home:"/home", reels:"/reels", profile:"/profile"};
  document.querySelectorAll(".bottom-nav .nav-button").forEach(function (b) {
    b.addEventListener("click", function () {
      const v = b.dataset.view || "";
      const key = v.replace("View", "");
      if (routes[key]) go(routes[key]);
    });
  });

  const links = {friends:"/friends",search:"/search",notifications:"/notifications",createPost:"/create-post",share:"/share",settings:"/settings",channelCreate:"/channel/create",terms:"/terms"};
  Object.entries(links).forEach(function ([id, path]) {
    const e = byId(id + "Button");
    if (e) e.addEventListener("click", function () { go(path); });
  });

  const backButtons = document.querySelectorAll("[data-back-view]");
  backButtons.forEach(function (button) {
    button.addEventListener("click", function () { go("/home"); });
  });

  const composerButtons = {
    openPostComposerButton: "text",
    textPostButton: "text",
    photoPostButton: "photo",
    videoPostButton: "video"
  };
  Object.entries(composerButtons).forEach(function ([id, type]) {
    const button = byId(id);
    if (button) button.addEventListener("click", function () { openComposer(type); });
  });

  const publishButton = byId("publishPostButton");
  if (publishButton) {
    publishButton.addEventListener("click", async function () {
      const result = byId("publishResult");
      const input = byId("postTextInput");
      const content = (input?.value || "").trim();
      const userId = currentUserId();

      if (!userId) { if (result) result.textContent = "Please log in again."; return; }
      if (!content) { if (result) result.textContent = "Write something before publishing."; return; }

      publishButton.disabled = true;
      publishButton.textContent = "Publishing...";
      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({user_id: Number(userId), content: content})
        });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || "Post creation failed.");
        if (result) result.textContent = "Post published successfully!";
        input.value = "";
        setTimeout(function () { go("/home"); }, 400);
      } catch (error) {
        if (result) result.textContent = error.message;
      } finally {
        publishButton.disabled = false;
        publishButton.textContent = "Publish Post";
      }
    });
  }

  if (byId("homeView")) loadPosts();

  const logout = byId("logoutButton");
  if (logout) logout.onclick = function () { localStorage.removeItem("xinon_user_id"); go("/login"); };
});
        
