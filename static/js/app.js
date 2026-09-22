const API_URL = "";

function byId(id){ return document.getElementById(id); }
function go(path){ window.location.href = path; }

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = byId("loginForm");
  const registerForm = byId("registerForm");
  const showRegister = byId("showRegisterButton");
  const backLogin = byId("backToLoginButton");
  const loginPage = byId("loginPage");
  const registerPage = byId("registerPage");

  if(showRegister && loginPage && registerPage) showRegister.onclick=()=>{loginPage.classList.add("hidden");registerPage.classList.remove("hidden");};
  if(backLogin && loginPage && registerPage) backLogin.onclick=()=>{registerPage.classList.add("hidden");loginPage.classList.remove("hidden");};

  if(loginForm){ loginForm.addEventListener("submit", async e=>{
    e.preventDefault(); const result=byId("loginResult"); if(result) result.textContent="Logging in...";
    try{
      const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:byId("loginEmail")?.value,password:byId("loginPassword")?.value})});
      const data=await r.json().catch(()=>({}));
      if(r.ok){ if(data.user_id) localStorage.setItem("xinon_user_id",String(data.user_id)); if(result) result.textContent="Login successful!"; setTimeout(()=>go("/home"),200); }
      else if(result) result.textContent=data.error||"Login failed.";
    }catch(err){if(result) result.textContent="Connection error: "+err.message;}
  });}

  if(registerForm){ registerForm.addEventListener("submit", async e=>{
    e.preventDefault(); const result=byId("registerResult"); if(result) result.textContent="Creating account...";
    const data={name:byId("name")?.value,birthday:byId("birthday")?.value,gender:byId("gender")?.value,username:byId("username")?.value,email:byId("email")?.value,password:byId("password")?.value};
    try{const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const d=await r.json().catch(()=>({}));if(result) result.textContent=r.ok?"Account created successfully!":(d.error||"Registration failed.");if(r.ok){setTimeout(()=>{if(backLogin)backLogin.click();},700);}}catch(err){if(result)result.textContent="Connection error: "+err.message;}
  });}

  const routes={home:"/home",reels:"/reels",profile:"/profile"};
  document.querySelectorAll(".bottom-nav .nav-button").forEach(b=>{b.addEventListener("click",()=>{const v=b.dataset.view||""; const key=v.replace("View",""); if(routes[key]) go(routes[key]);});});
  const links={friends:"/friends",search:"/search",notifications:"/notifications",createPost:"/create-post",share:"/share",settings:"/settings",channelCreate:"/channel/create",terms:"/terms"};
  Object.entries(links).forEach(([id,path])=>{const e=byId(id+"Button");if(e)e.addEventListener("click",()=>go(path));});
  const logout=byId("logoutButton"); if(logout) logout.onclick=()=>{localStorage.removeItem("xinon_user_id");go("/login");};
});
