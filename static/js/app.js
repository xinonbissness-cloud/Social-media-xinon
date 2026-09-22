const API_URL = "";

function byId(id) { return document.getElementById(id); }
function go(path) { window.location.href = path; }
function currentUserId() { return localStorage.getItem("xinon_user_id"); }

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c];
  });
}

function mediaHtml(post) {
  if (!post.media_url) return "";
  const url = escapeHtml(post.media_url);
  if ((post.media_type || "").startsWith("video/")) {
    return '<video class="feed-post-media" controls preload="metadata" src="' + url + '"></video>';
  }
  return '<img class="feed-post-media" src="' + url + '" alt="Post media">';
}

async function loadPosts() {
  const feed = byId("feedPosts");
  if (!feed) return;
  try {
    const response = await fetch("/api/posts");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load posts.");
    if (!Array.isArray(data.posts) || data.posts.length === 0) {
      feed.innerHTML = '<div class="empty-feed"><div class="empty-feed-icon">📰</div><h3>Your feed is empty</h3><p>Posts from people you follow will appear here.</p></div>';
      return;
    }
    feed.innerHTML = data.posts.map(function (post) {
      const date = new Date(post.created_at).toLocaleString();
      const content = post.content ? '<p class="feed-post-content">' + escapeHtml(post.content).replace(/\n/g, "<br>") + '</p>' : "";
      return '<article class="feed-post">' +
        '<div class="feed-post-header"><div class="avatar">' + escapeHtml((post.user.name || "U").charAt(0).toUpperCase()) + '</div>' +
        '<div><strong>' + escapeHtml(post.user.name) + '</strong><small>@' + escapeHtml(post.user.username) + ' · ' + escapeHtml(date) + '</small></div></div>' +
        content + mediaHtml(post) + '</article>';
    }).join("");
  } catch (error) {
    feed.innerHTML = '<div class="empty-feed"><h3>Could not load posts</h3><p>' + escapeHtml(error.message) + '</p></div>';
  }
}

async function loadProfile() {
  const nameEl = byId("profileName");
  if (!nameEl) return;
  const userId = currentUserId();
  if (!userId) { go("/login"); return; }
  try {
    const r = await fetch("/api/profile/me?user_id=" + encodeURIComponent(userId));
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Could not load profile.");
    const user = data.user;
    nameEl.textContent = user.name || "Your Name";
    const usernameEl = byId("profileUsername");
    if (usernameEl) usernameEl.textContent = "@" + (user.username || "username");
    const avatar = byId("profileAvatarLarge");
    if (avatar) {
      avatar.textContent = "";
      if (user.profile_picture_url) {
        const img = document.createElement("img");
        img.src = user.profile_picture_url + "?v=" + Date.now();
        img.alt = "Profile picture";
        img.className = "profile-avatar-image";
        avatar.appendChild(img);
      } else {
        avatar.textContent = (user.name || "U").charAt(0).toUpperCase();
      }
      const button = document.createElement("button");
      button.className = "avatar-edit";
      button.id = "avatarEditButton";
      button.title = "Change profile photo";
      button.type = "button";
      button.textContent = "📷";
      avatar.appendChild(button);
      button.addEventListener("click", function () { byId("profilePictureInput")?.click(); });
    }
  } catch (error) {
    nameEl.textContent = "Could not load profile";
  }
}

function openComposer(type) {
  localStorage.setItem("xinon_post_type", type || "text");
  go("/create-post");
}

