const API = "";
const uid = () => Number(localStorage.getItem("xinon_user_id") || 0);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.add("hidden"), 2200);
}
function esc(s = "") { return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function initial(name = "?") { return esc(String(name).trim().charAt(0).toUpperCase() || "?"); }
function avatarUrl(user) { return user?.profile_url || ""; }

function renderUser(u, cls = "") {
  const img = avatarUrl(u)
    ? `<img class="mini-avatar ${cls}" src="${esc(avatarUrl(u))}" alt="">`
    : `<div class="mini-avatar ${cls}">${initial(u?.name)}</div>`;
  return `${img}<div><b>${esc(u?.name || "Unknown")}</b><div class="muted">@${esc(u?.username || "")}</div></div>`;
}

function postCard(p) {
  const media = p.media_type === "video" && p.media_url
    ? `<video class="post-media" src="${esc(p.media_url)}" controls autoplay muted loop playsinline preload="metadata"></video>`
    : p.media_type === "image" && p.media_url
      ? `<img class="post-media" src="${esc(p.media_url)}" alt="Post image" loading="lazy">`
      : "";
  const reaction = p.my_reaction || "👍";
  const comments = (p.comments || []).map(c => `
    <div class="comment"><b>${esc(c.user?.name || "User")}</b> ${esc(c.text)}</div>
  `).join("");
  return `<article class="post-card" data-id="${p.id}">
    <div class="post-user user-row" data-user="${p.user?.id || 0}">${renderUser(p.user)}</div>
    ${p.text ? `<div class="post-text">${esc(p.text)}</div>` : ""}
    ${media}
    <div class="stats"><span>${p.reaction_count || 0} reactions</span><span>${p.comment_count || 0} comments</span><span>${p.share_count || 0} shares</span></div>
    <div class="post-actions">
      <button class="react" data-reaction="${esc(reaction)}">${reaction} Like</button>
      <button class="comment-toggle">💬 Comment</button>
      <button class="share">↗️ Share</button>
    </div>
    <div class="comment-area hidden">
      <div class="comments">${comments}</div>
      <div class="comment-row"><input class="comment-input" maxlength="5000" placeholder="Write a comment..."><button class="comment-send">Send</button></div>
    </div>
  </article>`;
}

function showView(id, options = {}) {
  $$(".view").forEach(v => v.classList.add("hidden"));
  const v = $("#" + id);
  if (!v) return;
  v.classList.remove("hidden");
  $$(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.view === id));
  if (!options.keepScroll) window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "homeView") loadFeed();
  if (id === "reelsView") loadReels();
  if (id === "profileView") loadProfile(uid());
  if (id === "friendsView") loadFriendsPage();
  if (id === "photosView") loadPhotosPage();
  if (id === "notificationsView") loadNotifications();
  if (id === "settingsView") loadSettings();
}

async function apiJSON(url, options) {
  try {
    const r = await fetch(url, options);
    const d = await r.json().catch(() => ({}));
    return [r, d];
  } catch (e) {
    toast("Network error");
    return [null, { error: "Network error" }];
  }
}

async function loadFeed() {
  const box = $("#feedList"); if (!box) return;
  box.innerHTML = '<div class="loading">Loading...</div>';
  const [r, d] = await apiJSON(`/api/posts?user_id=${uid()}`);
  if (!r?.ok) { box.innerHTML = `<div class="empty">${esc(d.error || "Could not load posts")}</div>`; return; }
  box.innerHTML = d.posts?.length ? d.posts.map(postCard).join("") : '<div class="empty">No posts yet.</div>';
  bindPostActions(box);
}

async function loadReels() {
  const box = $("#reelsList"); if (!box) return;
  box.innerHTML = '<div class="loading">Loading...</div>';
  const [r, d] = await apiJSON(`/api/posts?type=video&user_id=${uid()}`);
  if (!r?.ok) { box.innerHTML = `<div class="empty">${esc(d.error || "Could not load reels")}</div>`; return; }
  box.innerHTML = d.posts?.length ? d.posts.map(postCard).join("") : '<div class="empty">No reels yet.</div>';
  bindPostActions(box);
}

