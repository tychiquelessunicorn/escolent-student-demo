/**
 * Investor-demo enhancements — vanilla JS shared across Student .dc.html screens.
 * Loaded after support.js. Do not edit support.js (generated dc-runtime bundle).
 */
(function () {
  var STORAGE_KEY = "variablesOnBothSides";
  var STREAK_KEY = "demoStreak";
  var TASK_COMPLETE_KEY = "demoDailyTaskComplete";
  var OFFLINE_LABEL = "Offline - Saved Locally";
  var ONLINE_LABEL = "Synced";
  var ONLINE_DOT = "oklch(55% 0.14 150)";
  var ONLINE_LABEL_COLOR = "oklch(49% 0.018 55)";
  var OFFLINE_DOT = "oklch(52% 0.14 18)";

  var demoOffline = false;

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
      paintConnectivity();
    });
  }

  window.addEventListener("offline", function () {
    paintConnectivity();
  });

  window.addEventListener("online", function () {
    paintConnectivity();
  });

  function readStreak() {
    try {
      var n = parseInt(localStorage.getItem(STREAK_KEY), 10);
      return Number.isFinite(n) ? n : 4;
    } catch (e) {
      return 4;
    }
  }

  function writeStreak(n) {
    try {
      localStorage.setItem(STREAK_KEY, String(n));
    } catch (e) {}
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      paintConnectivity();
      bindConnectivityToggle();
    });
    new MutationObserver(paintConnectivity).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.EscolentDemo = {
    storageKey: STORAGE_KEY,
    isMastered: function () {
      try {
        return localStorage.getItem(STORAGE_KEY) === "mastered";
      } catch (e) {
        return false;
      }
    },
    markMastered: function () {
      try {
        localStorage.setItem(STORAGE_KEY, "mastered");
      } catch (e) {}
    },
    getStreak: function () {
      return readStreak();
    },
    incrementStreak: function () {
      writeStreak(readStreak() + 1);
    },
    isDailyTaskComplete: function () {
      try {
        return localStorage.getItem(TASK_COMPLETE_KEY) === "true";
      } catch (e) {
        return false;
      }
    },
    markDailyTaskComplete: function () {
      try {
        localStorage.setItem(TASK_COMPLETE_KEY, "true");
      } catch (e) {}
    },
    completeVictoryLoop: function () {
      this.markMastered();
      this.markDailyTaskComplete();
      this.incrementStreak();
    },
    isOffline: function () {
      return isEffectivelyOffline();
    },
    toggleOffline: function () {
      demoOffline = !demoOffline;
      paintConnectivity();
    },
  };
})();
