const API_URL = "https://web-production-2b6e4.up.railway.app";

function getCurrentUserId() {
    return localStorage.getItem("xinon_user_id");
}

function go(path) {
    window.location.href = path;
}

window.xinonOpenMediaView = function(viewId) {
    const routes = {
        homeView: "/home", reelsView: "/reels", profileView: "/profile", friendsView: "/friends",
        searchView: "/search", notificationsView: "/notifications", createPostView: "/create-post",
        shareView: "/share", settingsView: "/settings", channelCreateView: "/channel/create", termsView: "/terms"
    };
    if (routes[viewId]) go(routes[viewId]);
};

window.xinonOpenComposer = function(mode) {
    if (mode === "photo") localStorage.setItem("xinon_composer_mode", "photo");
    else if (mode === "video") localStorage.setItem("xinon_composer_mode", "video");
    else localStorage.setItem("xinon_composer_mode", "text");
    go("/create-post");
};

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function(c) {
        return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c];
    });
}

function setupTopNavigation() {
    const searchButton = document.getElementById("searchButton");
    if (searchButton) searchButton.addEventListener("click", () => go("/search"));
    const notificationsButton = document.getElementById("notificationsButton");
    if (notificationsButton) notificationsButton.addEventListener("click", () => go("/notifications"));

    document.querySelectorAll(".nav-button").forEach(btn => {
        btn.addEventListener("click", function() {
            const id = this.getAttribute("data-view");
            window.xinonOpenMediaView(id);
        });
    });
}

function setupReactionsAndComments() {
    document.querySelectorAll(".like-button").forEach(button => button.addEventListener("click", function(event) {
        event.stopPropagation();
        const actions = button.closest(".reel-actions");
        if (!actions) return;
        const menu = actions.querySelector("[data-reaction-menu]");
        if (!menu) return;
        document.querySelectorAll("[data-reaction-menu]").forEach(m => { if (m !== menu) m.classList.add("hidden"); });
        menu.classList.toggle("hidden");
    }));
    document.querySelectorAll(".reaction").forEach(reaction => reaction.addEventListener("click", function() {
        const actions = reaction.closest(".reel-actions");
        const likeButton = actions && actions.querySelector(".like-button");
        if (!likeButton) return;
        const selected = reaction.getAttribute("data-reaction");
        const current = likeButton.getAttribute("data-current-reaction");
        if (current === selected) { likeButton.textContent = "👍 Like"; likeButton.removeAttribute("data-current-reaction"); }
        else { likeButton.textContent = selected + " Like"; likeButton.setAttribute("data-current-reaction", selected); }
        const menu = actions.querySelector("[data-reaction-menu]");
        if (menu) menu.classList.add("hidden");
    }));
    document.addEventListener("click", event => {
        if (!event.target.closest(".reel-actions")) document.querySelectorAll("[data-reaction-menu]").forEach(m => m.classList.add("hidden"));
    });
    document.querySelectorAll(".comment-button").forEach(button => button.addEventListener("click", function() {
        const card = button.closest(".reel-card"); const box = card && card.querySelector(".comment-box");
        if (!box) return; box.classList.toggle("show"); if (box.classList.contains("show")) box.querySelector(".comment-input")?.focus();
    }));
    document.querySelectorAll(".comment-send").forEach(button => button.addEventListener("click", function() {
        const box = button.closest(".comment-box"); const input = box && box.querySelector(".comment-input");
        if (!input || !input.value.trim()) return; button.textContent = "Sent"; input.value = "";
        setTimeout(() => button.textContent = "Send", 900);
    }));
}

function setupHomeComposer() {
    ["openPostComposerButton", "textPostButton"].forEach(id => document.getElementById(id)?.addEventListener("click", () => window.xinonOpenComposer("text")));
    document.getElementById("photoPostButton")?.addEventListener("click", () => window.xinonOpenComposer("photo"));
    document.getElementById("videoPostButton")?.addEventListener("click", () => window.xinonOpenComposer("video"));
}