async function loadProfile(id) {
  const box = $("#profilePanel"); if (!box || !id) return;
  box.innerHTML = '<div class="loading">Loading profile...</div>';
  const [r, d] = await apiJSON(`/api/users/${id}?viewer_id=${uid()}`);
  if (!r?.ok) { box.innerHTML = `<div class="empty">${esc(d.error || "Profile not found")}</div>`; return; }
  const u = d.user, posts = d.posts || [];
  const friendLabel = d.friend_status === "accepted" ? "Friends" : d.friend_status === "pending" ? (d.friend_requester_id === uid() ? "Request sent" : "Accept request") : "Add Friend";
  box.innerHTML = `<section class="profile-page">
    <div class="cover" style="${u.cover_url ? `background-image:url('${esc(u.cover_url)}')` : ""}">
      ${id === uid() ? `<label class="cover-edit">📷 Change cover<input id="coverInput" type="file" accept="image/*" hidden></label>` : ""}
    </div>
    <div class="profile-head">
      <label class="profile-big">${u.profile_url ? `<img src="${esc(u.profile_url)}" alt="Profile picture">` : initial(u.name)}${id === uid() ? `<input id="profileInput" type="file" accept="image/*" hidden>` : ""}</label>
      <h2>${esc(u.name)}</h2><div class="muted">@${esc(u.username)}</div>
      ${u.bio ? `<p>${esc(u.bio)}</p>` : ""}
      ${id !== uid() ? `<button id="friendBtn" class="primary">${friendLabel}</button>` : ""}
    </div>
    <div class="tabs"><button class="active" data-tab="posts">Posts</button><button data-tab="about">About</button><button data-tab="friends">Friends</button><button data-tab="photos">Photos</button></div>
    <div id="profileTab">${posts.map(postCard).join("") || '<div class="empty">No posts yet.</div>'}</div>
  </section>`;

  if (id === uid()) {
    $("#profileInput", box)?.addEventListener("change", e => uploadUserMedia(id, e.target.files[0], "profile"));
    $("#coverInput", box)?.addEventListener("change", e => uploadUserMedia(id, e.target.files[0], "cover"));
  }
  bindPostActions(box);

  $("#friendBtn", box)?.addEventListener("click", async () => {
    if (d.friend_status === "pending" && d.friend_requester_id !== uid()) {
      const [r, x] = await apiJSON(`/api/friends/${uid()}/accept`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:id})});
      toast(r?.ok ? "Friend request accepted" : (x.error || "Could not accept request"));
    } else if (!d.friend_status) {
      const [r, x] = await apiJSON(`/api/friends/${id}/request`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:uid()})});
      toast(r?.ok ? "Friend request sent" : (x.error || "Could not send request"));
    }
    loadProfile(id);
  });

  $$(".tabs button", box).forEach(b => b.addEventListener("click", async () => {
    $$(".tabs button", box).forEach(x => x.classList.remove("active")); b.classList.add("active");
    const t = $("#profileTab", box), tab = b.dataset.tab;
    if (tab === "posts") t.innerHTML = posts.map(postCard).join("") || '<div class="empty">No posts yet.</div>';
    else if (tab === "about") t.innerHTML = `<div class="info-card"><h3>About</h3><p>${esc(d.about || "No information yet.")}</p></div>`;
    else if (tab === "friends") {
      const [rr, ff] = await apiJSON(`/api/friends?user_id=${id}`);
      t.innerHTML = rr?.ok && ff.friends?.length ? ff.friends.map(x => `<div class="user-row" data-user="${x.id}">${renderUser(x)}</div>`).join("") : '<div class="empty">No friends yet.</div>';
      bindUserRows(t);
    } else {
      const photos = posts.filter(p => p.media_type === "image" && p.media_url);
      t.innerHTML = photos.length ? `<div class="photo-grid">${photos.map(p => `<a href="${esc(p.media_url)}" target="_blank" rel="noopener"><img src="${esc(p.media_url)}" alt="Photo"></a>`).join("")}</div>` : '<div class="empty">No photos yet.</div>';
    }
    bindPostActions(t);
  }));
}

async function uploadUserMedia(id, file, type) {
  if (!file || id !== uid()) return;
  const fd = new FormData(); fd.append("photo", file);
  const [r, d] = await apiJSON(`/api/users/${id}/${type === "profile" ? "profile-photo" : "cover-photo"}`, {method:"POST", body:fd});
  toast(r?.ok ? "Updated" : (d.error || "Upload failed"));
  if (r?.ok) loadProfile(id);
}

async function publish(text, file) {
  const fd = new FormData(); fd.append("user_id", String(uid())); fd.append("text", text || ""); if (file) fd.append("media", file);
  return apiJSON("/api/posts", {method:"POST", body:fd});
}

function bindUserRows(root = document) {
  $$(".user-row", root).forEach(x => {
    if (x.dataset.bound) return;
    x.dataset.bound = "1";
    x.addEventListener("click", () => { const id = Number(x.dataset.user); if (id) { showView("profileView"); loadProfile(id); } });
  });
}

