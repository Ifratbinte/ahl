(function () {
  "use strict";

  var slots = Array.prototype.slice.call(
    document.querySelectorAll("[data-include]"),
  );

  Promise.all(
    slots.map(function (slot) {
      var sectionPath = slot.getAttribute("data-include");

      return fetch(sectionPath).then(function (response) {
        if (!response.ok) {
          throw new Error("Could not load " + sectionPath);
        }

        return response.text();
      });
    }),
  )
    .then(function (sections) {
      slots.forEach(function (slot, index) {
        slot.outerHTML = sections[index];
      });

      var mainScript = document.createElement("script");
      mainScript.src = "assets/js/main.js";
      document.body.appendChild(mainScript);
    })
    .catch(function (error) {
      console.error("Unable to load page sections.", error);
      slots.forEach(function (slot) {
        slot.textContent = "Page content could not be loaded. Please refresh.";
        slot.setAttribute("role", "alert");
      });
    });
})();
