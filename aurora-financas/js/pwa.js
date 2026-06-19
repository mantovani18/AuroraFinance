/* =========================================================
   pwa.js
   Gerencia o ciclo de vida PWA:
   - Registro do Service Worker
   - Prompt nativo de instalação (Chrome/Android/Desktop)
   - Banner + dica manual de instalação no iOS/Safari
   ========================================================= */

const AuroraPWA = (() => {
  let deferredPrompt = null;

  function init() {
    registerServiceWorker();
    bindInstallFlow();
    detectStandalone();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("Falha ao registrar Service Worker:", err);
      });
    });
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isInStandaloneMode() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function detectStandalone() {
    if (isInStandaloneMode()) return; // já instalado, não mostra nada
  }

  function bindInstallFlow() {
    const banner = document.getElementById("install-banner");
    const btnInstall = document.getElementById("btn-install");
    const btnDismiss = document.getElementById("btn-dismiss-install");
    const settingsInstallBtn = document.getElementById("settings-install");

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isInStandaloneMode() && !wasInstallDismissed()) {
        banner.hidden = false;
      }
    });

    btnInstall.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        banner.hidden = true;
        if (outcome === "accepted") AuroraApp.toast("Aplicativo instalado! 🎉");
      } else if (isIOS()) {
        showIOSHint();
      }
    });

    btnDismiss.addEventListener("click", () => {
      banner.hidden = true;
      sessionStorage.setItem("aurora_install_dismissed", "1");
    });

    settingsInstallBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === "accepted") AuroraApp.toast("Aplicativo instalado! 🎉");
      } else if (isIOS()) {
        showIOSHint();
      } else {
        AuroraApp.toast("Use o menu do navegador e escolha 'Instalar aplicativo'.");
      }
    });

    window.addEventListener("appinstalled", () => {
      banner.hidden = true;
      AuroraApp.toast("Aurora instalado com sucesso!");
    });

    // No iOS o evento beforeinstallprompt não existe — mostramos a dica proativamente
    if (isIOS() && !isInStandaloneMode() && !wasInstallDismissed()) {
      setTimeout(() => {
        banner.hidden = false;
      }, 1500);
    }

    document.getElementById("btn-close-ios-hint").addEventListener("click", () => {
      document.getElementById("ios-hint-backdrop").hidden = true;
    });
  }

  function wasInstallDismissed() {
    return sessionStorage.getItem("aurora_install_dismissed") === "1";
  }

  function showIOSHint() {
    document.getElementById("ios-hint-backdrop").hidden = false;
  }

  return { init, isIOS, isInStandaloneMode };
})();
