(function () {
  var MENU = 'main menu.html';
  var RUN_KEY = 'wcActiveRun';
  var ITEMS_KEY = 'wildcardItems';
  var STARTED_KEY = 'gameStarted';

  function clearGameRun() {
    sessionStorage.removeItem(ITEMS_KEY);
    sessionStorage.removeItem(STARTED_KEY);
    sessionStorage.removeItem('nextFirstTurn');
    sessionStorage.removeItem(RUN_KEY);
    localStorage.removeItem(ITEMS_KEY);
  }

  function startNewGame() {
    clearGameRun();
    sessionStorage.setItem(RUN_KEY, '1');
  }

  function endRunToMenu() {
    clearGameRun();
    location.replace(MENU);
  }

  function saveItems(bag) {
    sessionStorage.setItem(ITEMS_KEY, JSON.stringify(bag));
  }

  function loadItems() {
    try { return JSON.parse(sessionStorage.getItem(ITEMS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function isReload() {
    if (typeof performance.getNavigationType === 'function')
      return performance.getNavigationType() === 'reload';
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    return nav && nav.type === 'reload';
  }

  function installHistoryTrap() {
    var state = { wc: 'trap', t: Date.now() };
    history.replaceState(state, '', location.href);
    history.pushState(state, '', location.href);
    addEventListener('popstate', function () { endRunToMenu(); });
  }

  function boot(page) {
    if (page === 'menu') {
      history.replaceState({ wc: 'menu' }, '', location.href);
      return true;
    }
    if (isReload()) { endRunToMenu(); return false; }
    if (page === 'battle') {
      if (!sessionStorage.getItem(RUN_KEY)) { location.replace(MENU); return false; }
      installHistoryTrap();
      return true;
    }
    if (page === 'tutorial' || page === 'builddeck') {
      installHistoryTrap();
      return true;
    }
    return true;
  }

  addEventListener('pageshow', function (e) {
    var p = document.body && document.body.dataset.wcPage;
    if (!p || p === 'menu') return;
    if (e.persisted) endRunToMenu();
  });

  window.WildCardSession = {
    MENU: MENU,
    startNewGame: startNewGame,
    endRunToMenu: endRunToMenu,
    clearGameRun: clearGameRun,
    saveItems: saveItems,
    loadItems: loadItems,
    boot: boot
  };
})();
