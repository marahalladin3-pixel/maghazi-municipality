function showDetails() {
  document.getElementById("hidden").classList.remove("hidden");
  document.body.style.overflow = "hidden"; // يمنع التمرير
}

function hideDetails() {
  document.getElementById("hidden").classList.add("hidden");
  document.body.style.overflow = "auto"; // يرجع التمرير
}
