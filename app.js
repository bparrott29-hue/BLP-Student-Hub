const SUPABASE_URL = "https://wukwyjtbxqpthbwqhsmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4SZZm0RQZ48mYYPdEUacyQ_hLZu5FNt";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


const $ = (id) => document.getElementById(id);

let currentUser = null;
let currentProfile = null;
let selectedMode = "student";
let authMode = "login";


function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}


function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}


function setMessage(message, isError = true) {
  const box = $("authMessage");

  if (!box) return;

  box.textContent = message;
  box.style.color = isError ? "#b42318" : "#16794c";
}


function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString();
}


/* =========================================================
   INITIAL PAGE SETUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupAuthButtons();
  setupAuthForm();
  setupDashboardButtons();

  await checkExistingSession();

});


/* =========================================================
   AUTH BUTTONS
   ========================================================= */

function setupAuthButtons() {

  $("adminLoginTab")?.addEventListener("click", () => {

  authMode = "admin-login";
  selectedMode = "admin";

  $("loginTab").className = "secondary";
  $("signupTab").className = "secondary";
  $("adminLoginTab").className = "primary";

  hide($("studentMode"));
  hide($("teacherMode"));

  if ($("authSubmit")) {
    $("authSubmit").textContent = "Administrator Login";
  }

  setMessage("");
});

  $("loginTab")?.addEventListener("click", () => {

    authMode = "login";

    $("loginTab").className = "primary";
    $("signupTab").className = "secondary";

    if ($("authSubmit")) {
      $("authSubmit").textContent = "Login";
    }

    show($("studentMode"));
    show($("teacherMode"));

    setMessage("");

  });


  $("signupTab")?.addEventListener("click", () => {

    authMode = "signup";

    $("loginTab").className = "secondary";
    $("signupTab").className = "primary";

    if ($("authSubmit")) {
      $("authSubmit").textContent = "Create Account";
    }

    /*
      Normal website signup is student-only.
      Teacher and Administrator accounts are created/assigned
      through Supabase.
    */

    selectedMode = "student";

    $("studentMode").className = "mode-selected";

    if ($("teacherMode")) {
      $("teacherMode").className = "secondary";
    }

    show($("studentMode"));
    hide($("teacherMode"));

    setMessage("");

  });


  $("studentMode")?.addEventListener("click", () => {

    selectedMode = "student";

    $("studentMode").className = "mode-selected";

    if ($("teacherMode")) {
      $("teacherMode").className = "secondary";
    }

    setMessage("");

  });


  $("teacherMode")?.addEventListener("click", () => {

    if (authMode === "signup") {
      return;
    }

    selectedMode = "teacher";

    $("teacherMode").className = "mode-selected";

    if ($("studentMode")) {
      $("studentMode").className = "secondary";
    }

    setMessage("");

  });


  /*
    Administrator Login

    We create this button dynamically so your HTML does not
    need another ID.
  */

  createAdministratorLoginButton();
}


/* =========================================================
   ADMINISTRATOR LOGIN BUTTON
   ========================================================= */

function createAdministratorLoginButton() {

  const tabs = document.querySelector(".tabs");

  if (!tabs) return;

  if ($("adminLoginTab")) return;

  const adminButton = document.createElement("button");

  adminButton.id = "adminLoginTab";
  adminButton.className = "secondary";
  adminButton.textContent = "Administrator Login";

  tabs.appendChild(adminButton);

  adminButton.addEventListener("click", () => {

    authMode = "admin-login";
    selectedMode = "admin";

    $("loginTab").className = "secondary";
    $("signupTab").className = "secondary";
    adminButton.className = "primary";

    /*
      Hide Student/Teacher choices for Administrator Login.
    */

    hide($("studentMode"));
    hide($("teacherMode"));

    if ($("authSubmit")) {
      $("authSubmit").textContent = "Administrator Login";
    }

    setMessage("");

  });
}


/* =========================================================
   AUTH FORM
   ========================================================= */

function setupAuthForm() {

  $("authForm")?.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setMessage("Please wait...", false);

    if (authMode === "signup") {
      await createStudentAccount(email, password);
      return;
    }

    await loginUser(email, password);

  });
}


/* =========================================================
   STUDENT SIGNUP
   ========================================================= */

