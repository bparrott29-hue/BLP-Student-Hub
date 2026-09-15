(function () {
  "use strict";

const SUPABASE_URL = "https://wukwyjtbxqpthbwqhsmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4SZZm0RQZ48mYYPdEUacyQ_hLZu5FNt";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  let mode = "login";
  let role = "student";
  let currentUser = null;
  let currentProfile = null;

  function $(id) {
    return document.getElementById(id);
  }

  function msg(text) {
    $("authMessage").textContent = text;
  }

  function setRole(newRole) {
    role = newRole;

    $("studentMode").classList.toggle("active", role === "student");
    $("teacherMode").classList.toggle("active", role === "teacher");

    $("authSubmit").textContent =
      (mode === "signup" ? "Create Account as " : "Login as ") +
      (role === "teacher" ? "Teacher" : "Student");
  }

  function setMode(newMode) {
    mode = newMode;

    $("loginTab").classList.toggle("active", mode === "login");
    $("signupTab").classList.toggle("active", mode === "signup");

    setRole(role);
    msg("");
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c];
    });
  }

  $("studentMode").onclick = function () {
    setRole("student");
  };

  $("teacherMode").onclick = function () {
    setRole("teacher");
  };

  $("loginTab").onclick = function () {
    setMode("login");
  };

  $("signupTab").onclick = function () {
    setMode("signup");
  };

  $("authForm").onsubmit = async function (e) {
    e.preventDefault();

    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    if (password.length < 6) {
      msg("Password must be at least 6 characters.");
      return;
    }

    msg("Please wait...");

    if (mode === "signup") {
      /*
        New accounts are automatically students.
        Teacher accounts are created by an administrator
        by changing the profile role in Supabase.
      */

      if (role === "teacher") {
        msg("Teacher accounts must be created by an administrator.");
        return;
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: email.split("@")[0]
          }
        }
      });

      if (error) {
        msg(error.message);
        return;
      }

      if (!data.session) {
        msg("Account created! Check your email to confirm your account, then log in.");
        setMode("login");
        return;
      }

      await loadUser(data.user);
    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

      if (error) {
        msg(error.message);
        return;
      }

      await loadUser(data.user);
    }
  };

  async function loadUser(user) {
    if (!user) {
      msg("Unable to find your account.");
      return;
    }

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      msg("Your profile could not be loaded.");
      await supabaseClient.auth.signOut();
      return;
    }

    if (!profile.active) {
      msg("This account has been deactivated.");
      await supabaseClient.auth.signOut();
      return;
    }

    currentUser = user;
    currentProfile = profile;
    role = profile.role;

    showApp();
  }

  function showApp() {
    $("auth").classList.add("hidden");
    $("app").classList.remove("hidden");

    $("who").textContent =
      currentProfile.username || currentUser.email;

    $("roleBadge").textContent =
      role === "teacher" ? "TEACHER" : "STUDENT";

    $("teacherDashboard").classList.toggle(
      "hidden",
      role !== "teacher"
    );

    $("teacherControls").classList.toggle(
      "hidden",
      role !== "teacher"
    );

    $("welcome").textContent =
      role === "teacher"
        ? "Teacher Dashboard"
        : "Student Dashboard";

    $("welcomeText").textContent =
      role === "teacher"
        ? "Manage announcements, links, and users."
        : "View school announcements and useful links.";

    render();
  }

  $("logout").onclick = async function () {
    await supabaseClient.auth.signOut();

    currentUser = null;
    currentProfile = null;

    $("app").classList.add("hidden");
    $("auth").classList.remove("hidden");

    $("email").value = "";
    $("password").value = "";

    setMode("login");
  };

  $("postAnnouncement").onclick = async function () {
    if (role !== "teacher") return;

    const title = $("announcementTitle").value.trim();
    const text = $("announcementText").value.trim();

    if (!title || !text) {
      alert("Please enter an announcement title and message.");
      return;
    }

    const { error } = await supabaseClient
      .from("announcements")
      .insert({
        title: title,
        content: text,
        created_by: currentUser.id
      });

    if (error) {
      alert("Could not post announcement: " + error.message);
      return;
    }

    $("announcementTitle").value = "";
    $("announcementText").value = "";

    await render();
  };

  $("postLink").onclick = async function () {
    if (role !== "teacher") return;

    const title = $("linkTitle").value.trim();
    let url = $("linkUrl").value.trim();

    if (!title || !url) {
      alert("Please enter a link name and URL.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    const { error } = await supabaseClient
      .from("links")
      .insert({
        title: title,
        url: url,
        created_by: currentUser.id
      });

    if (error) {
      alert("Could not post link: " + error.message);
      return;
    }

    $("linkTitle").value = "";
    $("linkUrl").value = "";

    await render();
  };

  window.deactivateUser = async function (userId) {
    if (role !== "teacher") return;

    if (userId === currentUser.id) {
      alert("You cannot deactivate your own teacher account.");
      return;
    }

    const confirmed = confirm(
      "Deactivate this student account?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
      .from("profiles")
      .update({ active: false })
      .eq("id", userId);

    if (error) {
      alert("Could not deactivate user: " + error.message);
      return;
    }

    await render();
  };

  async function render() {
    await renderAnnouncements();
    await renderLinks();

    if (role === "teacher") {
      await renderUsers();
    }
  }

  async function renderAnnouncements() {
    const { data, error } = await supabaseClient
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const announcements = data || [];

    $("announcementCount").textContent = announcements.length;
    $("teacherAnnouncementCount").textContent = announcements.length;

    if (announcements.length === 0) {
      $("announcementList").innerHTML =
        '<p class="muted">No announcements have been posted.</p>';
      return;
    }

    $("announcementList").innerHTML =
      announcements
        .map(function (a) {
          const date = new Date(a.created_at).toLocaleString();

          return `
            <div class="announcement">
              <h4>${escapeHTML(a.title)}</h4>
              <p>${escapeHTML(a.content)}</p>
              <div class="date">${escapeHTML(date)}</div>
            </div>
          `;
        })
        .join("");
  }

  async function renderLinks() {
    const { data, error } = await supabaseClient
      .from("links")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const links = data || [];

    $("linkCount").textContent = links.length;
    $("teacherLinkCount").textContent = links.length;

    if (links.length === 0) {
      $("linkList").innerHTML =
        '<p class="muted">No school links have been posted.</p>';
      return;
    }

    $("linkList").innerHTML =
      links
        .map(function (link) {
          return `
            <div class="link">
              <h4>${escapeHTML(link.title)}</h4>
              <a
                href="${escapeHTML(link.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHTML(link.url)}
              </a>
            </div>
          `;
        })
        .join("");
  }

  async function renderUsers() {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, username, role, active")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const users = data || [];

    $("userCount").textContent = users.length;

    if (users.length === 0) {
      $("userList").innerHTML =
        '<p class="muted">No users.</p>';
      return;
    }

    $("userList").innerHTML = users
      .map(function (user) {
        const isCurrentUser = user.id === currentUser.id;

        return `
          <div class="person">
            <span>
              <b>${escapeHTML(user.username)}</b>
              — ${escapeHTML(user.role)}
            </span>

            ${
              isCurrentUser
                ? '<span class="muted">You</span>'
                : user.role === "student"
                ? `<button
                     class="kick"
                     type="button"
                     onclick="deactivateUser('${user.id}')"
                   >
                     Kick
                   </button>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  /*
    Restore an existing Supabase login when the page is refreshed.
  */
  supabaseClient.auth.getSession().then(async function (result) {
    const session = result.data.session;

    if (session && session.user) {
      await loadUser(session.user);
    } else {
      setMode("login");
    }
  });

  /*
    Watch for login/logout changes.
  */
  supabaseClient.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      currentProfile = null;
    }
  });

  setMode("login");
})();
