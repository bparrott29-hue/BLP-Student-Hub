const SUPABASE_URL = "https://wukwyjtbxqpthbwqhsmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4SZZm0RQZ48mYYPdEUacyQ_hLZu5FNt";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
(function(){
"use strict";
var mode="login", currentUser=null;

function $(id){return document.getElementById(id);}
function getUsers(){try{return JSON.parse(localStorage.getItem("blp_users")||"{}")}catch(e){return {}}}
function saveUsers(u){localStorage.setItem("blp_users",JSON.stringify(u));}
function storageKey(){return "blp_student_"+currentUser;}
function getData(){try{return JSON.parse(localStorage.getItem(storageKey())||'{"assignments":[],"grades":[],"sheet":[]}')}catch(e){return {assignments:[],grades:[],sheet:[]}}}
function saveData(d){localStorage.setItem(storageKey(),JSON.stringify(d));render();}

function message(text){$("authMessage").textContent=text;}

$("loginTab").addEventListener("click",function(){
 mode="login"; $("loginTab").classList.add("active"); $("signupTab").classList.remove("active");
 $("authSubmit").textContent="Login"; message("");
});
$("signupTab").addEventListener("click",function(){
 mode="signup"; $("signupTab").classList.add("active"); $("loginTab").classList.remove("active");
 $("authSubmit").textContent="Create Account"; message("");
});

$("authForm").addEventListener("submit",function(e){
 e.preventDefault();
 var email=$("email").value.trim().toLowerCase(), password=$("password").value, users=getUsers();
 if(password.length<6){message("Password must be at least 6 characters.");return;}
 if(mode==="signup"){
   if(users[email]){message("That account already exists. Try Login.");return;}
   users[email]={password:password}; saveUsers(users); currentUser=email; showApp();
 }else{
   if(!users[email] || users[email].password!==password){message("Incorrect email or password.");return;}
   currentUser=email; showApp();
 }
});

function showApp(){
 $("auth").classList.add("hidden"); $("app").classList.remove("hidden");
 $("who").textContent=currentUser; $("account").textContent=currentUser; render();
}
$("logout").addEventListener("click",function(){
 currentUser=null; $("app").classList.add("hidden"); $("auth").classList.remove("hidden");
 $("email").value=""; $("password").value=""; mode="login";
 $("loginTab").classList.add("active"); $("signupTab").classList.remove("active"); $("authSubmit").textContent="Login"; message("");
});

document.querySelectorAll(".nav").forEach(function(btn){
 btn.addEventListener("click",function(){
   document.querySelectorAll(".nav").forEach(function(x){x.classList.remove("active")});
   btn.classList.add("active");
   document.querySelectorAll(".page").forEach(function(x){x.classList.add("hidden")});
   $(btn.dataset.page).classList.remove("hidden");
 });
});

function addAssignment(name,date){
 name=name.trim(); if(!name){return;}
 var d=getData(); d.assignments.push({id:Date.now()+Math.random(),name:name,date:date||"",done:false}); saveData(d);
}
$("addA").addEventListener("click",function(){addAssignment($("aName").value,$("aDate").value);$("aName").value="";$("aDate").value=""});
$("quickAdd").addEventListener("click",function(){addAssignment($("quickName").value,$("quickDate").value);$("quickName").value="";$("quickDate").value=""});

window.toggleAssignment=function(id){
 var d=getData(); d.assignments.forEach(function(a){if(String(a.id)===String(id))a.done=!a.done}); saveData(d);
};

$("addG").addEventListener("click",function(){
 var c=$("gClass").value.trim(), v=$("gValue").value.trim(); if(!c||!v)return;
 var d=getData(); d.grades.push({name:c,value:v}); saveData(d); $("gClass").value="";$("gValue").value="";
});
window.deleteGrade=function(i){var d=getData();d.grades.splice(i,1);saveData(d)};

$("addS").addEventListener("click",function(){
 var s=$("sSubject").value.trim(), n=$("sNote").value.trim();if(!s&&!n)return;
 var d=getData();d.sheet.push({subject:s,note:n});saveData(d);$("sSubject").value="";$("sNote").value="";
});
window.deleteSheet=function(i){var d=getData();d.sheet.splice(i,1);saveData(d)};

function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function render(){
 var d=getData();
 $("total").textContent=d.assignments.length;
 $("done").textContent=d.assignments.filter(function(a){return a.done}).length;
 $("assignmentList").innerHTML=d.assignments.length?d.assignments.map(function(a){
   return '<div class="assignment '+(a.done?"done":"")+'"><div><b>'+esc(a.name)+'</b><div class="muted">'+esc(a.date||"No due date")+'</div></div><button type="button" onclick="toggleAssignment('+a.id+')">'+(a.done?"Undo":"Complete")+'</button></div>';
 }).join(""):'<p class="muted">No assignments yet.</p>';
 var sorted=d.assignments.slice().sort(function(a,b){return (a.date||"9999").localeCompare(b.date||"9999")});
 $("calendarList").innerHTML=sorted.length?sorted.map(function(a){return "<p><b>"+esc(a.date||"No date")+"</b> — "+esc(a.name)+"</p>"}).join(""):'<p class="muted">No assignments on the calendar yet.</p>';
 $("gradeList").innerHTML=d.grades.length?d.grades.map(function(g,i){return '<div class="assignment"><b>'+esc(g.name)+'</b><span>'+esc(g.value)+' <button type="button" onclick="deleteGrade('+i+')">Delete</button></span></div>'}).join(""):'<p class="muted">No grades yet.</p>';
 $("sheetBody").innerHTML=d.sheet.map(function(r,i){return "<tr><td>"+esc(r.subject)+"</td><td>"+esc(r.note)+"</td><td><button type='button' onclick='deleteSheet("+i+")'>Delete</button></td></tr>"}).join("");
}
})();