function setupCreatePost() {
    const photoInput=document.getElementById("composerPhotoInput"), videoInput=document.getElementById("composerVideoInput");
    const box=document.getElementById("selectedMediaBox");
    function show(file,type) {
        if(!box||!file)return; box.classList.remove("hidden"); box.innerHTML="<strong>Selected:</strong> "+escapeHtml(file.name);
        const url=URL.createObjectURL(file); box.innerHTML += type === "image" ? '<br><img src="'+url+'" alt="Selected photo">' : '<br><video controls src="'+url+'"></video>';
    }
    document.getElementById("composerPhotoButton")?.addEventListener("click",()=>photoInput?.click());
    document.getElementById("composerVideoButton")?.addEventListener("click",()=>videoInput?.click());
    photoInput?.addEventListener("change",()=>show(photoInput.files[0],"image"));
    videoInput?.addEventListener("change",()=>show(videoInput.files[0],"video"));
    const mode=localStorage.getItem("xinon_composer_mode");
    if(mode==="photo") photoInput?.click(); else if(mode==="video") videoInput?.click(); else if(mode==="text") document.getElementById("postTextInput")?.focus();
    localStorage.removeItem("xinon_composer_mode");
    document.getElementById("publishPostButton")?.addEventListener("click",()=>{
        const text=document.getElementById("postTextInput")?.value.trim(); const photo=photoInput?.files[0]; const video=videoInput?.files[0]; const result=document.getElementById("publishResult");
        if(!text&&!photo&&!video) { result.textContent="Write something or choose a photo/video first."; return; }
        result.textContent="Post prepared successfully. Database publishing will be connected next.";
    });
}

function setupSearch() {
    const form=document.getElementById("searchForm"); if(!form)return;
    form.addEventListener("submit",event=>{ event.preventDefault(); const q=document.getElementById("searchInput")?.value.trim(); const results=document.getElementById("searchResults");
        if(!q){results.innerHTML='<div class="utility-empty"><div>🔎</div><strong>Search Xinon</strong><p>Enter something to search.</p></div>';return;}
        results.innerHTML='<div class="friend-card"><div class="friend-avatar">X</div><div class="friend-info"><strong>'+escapeHtml(q)+'</strong><small>Search results will come from the database after user/search APIs are connected.</small></div><button class="friend-button" type="button">View</button></div>';
    });
}

function setupFriends() {
    const find=document.getElementById("findPeopleButton"), requests=document.getElementById("friendRequestsButton"), fs=document.getElementById("findPeopleSection"), rs=document.getElementById("friendRequestsSection");
    find?.addEventListener("click",()=>{fs?.classList.remove("hidden");rs?.classList.add("hidden");fs?.scrollIntoView({behavior:"smooth",block:"start"});});
    requests?.addEventListener("click",()=>{rs?.classList.remove("hidden");fs?.classList.add("hidden");rs?.scrollIntoView({behavior:"smooth",block:"start"});});
    document.getElementById("friendSearchForm")?.addEventListener("submit",event=>{event.preventDefault();const q=document.getElementById("friendSearchInput")?.value.trim();const r=document.getElementById("peopleResults");if(!q||!r)return;r.innerHTML='<div class="friend-card"><div class="friend-avatar">'+escapeHtml(q.charAt(0).toUpperCase())+'</div><div class="friend-info"><strong>'+escapeHtml(q)+'</strong><small>Demo result — real people will load from the database.</small></div><button class="friend-button add-friend-demo" type="button">Add Friend</button></div>';});
    document.addEventListener("click",event=>{const b=event.target.closest(".add-friend-demo");if(b){b.textContent="Request Sent";b.disabled=true;}});
}

async function loadMyChannels() {
    const box=document.getElementById("myChannels"), userId=getCurrentUserId(); if(!box)return; if(!userId){box.innerHTML="";return;}
    try { const response=await fetch(API_URL+"/api/channels?user_id="+encodeURIComponent(userId)); const data=await response.json();
        if(!response.ok||!Array.isArray(data.channels)||data.channels.length===0){box.innerHTML="";return;}
        box.innerHTML="<h4>My Channels</h4>"+data.channels.map(c=>'<div class="channel-item"><img src="'+escapeHtml(c.profile_photo_url||"")+'" alt=""><div><strong>'+escapeHtml(c.name)+'</strong><br><small>'+escapeHtml(c.visibility||"")+' · <a href="'+escapeHtml(c.link||"#")+'" target="_blank" rel="noopener">Open Channel</a></small></div></div>').join("");
    } catch(e) { box.innerHTML=""; }
}

