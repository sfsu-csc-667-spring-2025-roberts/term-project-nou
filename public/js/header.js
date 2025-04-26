const themeToggle = document.getElementById("themeToggle");

// Check local storage for theme preference
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-theme");
  themeToggle.checked = true;
}

themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("light-theme");
  const isLightTheme = document.body.classList.contains("light-theme");
  localStorage.setItem("theme", isLightTheme ? "light" : "dark");
});
