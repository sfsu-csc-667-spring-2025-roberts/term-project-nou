document.addEventListener("DOMContentLoaded", function () {
  const createGameButton = document.getElementById("create-game-button");
  const createGameContainer = document.getElementById("create-game-container");
  const closeCreateGameForm = document.getElementById("close-create-game-form");
  const cancelCreateRoom = document.getElementById("cancelCreateRoom");
  const createRoomForm = document.getElementById("createRoomForm");
  const isPrivateRadios = document.querySelectorAll('input[name="isPrivate"]');
  const passwordGroup = document.querySelector(".password-group");
  const passwordInput = document.getElementById("password");

  // Show create room form
  createGameButton?.addEventListener("click", () => {
    createGameContainer.style.display = "flex";
  });

  // Close create room form
  function closeForm() {
    createGameContainer.style.display = "none";
    createRoomForm.reset();
    passwordGroup.style.display = "none";
  }

  closeCreateGameForm?.addEventListener("click", closeForm);
  cancelCreateRoom?.addEventListener("click", closeForm);

  // Handle private room password
  isPrivateRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "true") {
        passwordGroup.style.display = "block";
        passwordInput.required = true;
      } else {
        passwordGroup.style.display = "none";
        passwordInput.required = false;
      }
    });
  });

  // Form submission
  createRoomForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(createRoomForm);
    const data = {
      name: formData.get("name"),
      maxPlayers: formData.get("maxPlayers"),
      isPrivate: formData.get("isPrivate"),
      password: formData.get("password"),
      startingCards: formData.get("startingCards"),
      drawUntilPlayable: formData.get("drawUntilPlayable") === "true",
      stacking: formData.get("stacking") === "true",
    };

    try {
      const response = await fetch("/rooms/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.redirected) {
        window.location.href = response.url;
      } else if (response.ok) {
        const result = await response.json();
        window.location.href = `/rooms/${result.roomId}`;
      } else {
        const error = await response.json();
        alert(error.message || "Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    }
  });

  // Close form when clicking outside
  createGameContainer?.addEventListener("click", (e) => {
    if (e.target === createGameContainer) {
      closeForm();
    }
  });
});
