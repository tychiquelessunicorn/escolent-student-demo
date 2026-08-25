/**
 * Investor-demo enhancements — vanilla JS shared across Student .dc.html screens.
 * Loaded after support.js. Do not edit support.js (generated dc-runtime bundle).
 */
(function () {
  var COMPLETED_KEY = "variables_completed";
  var STREAK_KEY = "streak";
  var LEGACY_MASTERED_KEY = "variablesOnBothSides";
  var LEGACY_STREAK_KEY = "demoStreak";
  var OFFLINE_SESSION_KEY = "esc_demo_offline";
  var OFFLINE_LABEL = "Offline - Edge Saved";
  var ONLINE_LABEL = "Synced";
  var ONLINE_DOT = "oklch(55% 0.14 150)";
  var ONLINE_LABEL_COLOR = "oklch(49% 0.018 55)";
  var OFFLINE_DOT = "oklch(52% 0.14 18)";
  var DEFAULT_STREAK = 3;
  var COMPLETED_STREAK = 4;

  var demoOffline = false;

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

  function paintConnectivity() {
    var offline = isEffectivelyOffline();

    document.querySelectorAll("[data-esc-connectivity-label]").forEach(function (el) {
      el.textContent = offline ? OFFLINE_LABEL : el.getAttribute("data-esc-online-text") || ONLINE_LABEL;
      el.style.color = offline ? OFFLINE_DOT : el.getAttribute("data-esc-online-color") || ONLINE_LABEL_COLOR;
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

  function bindConnectivityToggle() {
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-esc-connectivity-toggle]");
      if (!toggle) return;
      e.preventDefault();
      e.stopPropagation();
      demoOffline = !demoOffline;
      writeSessionOffline(demoOffline);
      paintConnectivity();
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

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      demoOffline = readSessionOffline();
      paintConnectivity();
      bindConnectivityToggle();
    });
    new MutationObserver(paintConnectivity).observe(document.documentElement, {
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
  };
})();
