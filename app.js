// ============================================================
// BLP STUDENT HUB - SUPABASE APP.JS
// ============================================================

// ---------- SUPABASE CONNECTION ----------
const SUPABASE_URL = "https://wukwyjtbxqpthbwqhsmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4SZZm0RQZ48mYYPdEUacyQ_hLZu5FNt";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ============================================================
// HELPERS
// ============================================================

const $ = (id) => document.getElementById(id);

function show(element) {
  if (element) element.style.display = "";
}

function hide(element) {
  if (element) element.style.display = "none";
}

function setText(id, text) {
  const element = $(id);
  if (element) element.textContent = text;
}

function setMessage(message, error = false) {
  const element = $("authMessage");

  if (!element) return;

  element.textContent = message || "";
  element.style.color = error ? "#dc2626" : "";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// APP STATE
// ============================================================

let currentUser = null;
let currentProfile = null;

let authMode = "login";
let selectedMode = "student";


// ============================================================
// AUTH BUTTONS
// ============================================================

function setupAuthButtons() {

  // LOGIN BUTTON
  $("loginTab")?.addEventListener("click", () => {

    authMode = "login";

    $("loginTab").className = "primary";
    $("signupTab").className = "secondary";
    $("adminLoginTab")?.classList.remove("primary");

    if ($("adminLoginTab")) {
      $("adminLoginTab").className = "secondary";
    }

    show($("studentMode"));
    show($("teacherMode"));

    if ($("authSubmit")) {
      $("authSubmit").textContent = "Login";
    }

    setMessage("");
  });


  // CREATE ACCOUNT BUTTON
  $("signupTab")?.addEventListener("click", () => {

    authMode = "signup";
    selectedMode = "student";

    $("signupTab").className = "primary";
    $("loginTab").className = "secondary";

    if ($("adminLoginTab")) {
      $("adminLoginTab").className = "secondary";
    }

    show($("studentMode"));
    show($("teacherMode"));

    if ($("authSubmit")) {
      $("authSubmit").textContent = "Create Account";
    }

    setMessage("");
  });


  // ADMINISTRATOR LOGIN BUTTON
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


  // STUDENT MODE
  $("studentMode")?.addEventListener("click", () => {

    selectedMode = "student";

    $("studentMode").className = "primary";
    $("teacherMode").className = "secondary";
  });


  // TEACHER MODE
  $("teacherMode")?.addEventListener("click", () => {

    selectedMode = "teacher";

    $("teacherMode").className = "primary";
    $("studentMode").className = "secondary";
  });
}


// ============================================================
// AUTH FORM
// ============================================================

function setupAuthForm() {

  $("authForm")?.addEventListener("submit", async (event) => {

    event.preventDefault();

    setMessage("Please wait...");

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      setMessage("Please enter your email and password.", true);
      return;
    }


    // --------------------------------------------------------
    // CREATE STUDENT / TEACHER ACCOUNT
    // --------------------------------------------------------

    if (authMode === "signup") {

      const username =
        $("username")?.value.trim() ||
        email.split("@")[0];

      if (!username) {
        setMessage("Please enter a username.", true);
        return;
      }

      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        });

      if (error) {
        setMessage(error.message, true);
        return;
      }

      if (!data.user) {
        setMessage("Account could not be created.", true);
        return;
      }

      setMessage(
        "Account created! Check your email if confirmation is required."
      );

      return;
    }


    // --------------------------------------------------------
    // LOGIN
    // --------------------------------------------------------

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      setMessage(error.message, true);
      return;
    }

    currentUser = data.user;

    await loadCurrentProfile();


    // --------------------------------------------------------
    // ADMINISTRATOR LOGIN CHECK
    // --------------------------------------------------------

    if (authMode === "admin-login") {

      if (
        !currentProfile ||
        currentProfile.role !== "admin" ||
        currentProfile.active !== true
      ) {

        await supabase.auth.signOut();

        currentUser = null;
        currentProfile = null;

        setMessage(
          "Administrator access denied. This account is not an administrator.",
          true
        );

        return;
      }
    }


    // --------------------------------------------------------
    // TEACHER LOGIN CHECK
    // --------------------------------------------------------

    if (
      authMode === "login" &&
      selectedMode === "teacher"
    ) {

      if (
        !currentProfile ||
        currentProfile.role !== "teacher"
      ) {

        await supabase.auth.signOut();

        currentUser = null;
        currentProfile = null;

        setMessage(
          "This account is not a teacher account.",
          true
        );

        return;
      }
    }


    // --------------------------------------------------------
    // STUDENT LOGIN CHECK
    // --------------------------------------------------------

    if (
      authMode === "login" &&
      selectedMode === "student"
    ) {

      if (
        !currentProfile ||
        currentProfile.role !== "student"
      ) {

        await supabase.auth.signOut();

        currentUser = null;
        currentProfile = null;

        setMessage(
          "This account is not a student account.",
          true
        );

        return;
      }
    }


    await showApp();
  });
}


