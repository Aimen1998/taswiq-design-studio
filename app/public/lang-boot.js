// Runs before the first paint (blocking, same-origin): apply a language the visitor chose before, so the page
// never flips direction after it is shown. Arabic is the default; nothing is guessed from the browser.
(function () {
  try {
    var l = localStorage.getItem("design-studio:lang");
    if (l === "fr" || l === "en") { document.documentElement.lang = l; document.documentElement.dir = "ltr"; }
  } catch (e) {}
})();
