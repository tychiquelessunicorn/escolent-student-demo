/**
 * Investor-demo enhancements — vanilla JS shared across Student .dc.html screens.
 * Loaded after support.js. Do not edit support.js (generated dc-runtime bundle).
 *
 * Demo-level only: persistence, offline toggle, LMS frame mode, offline badges.
 */
(function () {
  var COMPLETED_KEY = "variables_completed";
  var STREAK_KEY = "streak";
  var LEGACY_MASTERED_KEY = "variablesOnBothSides";
  var LEGACY_STREAK_KEY = "demoStreak";
  var OFFLINE_SESSION_KEY = "esc_demo_offline";
  var LMS_MODE_KEY = "esc_demo_lms_mode";
  var OFFLINE_LABEL = "Offline - Edge Saved";
  var ONLINE_LABEL = "Synced";
  var ONLINE_DOT = "oklch(55% 0.14 150)";
  var ONLINE_LABEL_COLOR = "oklch(49% 0.018 55)";
  var OFFLINE_DOT = "oklch(52% 0.14 18)";
  var DEFAULT_STREAK = 3;
  var COMPLETED_STREAK = 4;
  var TOTAL_DAILY_TASKS = 2;

  var demoOffline = false;
  var lmsMode = "standalone"; // standalone | classroom

  function readSessionOffline() {
    try {
      return sessionStorage.getItem(OFFLINE_SESSION_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function writeSessionOffline(value) {
    try {
      sessionStorage.setItem(OFFLINE_SESSION_KEY, value ? "true" : "false");
    } catch (e) {}
  }

  function readLmsMode() {
    try {
      var m = sessionStorage.getItem(LMS_MODE_KEY);
      return m === "classroom" ? "classroom" : "standalone";
    } catch (e) {
      return "standalone";
    }
  }

  function writeLmsMode(mode) {
    try {
      sessionStorage.setItem(LMS_MODE_KEY, mode);
    } catch (e) {}
  }

  function isCompletedRaw() {
    try {
      if (localStorage.getItem(COMPLETED_KEY) === "true") return true;
      if (localStorage.getItem(LEGACY_MASTERED_KEY) === "mastered") return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function isEffectivelyOffline() {
    return demoOffline || (typeof navigator !== "undefined" && !navigator.onLine);
  }

  function ensureDemoStyles() {
    if (document.getElementById("esc-demo-styles")) return;
    var style = document.createElement("style");
    style.id = "esc-demo-styles";
    style.textContent = [
      ".esc-lms-banner{position:sticky;top:0;z-index:200;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 16px;font-family:Geist,system-ui,sans-serif;font-size:12px;border-bottom:1px solid oklch(88% 0.014 55);background:oklch(99% 0.007 55);color:oklch(49% 0.018 55);}",
      ".esc-lms-banner.esc-lms-classroom{background:oklch(96% 0.02 145);border-bottom-color:oklch(78% 0.06 145);}",
      ".esc-lms-banner-left{display:flex;align-items:center;gap:10px;min-width:0;}",
      ".esc-lms-brand-pill{display:inline-flex;align-items:center;gap:6px;font-weight:600;letter-spacing:0.02em;}",
      ".esc-lms-brand-dot{width:8px;height:8px;border-radius:2px;background:oklch(48.8% 0.217 264.4);}",
      ".esc-lms-classroom .esc-lms-brand-dot{background:oklch(48% 0.12 145);}",
      ".esc-lms-toggle{display:inline-flex;align-items:center;gap:0;background:oklch(93% 0.010 55);border-radius:999px;padding:3px;}",
      ".esc-lms-toggle button{font-family:inherit;font-size:11px;font-weight:600;border:none;background:transparent;color:oklch(49% 0.018 55);padding:5px 10px;border-radius:999px;cursor:pointer;}",
      ".esc-lms-toggle button.esc-lms-active{background:oklch(99% 0.007 55);color:oklch(24% 0.014 55);box-shadow:0 1px 2px oklch(24% 0.014 55 / 0.08);}",
      ".esc-lms-frame{outline:2px solid transparent;transition:outline-color 200ms ease;}",
      "body.esc-lms-classroom-mode .esc-lms-frame{outline-color:oklch(70% 0.08 145 / 0.55);}",
      "body.esc-lms-classroom-mode{background:oklch(94% 0.015 145) !important;}",
      ".esc-offline-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:oklch(38% 0.08 150);background:oklch(95% 0.025 150);border:1px solid oklch(82% 0.05 150);padding:3px 8px;border-radius:999px;white-space:nowrap;}",
      ".esc-offline-badge::before{content:'\\2713';font-size:10px;}",
      ".esc-completed-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:oklch(38% 0.10 150);background:oklch(95% 0.03 150);padding:5px 10px;border-radius:999px;}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function ensureLmsBanner() {
    ensureDemoStyles();
    var existing = document.querySelector("[data-esc-lms-banner]");
    if (existing) {
      paintLmsBanner();
      return;
    }
    var bar = document.createElement("div");
    bar.className = "esc-lms-banner";
    bar.setAttribute("data-esc-lms-banner", "true");
    bar.innerHTML =
      '<div class="esc-lms-banner-left">' +
      '<span class="esc-lms-brand-pill"><span class="esc-lms-brand-dot" aria-hidden="true"></span>' +
      '<span data-esc-lms-label>Standalone Mode</span></span>' +
      '<span style="opacity:0.7;">Demo shell</span>' +
      "</div>" +
      '<div class="esc-lms-toggle" role="group" aria-label="LMS presentation mode">' +
      '<button type="button" data-esc-lms-set="standalone">Standalone</button>' +
      '<button type="button" data-esc-lms-set="classroom">Google Classroom</button>' +
      "</div>";
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add("esc-lms-frame");
    paintLmsBanner();
  }

  function paintLmsBanner() {
    var classroom = lmsMode === "classroom";
    document.body.classList.toggle("esc-lms-classroom-mode", classroom);
    var bar = document.querySelector("[data-esc-lms-banner]");
    if (bar) bar.classList.toggle("esc-lms-classroom", classroom);
    var label = document.querySelector("[data-esc-lms-label]");
    if (label) {
      label.textContent = classroom
        ? "Google Classroom Integration Mode"
        : "Standalone Mode";
    }
    document.querySelectorAll("[data-esc-lms-set]").forEach(function (btn) {
      var mode = btn.getAttribute("data-esc-lms-set");
      btn.classList.toggle("esc-lms-active", mode === lmsMode);
    });
  }

  function paintConnectivity() {
    var offline = isEffectivelyOffline();

    document.querySelectorAll("[data-esc-connectivity-label]").forEach(function (el) {
      el.textContent = offline
        ? OFFLINE_LABEL
        : el.getAttribute("data-esc-online-text") || ONLINE_LABEL;
      el.style.color = offline
        ? OFFLINE_DOT
        : el.getAttribute("data-esc-online-color") || ONLINE_LABEL_COLOR;
    });

    document.querySelectorAll("[data-esc-connectivity-dot]").forEach(function (el) {
      if (offline) {
        el.style.background = OFFLINE_DOT;
        el.style.border = "none";
        el.style.animation = "none";
      } else {
        el.style.background = ONLINE_DOT;
        el.style.border = el.getAttribute("data-esc-online-border") || "none";
        el.style.animation = el.getAttribute("data-esc-online-animation") || "none";
      }
    });
  }

  function bindDemoClicks() {
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-esc-connectivity-toggle]");
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        demoOffline = !demoOffline;
        writeSessionOffline(demoOffline);
        paintConnectivity();
        return;
      }
      var lmsBtn = e.target.closest("[data-esc-lms-set]");
      if (lmsBtn) {
        e.preventDefault();
        e.stopPropagation();
        lmsMode = lmsBtn.getAttribute("data-esc-lms-set") === "classroom"
          ? "classroom"
          : "standalone";
        writeLmsMode(lmsMode);
        paintLmsBanner();
      }
    });
  }

  function readStreak() {
    try {
      var n = parseInt(localStorage.getItem(STREAK_KEY), 10);
      if (Number.isFinite(n)) return n;
      n = parseInt(localStorage.getItem(LEGACY_STREAK_KEY), 10);
      if (Number.isFinite(n)) return n;
      return isCompletedRaw() ? COMPLETED_STREAK : DEFAULT_STREAK;
    } catch (e) {
      return DEFAULT_STREAK;
    }
  }

  function writeStreak(n) {
    try {
      localStorage.setItem(STREAK_KEY, String(n));
      localStorage.setItem(LEGACY_STREAK_KEY, String(n));
    } catch (e) {}
  }

  function completedDailyCount() {
    return isCompletedRaw() ? 1 : 0;
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      demoOffline = readSessionOffline();
      lmsMode = readLmsMode();
      ensureLmsBanner();
      paintConnectivity();
      bindDemoClicks();
    });
    new MutationObserver(function () {
      paintConnectivity();
      ensureLmsBanner();
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.addEventListener("offline", paintConnectivity);
  window.addEventListener("online", paintConnectivity);

  window.EscolentDemo = {
    completedKey: COMPLETED_KEY,
    streakKey: STREAK_KEY,
    totalDailyTasks: TOTAL_DAILY_TASKS,
    isVariablesCompleted: function () {
      return isCompletedRaw();
    },
    isMastered: function () {
      return this.isVariablesCompleted();
    },
    markVariablesCompleted: function () {
      try {
        localStorage.setItem(COMPLETED_KEY, "true");
        localStorage.setItem(LEGACY_MASTERED_KEY, "mastered");
      } catch (e) {}
    },
    markMastered: function () {
      this.markVariablesCompleted();
    },
    getStreak: function () {
      return readStreak();
    },
    setStreak: function (n) {
      writeStreak(n);
    },
    incrementStreak: function () {
      writeStreak(readStreak() + 1);
    },
    isDailyTaskComplete: function () {
      return this.isVariablesCompleted();
    },
    markDailyTaskComplete: function () {
      this.markVariablesCompleted();
    },
    getCompletedDailyCount: function () {
      return completedDailyCount();
    },
    getDailyProgressLabel: function () {
      return completedDailyCount() + " of " + TOTAL_DAILY_TASKS + " completed today";
    },
    completeVictoryLoop: function () {
      this.markVariablesCompleted();
      writeStreak(COMPLETED_STREAK);
    },
    isOffline: function () {
      return isEffectivelyOffline();
    },
    toggleOffline: function () {
      demoOffline = !demoOffline;
      writeSessionOffline(demoOffline);
      paintConnectivity();
    },
    getLmsMode: function () {
      return lmsMode;
    },
    setLmsMode: function (mode) {
      lmsMode = mode === "classroom" ? "classroom" : "standalone";
      writeLmsMode(lmsMode);
      paintLmsBanner();
    },
    HINT_CHAIN: [
      "Not quite — start by collecting the x terms. What happens if you subtract 2x from both sides?\n\nUpdate your answer and submit again.",
      "Mini-step: simplify 5x − 2x = ?  (That should give you 3x. Then finish 3x + 3 = 18.)\n\nUpdate your answer and submit again.",
      "Worked path:\n1. 5x − 2x = 3x → 3x + 3 = 18\n2. 3x = 15\n3. x = 5\n\nUpdate your answer and submit again.",
    ],
  };
})();
