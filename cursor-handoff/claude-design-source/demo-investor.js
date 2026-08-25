/**
 * Investor-demo enhancements — vanilla JS shared across Student .dc.html screens.
 * Loaded after support.js. Do not edit support.js (generated dc-runtime bundle).
 */
(function () {
  var STORAGE_KEY = "variablesOnBothSides";
  var OFFLINE_LABEL = "Offline - Saving to Edge";
  var OFFLINE_DOT = "oklch(52% 0.14 18)";

  var offline = typeof navigator !== "undefined" ? !navigator.onLine : false;

  function paintConnectivity() {
    document.querySelectorAll("[data-esc-connectivity-label]").forEach(function (el) {
      var onlineText = el.getAttribute("data-esc-online-text") || "Synced";
      el.textContent = offline ? OFFLINE_LABEL : onlineText;
      el.style.color = offline ? OFFLINE_DOT : el.getAttribute("data-esc-online-color") || "";
    });

    document.querySelectorAll("[data-esc-connectivity-dot]").forEach(function (el) {
      if (offline) {
        el.style.background = OFFLINE_DOT;
        el.style.border = "none";
        el.style.animation = "none";
      } else {
        el.style.background = el.getAttribute("data-esc-online-bg") || "oklch(64% 0.016 55)";
        el.style.border = el.getAttribute("data-esc-online-border") || "";
        el.style.animation = el.getAttribute("data-esc-online-animation") || "";
      }
    });
  }

  window.addEventListener("offline", function () {
    offline = true;
    paintConnectivity();
  });

  window.addEventListener("online", function () {
    offline = false;
    paintConnectivity();
  });

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", paintConnectivity);
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
  };
})();