// ============================================================
// LOAD PROFILE
// ============================================================

async function loadCurrentProfile() {

  if (!currentUser) return null;

  const { data, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

  if (error) {

    console.error("Profile error:", error);

    currentProfile = null;

    return null;
  }

  currentProfile = data;

  return data;
}


// ============================================================
// SHOW APP
// ============================================================

async function showApp() {

  hide($("auth"));

  hide($("loginPage"));

  hide($("authPage"));

  show($("app"));

  const username =
    currentProfile?.username ||
    currentUser?.email ||
    "User";

  setText("who", username);

  setText(
    "welcome",
    `Welcome, ${username}!`
  );

  setText(
    "welcomeText",
    `You are logged in as ${currentProfile?.role || "student"}.`
  );

  setText(
    "roleBadge",
    (currentProfile?.role || "student").toUpperCase()
  );


  // STUDENT
  if (currentProfile?.role === "student") {

    hide($("teacherDashboard"));
    hide($("teacherControls"));
    hide($("adminDashboard"));
    hide($("adminControls"));
  }


  // TEACHER
  if (currentProfile?.role === "teacher") {

    show($("teacherDashboard"));
    show($("teacherControls"));

    hide($("adminDashboard"));
    hide($("adminControls"));
  }


  // ADMIN
  if (currentProfile?.role === "admin") {

    show($("teacherDashboard"));
    show($("teacherControls"));

    show($("adminDashboard"));
    show($("adminControls"));
  }


  await loadAnnouncements();
  await loadLinks();


  if (
    currentProfile?.role === "teacher" ||
    currentProfile?.role === "admin"
  ) {
    await loadUsers();
  }
}


// ============================================================
// LOGOUT
// ============================================================

function setupLogout() {

  $("logout")?.addEventListener("click", async () => {

    await supabase.auth.signOut();

    currentUser = null;
    currentProfile = null;

    show($("auth"));
    show($("loginPage"));
    show($("authPage"));

    hide($("app"));

    setMessage("You have been logged out.");
  });
}


// ============================================================
// ANNOUNCEMENTS
// ============================================================

async function loadAnnouncements() {

  const { data, error } =
    await supabase
      .from("announcements")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    return;
  }

  const list = $("announcementList");

  if (!list) return;

  list.innerHTML = "";

  if (!data || data.length === 0) {

    list.innerHTML =
      "<p>No announcements yet.</p>";

  } else {

    data.forEach((announcement) => {

      const item =
        document.createElement("div");

      item.className = "announcement";

      item.innerHTML = `
        <h3>${escapeHTML(announcement.title)}</h3>
        <p>${escapeHTML(announcement.content || announcement.text || "")}</p>
      `;

      list.appendChild(item);
    });
  }


  setText(
    "announcementCount",
    data?.length || 0
  );

  setText(
    "teacherAnnouncementCount",
    data?.length || 0
  );
}


// ============================================================
// POST ANNOUNCEMENT
// ============================================================

