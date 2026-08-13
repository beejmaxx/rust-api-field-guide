(function () {
  "use strict";

  var marker = "/rust-api-field-guide/";
  var editions = [
    { id: "classic", label: "Classic edition" },
    { id: "problem-first", label: "Problem-first" },
    { id: "example-led", label: "Example-led" },
    { id: "workshop", label: "Workshop" }
  ];

  function locationParts() {
    var pathname = window.location.pathname;
    var markerAt = pathname.indexOf(marker);
    var base = markerAt >= 0 ? pathname.slice(0, markerAt + marker.length) : "/";
    var rest = markerAt >= 0 ? pathname.slice(markerAt + marker.length) : pathname.replace(/^\//, "");
    var match = rest.match(/^editions\/(problem-first|example-led|workshop)\/(.*)$/);

    return {
      base: base,
      edition: match ? match[1] : "classic",
      page: (match ? match[2] : rest) || "index.html"
    };
  }

  function destination(parts, edition) {
    var fallbackPages = ["experiments/pretest.html", "experiments/final-challenge.html", "experiments/rubric.html", "experiments/recall.html"];

    if (edition === "classic") {
      if (fallbackPages.indexOf(parts.page) !== -1) {
        return parts.base + "index.html";
      }
      return parts.base + parts.page;
    }
    return parts.base + "editions/" + edition + "/" + parts.page;
  }

  function install() {
    var toolbar = document.querySelector("#mdbook-menu-bar .right-buttons");
    if (!toolbar || toolbar.querySelector(".edition-switcher")) return;

    var parts = locationParts();
    var label = document.createElement("label");
    label.className = "edition-switcher";
    label.title = "Switch book edition";

    var select = document.createElement("select");
    select.setAttribute("aria-label", "Book edition");

    editions.forEach(function (edition) {
      var option = document.createElement("option");
      option.value = edition.id;
      option.textContent = edition.label;
      option.selected = edition.id === parts.edition;
      select.appendChild(option);
    });

    select.addEventListener("change", function () {
      var target = destination(parts, select.value);
      window.location.assign(target + window.location.search + window.location.hash);
    });

    label.appendChild(select);
    toolbar.insertBefore(label, toolbar.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