async function createStudentAccount(email, password) {

  /*
    Students are the only users who can create an account
    from the website.
  */

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    setMessage(error.message);
    return;
  }

  /*
    The database trigger should automatically create the
    student's profile.
  */

  if (data.session) {

    setMessage("Account created successfully.", false);

    await loadCurrentUser();

  } else {

    setMessage(
      "Account created. Check your email to confirm your account.",
      false
    );

  }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    setMessage(error.message);
    return;
  }

  currentUser = data.user;

  /*
    Get the user's profile and role.
  */

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (profileError || !profile) {

    await supabase.auth.signOut();

    setMessage(
      "Your account does not have a profile yet. Please contact an administrator."
    );

    return;
  }

  currentProfile = profile;

  /*
    Make sure the account is active.
  */

  if (profile.active === false) {

    await supabase.auth.signOut();

    setMessage(
      "This account has been deactivated. Please contact a teacher or administrator."
    );

    return;
  }


  /*
    Make sure the selected login type matches the account.
  */

  if (authMode === "admin-login") {

    if (profile.role !== "admin") {

      await supabase.auth.signOut();

      setMessage(
        "This account is not an Administrator account."
      );

      return;
    }

  } else {

    if (selectedMode === "student" && profile.role !== "student") {

      await supabase.auth.signOut();

      setMessage(
        "This account is not a Student account."
      );

      return;
    }


    if (selectedMode === "teacher" && profile.role !== "teacher") {

      await supabase.auth.signOut();

      setMessage(
        "This account is not a Teacher account."
      );

      return;
    }

  }


  /*
    Login successful.
  */

  await openDashboard();

}


/* =========================================================
   CHECK EXISTING SESSION
   ========================================================= */

async function checkExistingSession() {

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    show($("auth"));
    hide($("app"));
    return;
  }

  currentUser = data.session.user;

  await loadCurrentUser();

}


/* =========================================================
   LOAD CURRENT USER
   ========================================================= */

async function loadCurrentUser() {

  if (!currentUser) {
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !profile) {

    await supabase.auth.signOut();

    show($("auth"));
    hide($("app"));

    setMessage(
      "Could not find your user profile."
    );

    return;
  }

  currentProfile = profile;

  if (profile.active === false) {

    await supabase.auth.signOut();

    show($("auth"));
    hide($("app"));

    setMessage(
      "Your account has been deactivated."
    );

    return;
  }

  await openDashboard();
}


/* =========================================================
   OPEN DASHBOARD
   ========================================================= */

async function openDashboard() {

  hide($("auth"));
  show($("app"));

  /*
    Only the Dashboard exists on this version of the site.
  */

  updateUserInterface();

  await loadAnnouncements();
  await loadLinks();

  if (
    currentProfile &&
    (currentProfile.role === "teacher" ||
     currentProfile.role === "admin")
  ) {

    show($("teacherControls"));

    await loadUsers();

  } else {

    hide($("teacherControls"));

  }

}


/* =========================================================
   UPDATE USER INTERFACE
   ========================================================= */

function updateUserInterface() {

  if (!currentProfile) return;

  const username =
    currentProfile.username ||
    currentUser?.email ||
    "User";

  if ($("who")) {
    $("who").textContent = username;
  }


  if ($("roleBadge")) {

    const role = currentProfile.role || "student";

    $("roleBadge").textContent =
      role.charAt(0).toUpperCase() + role.slice(1);

  }


  if ($("welcome")) {

    $("welcome").textContent =
      `Welcome, ${username}!`;

  }


  if ($("welcomeText")) {

    if (currentProfile.role === "admin") {

      $("welcomeText").textContent =
        "You are logged in as an Administrator. You have full dashboard management access.";

    } else if (currentProfile.role === "teacher") {

      $("welcomeText").textContent =
        "You are logged in as a Teacher. You can manage announcements, links, and users.";

    } else {

      $("welcomeText").textContent =
        "Welcome to your BLP Student Hub dashboard.";

    }

  }

}


/* =========================================================
   DASHBOARD BUTTONS
   ========================================================= */