function bindPostActions(root = document) {
  $$(".react", root).forEach(b => { if (b.dataset.bound) return; b.dataset.bound="1"; b.onclick = async () => {
    const card = b.closest(".post-card");
    const [r, d] = await apiJSON(`/api/posts/${card.dataset.id}/reaction`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:uid(), reaction:b.dataset.reaction || "👍"})});
    if (r?.ok) loadVisibleFeed(); else toast(d.error || "Like failed");
  }; });
  $$(".comment-toggle", root).forEach(b => { if (b.dataset.bound) return; b.dataset.bound="1"; b.onclick=()=>b.closest(".post-card").querySelector(".comment-area").classList.toggle("hidden"); });
  $$(".comment-send", root).forEach(b => { if (b.dataset.bound) return; b.dataset.bound="1"; b.onclick=async()=>{
    const c=b.closest(".post-card"), input=c.querySelector(".comment-input"), text=input.value.trim(); if(!text)return;
    const [r,d]=await apiJSON(`/api/posts/${c.dataset.id}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:uid(),text})});
    if(r?.ok){input.value="";loadVisibleFeed();} else toast(d.error||"Comment failed");
  }; });
  $$(".share", root).forEach(b => { if (b.dataset.bound) return; b.dataset.bound="1"; b.onclick=async()=>{
    const c=b.closest(".post-card"); const [r,d]=await apiJSON(`/api/posts/${c.dataset.id}/share`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:uid()})});
    if(r?.ok){toast("Shared");loadVisibleFeed();} else toast(d.error||"Share failed");
  }; });
  bindUserRows(root);
}

function loadVisibleFeed(){
  const active = $("#homeView") && !$("#homeView").classList.contains("hidden") ? "home" : $("#reelsView") && !$("#reelsView").classList.contains("hidden") ? "reels" : "profile";
  if(active === "home") loadFeed(); else if(active === "reels") loadReels(); else loadProfile(uid());
}

function openComposer(mode) {
  if (location.pathname === "/create-post") { $("#mediaInput")?.click(); return; }
  const wrap=document.createElement("div"); wrap.className="modal-wrap";
  wrap.innerHTML=`<div class="modal"><h2>Create post</h2><textarea id="modalText" placeholder="What's on your mind?"></textarea><div id="modalPreview" class="media-preview"></div><div class="composer-actions"><button id="mPhoto">📷 Photo</button><button id="mVideo">🎥 Video</button></div><button id="mPublish" class="publish">Publish Post</button><button id="mClose" class="back">Cancel</button></div>`;
  document.body.appendChild(wrap);
  const input=document.createElement("input"); input.type="file"; input.hidden=true; input.accept=mode==="video"?"video/*":"image/*"; wrap.appendChild(input);
  $("#mPhoto",wrap).onclick=()=>{input.accept="image/*";input.click()}; $("#mVideo",wrap).onclick=()=>{input.accept="video/*";input.click()};
  input.onchange=()=>{$("#modalPreview",wrap).textContent=input.files[0]?.name||""}; $("#mClose",wrap).onclick=()=>wrap.remove();
  $("#mPublish",wrap).onclick=async()=>{const [r,d]=await publish($("#modalText",wrap).value,input.files[0]);if(r?.ok){wrap.remove();toast("Published");loadFeed()}else toast(d.error||"Publish failed")};
  if(mode==="photo"||mode==="video") input.click();
}

async function loadFriendsPage(){
  const box=$("#friendsList"); if(!box)return; box.innerHTML='<div class="loading">Loading...</div>';
  const [r,d]=await apiJSON(`/api/friends?user_id=${uid()}`);
  box.innerHTML=r?.ok&&d.friends?.length?d.friends.map(u=>`<div class="user-row" data-user="${u.id}">${renderUser(u)}</div>`).join(""):'<div class="empty">No friends yet.</div>'; bindUserRows(box);
}
async function loadPhotosPage(){
  const box=$("#photosList"); if(!box)return; box.innerHTML='<div class="loading">Loading...</div>';
  const [r,d]=await apiJSON(`/api/posts?user_id=${uid()}`); if(!r?.ok){box.innerHTML='<div class="empty">Could not load photos.</div>';return;}
  const photos=(d.posts||[]).filter(p=>p.media_type==="image"&&p.media_url);
  box.innerHTML=photos.length?`<div class="photo-grid">${photos.map(p=>`<a href="${esc(p.media_url)}" target="_blank" rel="noopener"><img src="${esc(p.media_url)}" alt="Photo"></a>`).join("")}</div>`:'<div class="empty">No photos yet.</div>';
}
async function loadNotifications(){
  const box=$("#notificationsList"); if(!box)return; box.innerHTML='<div class="loading">Loading...</div>';
  const [r,d]=await apiJSON(`/api/friends/requests?user_id=${uid()}`);
  box.innerHTML=r?.ok&&d.requests?.length?d.requests.map(x=>`<div class="user-row request-row"><div class="request-user">${renderUser(x.user)}</div><button class="primary accept-request" data-user="${x.user.id}">Accept</button></div>`).join(""):'<div class="empty">No new notifications.</div>';
  $$(".accept-request",box).forEach(b=>b.onclick=async()=>{const id=Number(b.dataset.user);const [rr,dd]=await apiJSON(`/api/friends/${id}/accept`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:uid()})});toast(rr?.ok?"Friend request accepted":(dd.error||"Could not accept"));loadNotifications();});
}
async function loadSettings(){
  const box=$("#settingsList"); if(!box)return; const [r,d]=await apiJSON(`/api/me?user_id=${uid()}`);
  box.innerHTML=r?.ok?`<div class="info-card"><h3>Account</h3><p><b>Name:</b> ${esc(d.name)}</p><p><b>Username:</b> @${esc(d.username)}</p><button id="settingsLogout" class="primary">Log out</button></div>`:'<div class="empty">Could not load account.</div>';
  $("#settingsLogout",box)?.addEventListener("click",()=>{localStorage.removeItem("xinon_user_id");location.href="/login"});
}

document.addEventListener("click", e=>{
  const v=e.target.closest("[data-view]"); if(v){showView(v.dataset.view);return;}
  if(e.target.id==="menuButton")$("#menu")?.classList.remove("hidden");
  if(e.target.id==="closeMenu")$("#menu")?.classList.add("hidden");
  const mv=e.target.closest("[data-menu-view]"); if(mv){$("#menu")?.classList.add("hidden");showView(mv.dataset.menuView);return;}
  if(e.target.id==="searchButton"){showView("searchView");setTimeout(()=>$("#searchInput")?.focus(),50);return;}
  if(e.target.id==="notificationsButton")showView("notificationsView");
  if(e.target.matches("[data-back]"))showView("homeView");
  if(e.target.id==="mindButton"||e.target.id==="textButton")openComposer("text");
  if(e.target.id==="photoButton")openComposer("photo");
  if(e.target.id==="videoButton")openComposer("video");
  if(e.target.id==="settingsButton"){$("#menu")?.classList.add("hidden");showView("settingsView");}
  if(e.target.id==="logoutButton"){localStorage.removeItem("xinon_user_id");location.href="/login";}
});

let searchTimer;
document.addEventListener("input",e=>{
  if(e.target.id!=="searchInput")return;
  clearTimeout(searchTimer);
  searchTimer=setTimeout(async()=>{
    const q=e.target.value.trim(), box=$("#searchResults"); if(!box)return;
    if(!q){box.innerHTML='<div class="empty">Search for a person.</div>';return;}
    const [r,d]=await apiJSON(`/api/search?q=${encodeURIComponent(q)}`);
    box.innerHTML=r?.ok&&d.users?.length?d.users.map(u=>`<div class="user-row" data-user="${u.id}">${renderUser(u)}</div>`).join(""):'<div class="empty">No results.</div>';bindUserRows(box);
  },250);
});

if(location.pathname==="/create-post"){
  const input=$("#mediaInput");
  $("#choosePhoto")?.addEventListener("click",()=>{input.accept="image/*";input.click()});
  $("#chooseVideo")?.addEventListener("click",()=>{input.accept="video/*";input.click()});
  input?.addEventListener("change",()=>{$("#preview").textContent=input.files[0]?.name||""});
  $("#publishPostButton")?.addEventListener("click",async()=>{const [r,d]=await publish($("#postTextInput").value,input.files[0]);$("#result").textContent=r?.ok?"Published!":d.error||"Failed";if(r?.ok)setTimeout(()=>location.href="/",500)});
}

if(location.pathname==="/"){
  const id=uid();
  if(!id) location.href="/login";
  else {showView("homeView");apiJSON(`/api/me?user_id=${id}`).then(([r,u])=>{const a=$("#homeAvatar");if(a&&r?.ok&&u.profile_url)a.src=u.profile_url;else if(a&&r?.ok)a.alt=u.name||"";});}
}