function setupMediaInput(inputId, type) {
  const input = byId(inputId);
  if (!input) return;
  input.addEventListener("change", function () {
    const file = input.files?.[0];
    const box = byId("selectedMediaBox");
    if (!file || !box) return;
    box.classList.remove("hidden");
    const url = URL.createObjectURL(file);
    box.innerHTML = type === "video"
      ? '<video class="composer-preview" controls src="' + url + '"></video><p>' + escapeHtml(file.name) + '</p>'
      : '<img class="composer-preview" src="' + url + '" alt="Selected photo"><p>' + escapeHtml(file.name) + '</p>';
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = byId("loginForm");
  const registerForm = byId("registerForm");
  const showRegister = byId("showRegisterButton");
  const backLogin = byId("backToLoginButton");
  const loginPage = byId("loginPage");
  const registerPage = byId("registerPage");

  if (showRegister && loginPage && registerPage) showRegister.onclick = function () { loginPage.classList.add("hidden"); registerPage.classList.remove("hidden"); };
  if (backLogin && loginPage && registerPage) backLogin.onclick = function () { registerPage.classList.add("hidden"); loginPage.classList.remove("hidden"); };

  if (loginForm) loginForm.addEventListener("submit", async function (e) {
    e.preventDefault(); const result = byId("loginResult"); if (result) result.textContent = "Logging in...";
    try {
      const r = await fetch("/api/auth/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:byId("loginEmail")?.value,password:byId("loginPassword")?.value})});
      const data = await r.json().catch(function(){return {};});
      if (r.ok) { if (data.user_id) localStorage.setItem("xinon_user_id", String(data.user_id)); if (result) result.textContent="Login successful!"; setTimeout(function(){go("/home");},200); }
      else if (result) result.textContent=data.error||"Login failed.";
    } catch(err) { if(result) result.textContent="Connection error: "+err.message; }
  });

  if (registerForm) registerForm.addEventListener("submit", async function (e) {
    e.preventDefault(); const result=byId("registerResult"); if(result) result.textContent="Creating account...";
    const data={name:byId("name")?.value,birthday:byId("birthday")?.value,gender:byId("gender")?.value,username:byId("username")?.value,email:byId("email")?.value,password:byId("password")?.value};
    try { const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}); const d=await r.json().catch(function(){return {};}); if(result) result.textContent=r.ok?"Account created successfully!":(d.error||"Registration failed."); if(r.ok)setTimeout(function(){if(backLogin)backLogin.click();},700); }
    catch(err){if(result)result.textContent="Connection error: "+err.message;}
  });

  const routes={home:"/home",reels:"/reels",profile:"/profile"};
  document.querySelectorAll(".bottom-nav .nav-button").forEach(function(b){b.addEventListener("click",function(){const v=b.dataset.view||"";const key=v.replace("View","");if(routes[key])go(routes[key]);});});
  const links={friends:"/friends",search:"/search",notifications:"/notifications",createPost:"/create-post",share:"/share",settings:"/settings",channelCreate:"/channel/create",terms:"/terms"};
  Object.entries(links).forEach(function([id,path]){const e=byId(id+"Button");if(e)e.addEventListener("click",function(){go(path);});});
  document.querySelectorAll("[data-back-view]").forEach(function(button){button.addEventListener("click",function(){go("/home");});});

  const composerButtons={openPostComposerButton:"text",textPostButton:"text",photoPostButton:"photo",videoPostButton:"video"};
  Object.entries(composerButtons).forEach(function([id,type]){const button=byId(id);if(button)button.addEventListener("click",function(){openComposer(type);});});

  const photoButton=byId("composerPhotoButton"); if(photoButton) photoButton.addEventListener("click",function(){byId("composerPhotoInput")?.click();});
  const videoButton=byId("composerVideoButton"); if(videoButton) videoButton.addEventListener("click",function(){byId("composerVideoInput")?.click();});
  setupMediaInput("composerPhotoInput","photo"); setupMediaInput("composerVideoInput","video");

  const publishButton=byId("publishPostButton");
  if(publishButton) publishButton.addEventListener("click",async function(){
    const result=byId("publishResult"); const input=byId("postTextInput"); const photo=byId("composerPhotoInput")?.files?.[0]; const video=byId("composerVideoInput")?.files?.[0]; const file=photo||video; const userId=currentUserId();
    if(!userId){if(result)result.textContent="Please log in again.";return;}
    if(!((input?.value||"").trim())&&!file){if(result)result.textContent="Write something or choose a photo/video.";return;}
    publishButton.disabled=true;publishButton.textContent="Publishing...";
    try { const form=new FormData(); form.append("user_id",userId); form.append("content",(input?.value||"").trim()); if(file)form.append("media",file); const response=await fetch("/api/posts",{method:"POST",body:form}); const data=await response.json().catch(function(){return {};}); if(!response.ok)throw new Error(data.error||"Post creation failed."); if(result)result.textContent="Post published successfully!"; setTimeout(function(){go("/home");},400); }
    catch(error){if(result)result.textContent=error.message;} finally {publishButton.disabled=false;publishButton.textContent="Publish Post";}
  });

  const pictureInput=byId("profilePictureInput");
  if(pictureInput) pictureInput.addEventListener("change",async function(){
    const file=pictureInput.files?.[0]; const result=byId("profilePictureResult"); const userId=currentUserId(); if(!file||!userId)return;
    const form=new FormData(); form.append("user_id",userId); form.append("picture",file);
    if(result)result.textContent="Uploading...";
    try { const r=await fetch("/api/profile/me/picture",{method:"POST",body:form}); const d=await r.json().catch(function(){return {};}); if(!r.ok)throw new Error(d.error||"Upload failed."); if(result)result.textContent=d.message||"Profile picture updated!"; loadProfile(); }
    catch(error){if(result)result.textContent=error.message;}
  });

  if(byId("homeView"))loadPosts();
  if(byId("profileView"))loadProfile();
  const logout=byId("logoutButton"); if(logout)logout.onclick=function(){localStorage.removeItem("xinon_user_id");go("/login");};
});