function setupAnnouncementForm() {

  $("postAnnouncement")?.addEventListener(
    "click",
    async () => {

      if (
        !currentProfile ||
        !["teacher", "admin"].includes(
          currentProfile.role
        )
      ) {
        return;
      }

      const title =
        $("announcementTitle")?.value.trim();

      const content =
        $("announcementText")?.value.trim();

      if (!title || !content) {

        alert(
          "Please enter an announcement title and message."
        );

        return;
      }


      const { error } =
        await supabase
          .from("announcements")
          .insert({
            title: title,
            content: content,
            created_by: currentUser.id
          });


      if (error) {

        console.error(error);

        alert(error.message);

        return;
      }


      if ($("announcementTitle")) {
        $("announcementTitle").value = "";
      }

      if ($("announcementText")) {
        $("announcementText").value = "";
      }

      await loadAnnouncements();
    }
  );
}


// ============================================================
// LINKS
// ============================================================

async function loadLinks() {

  const { data, error } =
    await supabase
      .from("links")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    return;
  }

  const list = $("linkList");

  if (!list) return;

  list.innerHTML = "";


  if (!data || data.length === 0) {

    list.innerHTML =
      "<p>No links posted yet.</p>";

  } else {

    data.forEach((link) => {

      const item =
        document.createElement("div");

      item.className = "link-item";

      const safeURL = escapeHTML(link.url);

      item.innerHTML = `
        <a
          href="${safeURL}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHTML(link.title)}
        </a>
      `;

      list.appendChild(item);
    });
  }


  setText(
    "linkCount",
    data?.length || 0
  );

  setText(
    "teacherLinkCount",
    data?.length || 0
  );
}


// ============================================================
// POST LINK
// ============================================================

function setupLinkForm() {

  $("postLink")?.addEventListener(
    "click",
    async () => {

      if (
        !currentProfile ||
        !["teacher", "admin"].includes(
          currentProfile.role
        )
      ) {
        return;
      }

      const title =
        $("linkTitle")?.value.trim();

      const url =
        $("linkUrl")?.value.trim();


      if (!title || !url) {

        alert(
          "Please enter a link title and URL."
        );

        return;
      }


      let finalURL = url;

      if (
        !finalURL.startsWith("http://") &&
        !finalURL.startsWith("https://")
      ) {
        finalURL = "https://" + finalURL;
      }


      const { error } =
        await supabase
          .from("links")
          .insert({
            title: title,
            url: finalURL,
            created_by: currentUser.id
          });


      if (error) {

        console.error(error);

        alert(error.message);

        return;
      }


      if ($("linkTitle")) {
        $("linkTitle").value = "";
      }

      if ($("linkUrl")) {
        $("linkUrl").value = "";
      }

      await loadLinks();
    }
  );
}


// ============================================================
// USERS
// ============================================================

async function loadUsers() {

  if (
    !currentProfile ||
    !["teacher", "admin"].includes(
      currentProfile.role
    )
  ) {
    return;
  }


  const { data, error } =
    await supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: true
      });


  if (error) {

    console.error("Users error:", error);

    return;
  }


  setText(
    "userCount",
    data?.length || 0
  );


  const list = $("userList");

  if (!list) return;

  list.innerHTML = "";


  if (!data || data.length === 0) {

    list.innerHTML =
      "<p>No users found.</p>";

    return;
  }


  data.forEach((profile) => {

    const item =
      document.createElement("div");

    item.className = "user-item";


    const username =
      escapeHTML(
        profile.username || "Unnamed User"
      );

    const role =
      escapeHTML(profile.role);

    const status =
      profile.active
        ? "Active"
        : "Inactive";


    item.innerHTML = `
      <div>
        <strong>${username}</strong>
        <span>${role}</span>
        <small>${status}</small>
      </div>
    `;


    // --------------------------------------------------------
    // TEACHER: DEACTIVATE STUDENTS
    // --------------------------------------------------------

    if (
      currentProfile.role === "teacher" &&
      profile.role === "student" &&
      profile.active
    ) {

      const button =
        document.createElement("button");

      button.textContent = "Kick";

      button.className = "secondary";

      button.addEventListener(
        "click",
        () => deactivateStudent(profile.id)
      );

      item.appendChild(button);
    }


    // --------------------------------------------------------
    // ADMIN: ROLE MANAGEMENT
    // --------------------------------------------------------

    if (
      currentProfile.role === "admin" &&
      profile.id !== currentUser.id
    ) {

      const select =
        document.createElement("select");

      ["student", "teacher", "admin"]
        .forEach((roleOption) => {

          const option =
            document.createElement("option");

          option.value = roleOption;
          option.textContent =
            roleOption.charAt(0).toUpperCase() +
            roleOption.slice(1);

          if (profile.role === roleOption) {
            option.selected = true;
          }

          select.appendChild(option);
        });


      select.addEventListener(
        "change",
        async () => {

          await changeUserRole(
            profile.id,
            select.value
          );
        }
      );


      item.appendChild(select);


      const activeButton =
        document.createElement("button");

      activeButton.textContent =
        profile.active
          ? "Deactivate"
          : "Activate";

      activeButton.className = "secondary";

      activeButton.addEventListener(
        "click",
        async () => {

          await changeUserStatus(
            profile.id,
            !profile.active
          );
        }
      );

      item.appendChild(activeButton);
    }


    list.appendChild(item);
  });
}


