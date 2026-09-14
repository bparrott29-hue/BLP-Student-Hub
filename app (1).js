let mode='login'; let currentUser=null;
const $=id=>document.getElementById(id);

function users(){return JSON.parse(localStorage.getItem('blp_users')||'{}')}
function saveUsers(x){localStorage.setItem('blp_users',JSON.stringify(x))}
function key(){return 'blp_data_'+currentUser}
function data(){return JSON.parse(localStorage.getItem(key())||'{"assignments":[],"grades":[],"sheet":[] }')}
function saveData(x){localStorage.setItem(key(),JSON.stringify(x));renderAll()}

$('loginTab').onclick=()=>{mode='login';$('loginTab').classList.add('active');$('signupTab').classList.remove('active');$('authButton').textContent='Login';$('authMessage').textContent=''}
$('signupTab').onclick=()=>{mode='signup';$('signupTab').classList.add('active');$('loginTab').classList.remove('active');$('authButton').textContent='Create Account';$('authMessage').textContent=''}

$('authForm').onsubmit=e=>{
 e.preventDefault(); const email=$('email').value.trim().toLowerCase(), pass=$('password').value;
 const u=users();
 if(mode==='signup'){
   if(u[email]) return $('authMessage').textContent='An account with that email already exists.';
   u[email]={password:pass}; saveUsers(u); currentUser=email; showApp();
 }else{
   if(!u[email]||u[email].password!==pass) return $('authMessage').textContent='Incorrect email or password.';
   currentUser=email; showApp();
 }
};
function showApp(){ $('authScreen').classList.add('hidden');$('appScreen').classList.remove('hidden');$('userEmail').textContent=currentUser;$('accountText').textContent=currentUser;renderAll()}
$('logoutButton').onclick=()=>{currentUser=null;$('appScreen').classList.add('hidden');$('authScreen').classList.remove('hidden');$('email').value='';$('password').value=''}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(b.dataset.page).classList.remove('hidden')})

function addAssignment(name,due){if(!name)return;let d=data();d.assignments.push({name,due,done:false,id:Date.now()});saveData(d)}
$('addAssignment').onclick=()=>{addAssignment($('assignmentName').value,$('assignmentDue').value);$('assignmentName').value='';$('assignmentDue').value=''}
$('quickAdd').onclick=()=>{addAssignment($('quickAssignment').value,$('quickDue').value);$('quickAssignment').value='';$('quickDue').value=''}
function renderAll(){
 let d=data();
 $('assignmentCount').textContent=d.assignments.length;
 $('completedCount').textContent=d.assignments.filter(x=>x.done).length;
 $('assignmentList').innerHTML=d.assignments.length?d.assignments.map(x=>`<div class="assignment ${x.done?'done':''}"><div><b>${escapeHtml(x.name)}</b><div class="muted">${x.due||'No due date'}</div></div><button onclick="toggleAssignment(${x.id})">${x.done?'Undo':'Complete'}</button></div>`).join(''):'<p class="muted">No assignments yet.</p>';
 $('calendarList').innerHTML=d.assignments.slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).map(x=>`<p><b>${x.due||'No date'}</b> — ${escapeHtml(x.name)}</p>`).join('')||'<p class="muted">No events yet.</p>';
 $('gradeList').innerHTML=d.grades.map((x,i)=>`<div class="assignment"><b>${escapeHtml(x.name)}</b><span>${escapeHtml(x.grade)} <button onclick="deleteGrade(${i})">Delete</button></span></div>`).join('');
 $('sheetBody').innerHTML=d.sheet.map((x,i)=>`<tr><td>${escapeHtml(x.subject)}</td><td>${escapeHtml(x.note)}</td><td><button onclick="deleteRow(${i})">Delete</button></td></tr>`).join('');
}
window.toggleAssignment=id=>{let d=data();let x=d.assignments.find(a=>a.id===id);if(x)x.done=!x.done;saveData(d)}
$('addGrade').onclick=()=>{let n=$('className').value,g=$('gradeValue').value;if(!n||!g)return;let d=data();d.grades.push({name:n,grade:g});saveData(d);$('className').value='';$('gradeValue').value=''}
window.deleteGrade=i=>{let d=data();d.grades.splice(i,1);saveData(d)}
$('addSheetRow').onclick=()=>{let s=$('sheetSubject').value,n=$('sheetNote').value;if(!s&&!n)return;let d=data();d.sheet.push({subject:s,note:n});saveData(d);$('sheetSubject').value='';$('sheetNote').value=''}
window.deleteRow=i=>{let d=data();d.sheet.splice(i,1);saveData(d)}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