function setupProfileSettings() {
    document.getElementById("openSettingsButton")?.addEventListener("click",()=>go("/settings"));
    document.getElementById("openChannelButton")?.addEventListener("click",()=>go("/channel/create"));
    document.getElementById("logoutButton")?.addEventListener("click",()=>{localStorage.removeItem("xinon_user_id");go("/");});
    document.getElementById("backToProfileButton")?.addEventListener("click",()=>go("/profile"));
    document.getElementById("backFromChannelButton")?.addEventListener("click",()=>go("/profile"));
    document.getElementById("backFromTermsButton")?.addEventListener("click",()=>go("/settings"));
    document.querySelectorAll(".profile-tab").forEach(tab=>tab.addEventListener("click",()=>{if(tab.textContent.trim()==="Friends")go("/friends");}));
    loadMyChannels();
}

function setupChannelWizard() {
    const name=document.getElementById("channelName"), next=document.getElementById("channelNextButton"), back=document.getElementById("channelBackButton"), photo=document.getElementById("channelPhotoInput"), preview=document.getElementById("channelPhotoPreview"), summary=document.getElementById("channelSummary"), create=document.getElementById("createChannelButton");
    if(!name||!next||!back||!photo||!preview||!summary||!create)return;
    const s1=document.getElementById("channelStep1"),s2=document.getElementById("channelStep2"),e1=document.getElementById("channelStep1Error"),e2=document.getElementById("channelStep2Error"),result=document.getElementById("channelCreateResult");
    let selected=null;
    next.addEventListener("click",()=>{const n=name.value.trim(),v=document.querySelector('input[name="channelVisibility"]:checked');e1.textContent="";if(!n){e1.textContent="Channel name is required.";return;}if(!v){e1.textContent="Please choose Public or Private.";return;}summary.innerHTML="<strong>Channel:</strong> "+escapeHtml(n)+"<br><strong>Visibility:</strong> "+escapeHtml(v.value)+"<br><strong>Link:</strong> Xinon will generate a unique link after creation.";s1.classList.remove("active");s2.classList.add("active");});
    back.addEventListener("click",()=>{s2.classList.remove("active");s1.classList.add("active");});
    photo.addEventListener("change",()=>{e2.textContent="";const f=photo.files[0];if(!f){selected=null;create.disabled=true;return;}if(f.size>2*1024*1024){e2.textContent="Profile photo must be 2 MB or smaller.";photo.value="";selected=null;create.disabled=true;return;}selected=f;const r=new FileReader();r.onload=e=>preview.src=e.target.result;r.readAsDataURL(f);create.disabled=false;});
    create.addEventListener("click",async()=>{e2.textContent="";result.textContent="";const n=name.value.trim(),v=document.querySelector('input[name="channelVisibility"]:checked'),uid=getCurrentUserId();if(!n||!v||!selected){e2.textContent="Channel name, visibility, and profile photo are all required.";return;}if(!uid){e2.textContent="Please log in again before creating a Channel.";return;}create.disabled=true;create.textContent="Creating...";const fd=new FormData();fd.append("user_id",uid);fd.append("name",n);fd.append("visibility",v.value);fd.append("profile_photo",selected);try{const r=await fetch(API_URL+"/api/channels",{method:"POST",body:fd});const d=await r.json().catch(()=>({}));if(!r.ok){e2.textContent=d.error||"Channel creation failed.";return;}result.className="result-box success-text";result.innerHTML="Channel created successfully!<br><strong>Link:</strong> <span class="channel-link">"+escapeHtml(d.channel?.link||"")+"</span>";}catch(err){e2.textContent="Connection error: "+err.message;}finally{create.disabled=false;create.textContent="Create Channel";}});
}

function setupShare() {
    document.querySelectorAll("[data-share-action]").forEach(button=>button.addEventListener("click",async()=>{const result=document.getElementById("shareResult"),action=button.getAttribute("data-share-action");if(!result)return;if(action==="copy"){try{await navigator.clipboard.writeText(window.location.href);result.textContent="Post link copied.";}catch(e){result.textContent="Copy is not available in this preview. You can share the page manually.";}}else if(action==="feed")result.textContent="Share-to-feed UI is ready. Database posting will be connected next.";else result.textContent="Message sharing UI is ready. Messaging will be connected next.";}));
}

document.addEventListener("DOMContentLoaded",()=>{
    setupTopNavigation(); setupReactionsAndComments(); setupHomeComposer(); setupCreatePost(); setupSearch(); setupFriends(); setupProfileSettings(); setupChannelWizard(); setupShare();
});