function setupDashboardButtons() {

  $("logout")?.addEventListener("click", async () => {

    await supabase.auth.signOut();

    currentUser = null;
    currentProfile = null;

    hide($("app"));
    show($("auth"));

    $("email").value = "";
    $("password").value = "";

    authMode = "login";
    selectedMode = "student";

    $("loginTab").className = "primary";
    $("signupTab").className = "secondary";

    if ($("adminLoginTab")) {
      $("adminLoginTab").className = "secondary";
    }

    show($("studentMode"));
    show($("teacherMode"));

    $("studentMode").className = "mode-selected";

    if ($("teacherMode")) {
      $("teacherMode").className = "secondary";
    }

    $("authSubmit").textContent = "Login";

    setMessage("");

  });


  $("postAnnouncement")?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      await postAnnouncement();

    }
  );


  $("postLink")?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      await postLink();

    }
  );

}


/* =========================================================
   CHECK STAFF ACCESS
   ========================================================= */

function isStaff() {

  return (
    currentProfile &&
    (
      currentProfile.role === "teacher" ||
      currentProfile.role === "admin"
    )
  );

}


function isAdmin() {

  return (
    currentProfile &&
    currentProfile.role === "admin"
  );

}


/* =========================================================
   LOAD ANNOUNCEMENTS
   ========================================================= */

async function loadAnnouncements() {

  const list = $("announcementList");

  if (!list) return;

  list.innerHTML = "<p>Loading announcements...</p>";

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("id", { ascending: false });


  if (error) {

    list.innerHTML =
      `<p>Could not load announcements.</p>`;

    console.error(error);

    return;
  }


  const announcements = data || [];

  /*
    Update counters.
  */

  if ($("announcementCount")) {
    $("announcementCount").textContent =
      announcements.length;
  }

  if ($("teacherAnnouncementCount")) {
    $("teacherAnnouncementCount").textContent =
      announcements.length;
  }


  if (announcements.length === 0) {

    list.innerHTML =
      "<p>No announcements yet.</p>";

    return;
  }


  list.innerHTML = announcements.map(item => {

    return `
      <div class="announcement">

        <h4>
          ${escapeHtml(item.title)}
        </h4>

        <p>
          ${escapeHtml(item.content)}
        </p>

        ${
          item.created_at
            ? `<small>${escapeHtml(formatDate(item.created_at))}</small>`
            : ""
        }

        ${
          isStaff()
            ? `
              <div style="margin-top:10px; display:flex; gap:8px;">

                <button
                  class="secondary"
                  onclick="editAnnouncement(${item.id})"
                >
                  Edit
                </button>

                <button
                  class="kick-button"
                  onclick="deleteAnnouncement(${item.id})"
                >
                  Delete
                </button>

              </div>
            `
            : ""
        }

      </div>
    `;

  }).join("");

}


/* =========================================================
   POST ANNOUNCEMENT
   ========================================================= */

async function postAnnouncement() {

  if (!isStaff()) {

    alert("You do not have permission to post announcements.");

    return;
  }


  const title =
    $("announcementTitle")?.value.trim();

  const content =
    $("announcementText")?.value.trim();


  if (!title || !content) {

    alert("Please enter a title and announcement.");

    return;
  }


  const { error } = await supabase
    .from("announcements")
    .insert({
      title: title,
      content: content
    });


  if (error) {

    alert("Could not post announcement: " + error.message);

    console.error(error);

    return;
  }


  $("announcementTitle").value = "";
  $("announcementText").value = "";

  await loadAnnouncements();

}


/* =========================================================
   EDIT ANNOUNCEMENT
   ========================================================= */

window.editAnnouncement = async function(id) {

  if (!isStaff()) return;


  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();


  if (error || !data) {

    alert("Could not find that announcement.");

    return;
  }


  const newTitle =
    prompt("Edit announcement title:", data.title);

  if (newTitle === null) return;


  const newContent =
    prompt("Edit announcement:", data.content);

  if (newContent === null) return;


  const { error: updateError } = await supabase
    .from("announcements")
    .update({
      title: newTitle.trim(),
      content: newContent.trim()
    })
    .eq("id", id);


  if (updateError) {

    alert(
      "Could not update announcement: " +
      updateError.message
    );

    return;
  }


  await loadAnnouncements();

};


/* =========================================================
   DELETE ANNOUNCEMENT
   ========================================================= */

window.deleteAnnouncement = async function(id) {

  if (!isStaff()) return;


  const confirmed =
    confirm("Delete this announcement?");


  if (!confirmed) return;


  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Could not delete announcement: " +
      error.message
    );

    return;
  }


  await loadAnnouncements();

};


