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
        content + mediaHtml(post) +
        '<div class="feed-post-actions">' +
        '<button type="button" class="feed-action-button" data-share-post="' + post.id + '">↗ Share</button>' +
        (post.share_count ? '<span class="share-count">' + escapeHtml(post.share_count) + ' share' + (post.share_count === 1 ? '' : 's') + '</span>' : '') +
        '</div>' +
        '</article>';
    }).join("");
    feed.querySelectorAll("[data-share-post]").forEach(function(button) {
      button.addEventListener("click", function() {
        go("/share?post_id=" + encodeURIComponent(button.dataset.sharePost));
      });
    });
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

function setupSharePage() {
  const shareView = byId("shareView");
  if (!shareView) return;

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post_id");
  const result = byId("shareResult");
  const preview = byId("sharePostPreview");

  if (!postId) {
    if (result) result.textContent = "No post selected.";
    return;
  }

  fetch("/api/posts")
    .then(function(response) { return response.json().then(function(data) { return {ok: response.ok, data: data}; }); })
    .then(function(resultData) {
      if (!resultData.ok) throw new Error(resultData.data.error || "Could not load the post.");
      const post = (resultData.data.posts || []).find(function(item) { return String(item.id) === String(postId); });
      if (!post) throw new Error("Post not found.");
      if (preview) {
        const text = post.content ? escapeHtml(post.content).replace(/\n/g, "<br>") : "(Media post)";
        preview.innerHTML = '<strong>' + escapeHtml(post.user.name) + '</strong><p>' + text + '</p>' + mediaHtml(post);
      }
    })
    .catch(function(error) { if (result) result.textContent = error.message; });

  document.querySelectorAll("[data-share-action]").forEach(function(button) {
    button.addEventListener("click", async function() {
      const action = button.dataset.shareAction;
      if (action === "feed") {
        const userId = currentUserId();
        if (!userId) { if (result) result.textContent = "Please log in again."; return; }
        button.disabled = true;
        try {
          const response = await fetch("/api/posts/" + encodeURIComponent(postId) + "/share", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({user_id: Number(userId)})
          });
          const data = await response.json().catch(function(){ return {}; });
          if (!response.ok) throw new Error(data.error || "Share failed.");
          if (result) result.textContent = data.message || "Post shared to your feed!";
        } catch (error) {
          if (result) result.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      } else if (action === "copy") {
        const link = window.location.origin + "/share?post_id=" + encodeURIComponent(postId);
        try {
          await navigator.clipboard.writeText(link);
          if (result) result.textContent = "Post link copied!";
        } catch (error) {
          if (result) result.textContent = link;
        }
      } else if (action === "message") {
        if (result) result.textContent = "Messaging is not connected yet.";
      }
    });
  });
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


function setupLivePage() {
  const liveView = byId("liveView");
  if (!liveView) return;

  const lobby = byId("liveLobby");
  const room = byId("liveRoom");
  const titleInput = byId("liveTitleInput");
  const startButton = byId("startLiveButton");
  const activeLives = byId("activeLives");
  const localVideo = byId("liveLocalVideo");
  const remoteVideo = byId("liveRemoteVideo");
  const viewerCount = byId("liveViewerCount");
  const statusText = byId("liveStatusText");
  const roomMessage = byId("liveRoomMessage");
  const commentsBox = byId("liveComments");
  const commentInput = byId("liveCommentInput");
  const commentButton = byId("liveCommentButton");
  const reactionButton = byId("liveReactionButton");
  const shareButton = byId("liveShareButton");
  const endButton = byId("endLiveButton");
  const userId = currentUserId();

  let sessionId = null;
  let hostUserId = null;
  let isHost = false;
  let localStream = null;
  let pollTimer = null;
  let signalCursor = 0;
  let commentCursor = 0;
  const peers = {};

  function setMessage(message) { if (roomMessage) roomMessage.textContent = message || ""; }
  function setLobbyMessage(message) { if (statusText) statusText.textContent = message || ""; }

  async function api(path, options) {
    const response = await fetch(path, options || {});
    const data = await response.json().catch(function(){ return {}; });
    if (!response.ok) throw new Error(data.error || "Live request failed.");
    return data;
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function closePeers() {
    Object.keys(peers).forEach(function(key) { try { peers[key].close(); } catch (_) {} delete peers[key]; });
  }

  async function leaveCurrentLive() {
    if (!sessionId || !userId) return;
    try { await api("/api/live/" + encodeURIComponent(sessionId) + "/leave", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:Number(userId)})}); } catch (_) {}
  }

  async function sendSignal(targetUserId, type, payload) {
    if (!sessionId) return;
    try {
      await api("/api/live/" + encodeURIComponent(sessionId) + "/signals", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({user_id:Number(userId), target_user_id:Number(targetUserId), type:type, payload:payload})
      });
    } catch (error) { setMessage(error.message); }
  }

  function addPeer(viewerId, stream) {
    const pc = new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
    peers[String(viewerId)] = pc;
    if (stream) stream.getTracks().forEach(function(track){ pc.addTrack(track, stream); });
    pc.onicecandidate = function(event) {
      if (event.candidate) sendSignal(viewerId, "candidate", event.candidate.toJSON ? event.candidate.toJSON() : event.candidate);
    };
    pc.onconnectionstatechange = function(){
      if (["failed","closed","disconnected"].includes(pc.connectionState)) { try { pc.close(); } catch (_) {} delete peers[String(viewerId)]; }
    };
    pc.ontrack = function(event) {
      if (remoteVideo && event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.classList.remove("hidden");
      }
    };
    return pc;
  }

  async function handleSignal(signal) {
    signalCursor = Math.max(signalCursor, Number(signal.id) || 0);
    const senderId = Number(signal.sender_user_id);
    if (signal.type === "viewer_join" && isHost) {
      const pc = addPeer(senderId, localStream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(senderId, "offer", pc.localDescription);
    } else if (signal.type === "offer" && !isHost) {
      let pc = peers[String(senderId)];
      if (!pc) pc = addPeer(senderId, null);
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(senderId, "answer", pc.localDescription);
    } else if (signal.type === "answer" && isHost) {
      const pc = peers[String(senderId)];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
    } else if (signal.type === "candidate") {
      const pc = peers[String(senderId)];
      if (pc && signal.payload) {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.payload)); } catch (_) {}
      }
    }
  }

  async function pollSignals() {
    if (!sessionId || !userId) return;
    try {
      const data = await api("/api/live/" + encodeURIComponent(sessionId) + "/signals?user_id=" + encodeURIComponent(userId) + "&after=" + signalCursor);
      for (const signal of (data.signals || [])) await handleSignal(signal);
    } catch (_) {}
  }

  async function pollState() {
    if (!sessionId) return;
    try {
      const data = await api("/api/live/" + encodeURIComponent(sessionId));
      if (viewerCount) viewerCount.textContent = data.live.viewer_count;
      if (data.live.status !== "live") {
        setMessage("This live has ended.");
        await leaveCurrentLive();
        closePeers();
        stopPolling();
      }
    } catch (_) {}
  }

  async function pollComments() {
    if (!sessionId || !commentsBox) return;
    try {
      const data = await api("/api/live/" + encodeURIComponent(sessionId) + "/comments?after=" + commentCursor);
      (data.comments || []).forEach(function(comment) {
        commentCursor = Math.max(commentCursor, Number(comment.id) || 0);
        const item = document.createElement("div");
        item.className = "live-comment-item";
        item.innerHTML = "<strong>" + escapeHtml(comment.user.name) + "</strong> " + escapeHtml(comment.text);
        commentsBox.appendChild(item);
      });
      commentsBox.scrollTop = commentsBox.scrollHeight;
    } catch (_) {}
  }

  async function pollAll() {
    await pollSignals();
    await pollState();
    await pollComments();
  }

  async function joinLive(id) {
    if (!userId) { go("/login"); return; }
    sessionId = Number(id);
    try {
      const state = await api("/api/live/" + encodeURIComponent(sessionId));
      hostUserId = Number(state.live.host_user_id);
      isHost = hostUserId === Number(userId);
      await api("/api/live/" + encodeURIComponent(sessionId) + "/join", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:Number(userId)})});
      if (lobby) lobby.classList.add("hidden");
      if (room) room.classList.remove("hidden");
      if (endButton) endButton.classList.toggle("hidden", !isHost);
      if (localVideo) localVideo.classList.toggle("hidden", !isHost);
      if (remoteVideo) remoteVideo.classList.toggle("hidden", isHost);
      if (statusText) statusText.textContent = state.live.title + " · @" + state.live.host.username;

      if (isHost) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Camera access is not supported in this browser.");
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
        if (localVideo) { localVideo.srcObject = localStream; localVideo.play().catch(function(){}); }
        if (remoteVideo) remoteVideo.classList.add("hidden");
      }
      pollTimer = setInterval(pollAll, 1000);
      await pollAll();
    } catch (error) {
      sessionId = null;
      setLobbyMessage(error.message);
    }
  }

  async function loadActiveLives() {
    if (!activeLives) return;
    try {
      const data = await api("/api/live/active");
      if (!data.lives.length) {
        activeLives.innerHTML = '<div class="utility-empty"><div>📡</div><strong>No active lives</strong><span>When someone goes live, it will appear here.</span></div>';
        return;
      }
      activeLives.innerHTML = data.lives.map(function(live) {
        return '<div class="active-live-card"><div><strong>' + escapeHtml(live.title) + '</strong><small>@' + escapeHtml(live.host.username) + ' · ' + live.viewer_count + ' viewers</small></div><button type="button" data-join-live="' + live.id + '">Join</button></div>';
      }).join("");
      activeLives.querySelectorAll("[data-join-live]").forEach(function(button){ button.addEventListener("click", function(){ joinLive(button.dataset.joinLive); }); });
    } catch (error) { activeLives.textContent = error.message; }
  }

  if (startButton) startButton.addEventListener("click", async function(){
    if (!userId) { go("/login"); return; }
    startButton.disabled = true;
    try {
      const data = await api("/api/live/start", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:Number(userId), title:(titleInput?.value || "Live").trim()})});
      await joinLive(data.live.id);
    } catch (error) { setLobbyMessage(error.message); }
    finally { startButton.disabled = false; }
  });

  if (endButton) endButton.addEventListener("click", async function(){
    if (!sessionId || !isHost) return;
    endButton.disabled = true;
    try { await api("/api/live/" + encodeURIComponent(sessionId) + "/end", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:Number(userId)})}); setMessage("Live ended."); }
    catch (error) { setMessage(error.message); }
    finally { endButton.disabled = false; await leaveCurrentLive(); if (localStream) localStream.getTracks().forEach(function(t){t.stop();}); closePeers(); stopPolling(); setTimeout(function(){go("/live");},700); }
  });

  if (commentButton) commentButton.addEventListener("click", async function(){
    const text = (commentInput?.value || "").trim();
    if (!text || !sessionId) return;
    try { await api("/api/live/" + encodeURIComponent(sessionId) + "/comments", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:Number(userId), text:text})}); commentInput.value=""; await pollComments(); }
    catch (error) { setMessage(error.message); }
  });

  if (commentInput) commentInput.addEventListener("keydown", function(event){ if(event.key === "Enter") commentButton?.click(); });
  if (reactionButton) reactionButton.addEventListener("click", async function(){
    if (!sessionId) return;
    try { const data=await api("/api/live/" + encodeURIComponent(sessionId) + "/react", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:Number(userId),reaction:"like"})}); setMessage("❤️ Reaction sent · " + data.reaction_count); }
    catch(error){setMessage(error.message);}
  });
  if (shareButton) shareButton.addEventListener("click", async function(){
    if (!sessionId) return;
    const link=window.location.origin+"/live?live_id="+encodeURIComponent(sessionId);
    try { await navigator.clipboard.writeText(link); setMessage("Live link copied!"); } catch(_) { setMessage(link); }
  });

  [byId("liveBackButton"), byId("liveBackButton2")].forEach(function(button){ if(button)button.addEventListener("click", async function(){ await leaveCurrentLive(); stopPolling(); closePeers(); go("/home"); }); });

  window.addEventListener("beforeunload", function(){
    if (localStream) localStream.getTracks().forEach(function(t){t.stop();});
    if (sessionId && userId) navigator.sendBeacon("/api/live/" + encodeURIComponent(sessionId) + "/leave", new Blob([JSON.stringify({user_id:Number(userId)})], {type:"application/json"}));
  });

  const params = new URLSearchParams(window.location.search);
  const requestedLive = params.get("live_id");
  if (requestedLive) joinLive(requestedLive); else loadActiveLives();
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
  setupSharePage();
  setupLivePage();
  const logout=byId("logoutButton"); if(logout)logout.onclick=function(){localStorage.removeItem("xinon_user_id");go("/login");};
});
