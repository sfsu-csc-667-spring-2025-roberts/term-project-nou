document.body.addEventListener("click", () => {
  const section1 = document.getElementById("section1");
  const section2 = document.getElementById("section2");

  if (section1.classList.contains("active")) {
    section1.classList.remove("active");
    section2.classList.add("active");
  }
});

document
  .getElementById("login-form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById("username").value;
    const avatar = document.getElementById("avatar").files[0];

    if (username) {
      localStorage.setItem("username", username);

      if (avatar) {
        const reader = new FileReader();
        reader.onload = function (e) {
          localStorage.setItem("avatar", e.target.result);
          window.location.href = "lobby.html"; // Replace with your target page
        };
        reader.readAsDataURL(avatar);
      } else {
        window.location.href = "lobby.html"; // Replace with your target page
      }
    } else {
      alert("Please enter a username.");
    }
  });

document
  .getElementById("default-login-btn")
  .addEventListener("click", function () {
    localStorage.setItem("username", "default");
    window.location.href = "lobby.html"; // Replace with your target page
  });