/* =========================================================
   LOAD LINKS
   ========================================================= */

async function loadLinks() {

  const list = $("linkList");

  if (!list) return;

  list.innerHTML = "<p>Loading links...</p>";


  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("id", { ascending: false });


  if (error) {

    list.innerHTML =
      "<p>Could not load links.</p>";

    console.error(error);

    return;
  }


  const links = data || [];


  if ($("linkCount")) {
    $("linkCount").textContent = links.length;
  }


  if ($("teacherLinkCount")) {
    $("teacherLinkCount").textContent = links.length;
  }


  if (links.length === 0) {

    list.innerHTML =
      "<p>No links yet.</p>";

    return;
  }


  list.innerHTML = links.map(item => {

    return `
      <div class="school-link">

        <h4>
          ${escapeHtml(item.title)}
        </h4>

        <a
          href="${escapeHtml(item.url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(item.url)}
        </a>

        ${
          isStaff()
            ? `
              <div style="margin-top:10px; display:flex; gap:8px;">

                <button
                  class="secondary"
                  onclick="editLink(${item.id})"
                >
                  Edit
                </button>

                <button
                  class="kick-button"
                  onclick="deleteLink(${item.id})"
                >
                  Delete
                </button>

              </div>
            `
            : ""
        }

      </div>
    `;

  }).join("");

}


/* =========================================================
   POST LINK
   ========================================================= */

async function postLink() {

  if (!isStaff()) {

    alert("You do not have permission to post links.");

    return;
  }


  const title =
    $("linkTitle")?.value.trim();

  const url =
    $("linkUrl")?.value.trim();


  if (!title || !url) {

    alert("Please enter a link name and URL.");

    return;
  }


  const { error } = await supabase
    .from("links")
    .insert({
      title: title,
      url: url
    });


  if (error) {

    alert(
      "Could not post link: " +
      error.message
    );

    console.error(error);

    return;
  }


  $("linkTitle").value = "";
  $("linkUrl").value = "";

  await loadLinks();

}


/* =========================================================
   EDIT LINK
   ========================================================= */

window.editLink = async function(id) {

  if (!isStaff()) return;


  const { data, error } = await supabase
    .from("links")
    .select("*")
    .eq("id", id)
    .single();


  if (error || !data) {

    alert("Could not find that link.");

    return;
  }


  const newTitle =
    prompt("Edit link name:", data.title);

  if (newTitle === null) return;


  const newUrl =
    prompt("Edit URL:", data.url);

  if (newUrl === null) return;


  const { error: updateError } = await supabase
    .from("links")
    .update({
      title: newTitle.trim(),
      url: newUrl.trim()
    })
    .eq("id", id);


  if (updateError) {

    alert(
      "Could not update link: " +
      updateError.message
    );

    return;
  }


  await loadLinks();

};


/* =========================================================
   DELETE LINK
   ========================================================= */

window.deleteLink = async function(id) {

  if (!isStaff()) return;


  const confirmed =
    confirm("Delete this link?");


  if (!confirmed) return;


  const { error } = await supabase
    .from("links")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Could not delete link: " +
      error.message
    );

    return;
  }


  await loadLinks();

};


/* =========================================================
   LOAD USERS
   ========================================================= */