// ============================================================
// DEACTIVATE STUDENT
// ============================================================

async function deactivateStudent(userId) {

  if (
    !currentProfile ||
    !["teacher", "admin"].includes(
      currentProfile.role
    )
  ) {
    return;
  }


  const confirmed =
    confirm(
      "Are you sure you want to deactivate this student?"
    );

  if (!confirmed) return;


  const { error } =
    await supabase
      .from("profiles")
      .update({
        active: false
      })
      .eq("id", userId)
      .eq("role", "student");


  if (error) {

    alert(error.message);

    console.error(error);

    return;
  }


  await loadUsers();
}


// ============================================================
// ADMIN: CHANGE USER ROLE
// ============================================================

async function changeUserRole(
  userId,
  newRole
) {

  if (
    !currentProfile ||
    currentProfile.role !== "admin"
  ) {
    return;
  }


  if (
    !["student", "teacher", "admin"]
      .includes(newRole)
  ) {
    return;
  }


  const { error } =
    await supabase
      .from("profiles")
      .update({
        role: newRole
      })
      .eq("id", userId);


  if (error) {

    alert(error.message);

    console.error(error);

    return;
  }


  await loadUsers();
}


// ============================================================
// ADMIN: ACTIVATE / DEACTIVATE USER
// ============================================================

async function changeUserStatus(
  userId,
  active
) {

  if (
    !currentProfile ||
    currentProfile.role !== "admin"
  ) {
    return;
  }


  const { error } =
    await supabase
      .from("profiles")
      .update({
        active: active
      })
      .eq("id", userId);


  if (error) {

    alert(error.message);

    console.error(error);

    return;
  }


  await loadUsers();
}


// ============================================================
// SUPABASE SESSION
// ============================================================

async function checkExistingSession() {

  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();


  if (!session) {

    show($("auth"));
    show($("loginPage"));
    show($("authPage"));

    hide($("app"));

    return;
  }


  currentUser = session.user;

  await loadCurrentProfile();


  if (
    !currentProfile ||
    currentProfile.active !== true
  ) {

    await supabase.auth.signOut();

    currentUser = null;
    currentProfile = null;

    show($("auth"));

    hide($("app"));

    setMessage(
      "This account is inactive.",
      true
    );

    return;
  }


  await showApp();
}


// ============================================================
// AUTH STATE LISTENER
// ============================================================

function setupAuthListener() {

  supabase.auth.onAuthStateChange(
    async (event, session) => {

      if (event === "SIGNED_OUT") {

        currentUser = null;
        currentProfile = null;

        show($("auth"));
        hide($("app"));

        return;
      }


      if (
        session &&
        event === "SIGNED_IN"
      ) {

        currentUser = session.user;

        await loadCurrentProfile();

        if (currentProfile) {
          await showApp();
        }
      }
    }
  );
}


// ============================================================
// START APPLICATION
// ============================================================

async function startApp() {

  console.log("BLP Student Hub starting...");


  // Set up buttons FIRST
  setupAuthButtons();

  setupAuthForm();

  setupLogout();

  setupAnnouncementForm();

  setupLinkForm();

  setupAuthListener();


  // Check for existing login
  await checkExistingSession();


  console.log("BLP Student Hub loaded.");
}


// ============================================================
// RUN
// ============================================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();
}