async function loadUsers() {

  const list = $("userList");

  if (!list) return;

  list.innerHTML =
    "<p>Loading users...</p>";


  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });


  if (error) {

    list.innerHTML =
      "<p>Could not load users.</p>";

    console.error(error);

    return;
  }


  const users = data || [];


  /*
    Don't count the currently logged-in user as someone
    who can be kicked.
  */

  if ($("userCount")) {

    const activeUsers =
      users.filter(user => user.active !== false);

    $("userCount").textContent =
      activeUsers.length;

  }


  if (users.length === 0) {

    list.innerHTML =
      "<p>No users found.</p>";

    return;
  }


  list.innerHTML = users.map(user => {

    const isCurrentUser =
      user.id === currentUser?.id;

    const active =
      user.active !== false;


    /*
      Admins get more controls.
      Teachers can only activate/deactivate students.
    */

    let controls = "";


    if (isAdmin()) {

      controls = `
        <div style="display:flex; gap:8px; flex-wrap:wrap;">

          ${
            !isCurrentUser
              ? `
                <button
                  class="secondary"
                  onclick="changeUserRole('${user.id}', '${escapeHtml(user.role)}')"
                >
                  Change Role
                </button>
              `
              : ""
          }

          ${
            !isCurrentUser
              ? `
                <button
                  class="${active ? "kick-button" : "secondary"}"
                  onclick="toggleUserActive('${user.id}', ${active})"
                >
                  ${active ? "Deactivate" : "Activate"}
                </button>
              `
              : ""
          }

        </div>
      `;

    } else if (
      currentProfile?.role === "teacher" &&
      user.role === "student" &&
      !isCurrentUser
    ) {

      controls = `
        <button
          class="${active ? "kick-button" : "secondary"}"
          onclick="toggleUserActive('${user.id}', ${active})"
        >
          ${active ? "Kick" : "Reactivate"}
        </button>
      `;

    }


    return `
      <div class="user-row">

        <div class="user-details">

          <strong>
            ${escapeHtml(
              user.username ||
              "Unnamed User"
            )}
          </strong>

          <small>
            Role: ${escapeHtml(user.role)}
            ·
            Status: ${active ? "Active" : "Inactive"}
          </small>

        </div>

        ${
          isCurrentUser
            ? `<span>Current Account</span>`
            : controls
        }

      </div>
    `;

  }).join("");

}


/* =========================================================
   ACTIVATE / DEACTIVATE USER
   ========================================================= */

window.toggleUserActive = async function(
  userId,
  currentlyActive
) {

  if (!isStaff()) return;


  const { data: targetUser, error: findError } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();


  if (findError || !targetUser) {

    alert("Could not find that user.");

    return;
  }


  /*
    Teachers can only manage students.
    Administrators can manage everyone except themselves.
  */

  if (
    currentProfile.role === "teacher" &&
    targetUser.role !== "student"
  ) {

    alert(
      "Teachers can only manage student accounts."
    );

    return;
  }


  if (targetUser.id === currentUser.id) {

    alert(
      "You cannot deactivate your own account."
    );

    return;
  }


  const action =
    currentlyActive
      ? "deactivate"
      : "reactivate";


  if (
    !confirm(
      `Are you sure you want to ${action} this user?`
    )
  ) {
    return;
  }


  const { error } = await supabase
    .from("profiles")
    .update({
      active: !currentlyActive
    })
    .eq("id", userId);


  if (error) {

    alert(
      "Could not update user: " +
      error.message
    );

    return;
  }


  await loadUsers();

};


/* =========================================================
   CHANGE USER ROLE
   ========================================================= */

window.changeUserRole = async function(
  userId,
  currentRole
) {

  /*
    ONLY ADMINISTRATORS can change roles.
  */

  if (!isAdmin()) {

    alert(
      "Only administrators can change user roles."
    );

    return;
  }


  const { data: targetUser, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();


  if (error || !targetUser) {

    alert("Could not find that user.");

    return;
  }


  if (targetUser.id === currentUser.id) {

    alert(
      "You cannot change your own role."
    );

    return;
  }


  const newRole =
    prompt(
      "Enter the new role:\n\nstudent\nteacher\nadmin",
      currentRole
    );


  if (newRole === null) return;


  const role =
    newRole.trim().toLowerCase();


  if (
    role !== "student" &&
    role !== "teacher" &&
    role !== "admin"
  ) {

    alert(
      "Invalid role. Use student, teacher, or admin."
    );

    return;
  }


  /*
    Confirm especially when creating another admin.
  */

  if (role === "admin") {

    if (
      !confirm(
        "This will give this account Administrator access. Continue?"
      )
    ) {
      return;
    }

  }


  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({
        role: role
      })
      .eq("id", userId);


  if (updateError) {

    alert(
      "Could not change role: " +
      updateError.message
    );

    return;
  }


  await loadUsers();

};


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabase.auth.onAuthStateChange(
  async (event, session) => {

    if (event === "SIGNED_OUT") {

      currentUser = null;
      currentProfile = null;

      hide($("app"));
      show($("auth"));

      return;
    }


    if (
      event === "SIGNED_IN" &&
      session
    ) {

      currentUser = session.user;

    }

  }
);
