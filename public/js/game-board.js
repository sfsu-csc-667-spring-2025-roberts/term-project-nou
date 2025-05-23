import { gameState } from "./game/state/gameState.js";
import { setupSocketEvents } from "./game/events/socketEvents.js";
import { setupChatEvents } from "./game/ui/chatUI.js";
import { handleLeaveRoom } from "./game/actions/roomActions.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Game Board] Initializing game board...");
  
  const gameContainer = document.querySelector(".game-container");
  const otherPlayersContainer = document.getElementById(
    "other-players-container"
  );
  const myHandElement = document.getElementById("my-hand");
  const discardPileElement = document.getElementById("discard-pile");
  const drawPileElement = document.getElementById("draw-pile");
  const drawCardButton = document.getElementById("draw-card");
  const sayUnoButton = document.getElementById("say-uno");
  const colorSelectorElement = document.getElementById("color-selector");
  const currentPlayerElement = document.getElementById("current-player");
  const directionIndicatorElement = document.getElementById(
    "direction-indicator"
  );
  const chatMessageInput = document.getElementById("chat-message");
  const sendMessageButton = document.getElementById("send-message");
  const toggleChatButton = document.getElementById("toggleChat");
  const chatBodyElement = document.querySelector(".game-chat .chat-body");
  const leaveRoomButton = document.getElementById("leave-room");

  if (!gameContainer) {
    console.error("[Game Board] CRITICAL: '.game-container' element not found in the DOM!");
    alert("Error: Could not initialize the game board UI.");
    return;
  }

  // Get game ID from URL or session storage
  const gameId = gameContainer.dataset.gameId || sessionStorage.getItem('currentGameId');
  console.log(`[Game Board] Game ID from container:`, gameContainer.dataset.gameId);
  console.log(`[Game Board] Game ID from session storage:`, sessionStorage.getItem('currentGameId'));

  if (!gameId) {
    console.error("[Game Board] CRITICAL: Game ID not found!");
    alert("Error: Could not identify the game. Redirecting...");
    window.location.href = "/lobby";
    return;
  }

  console.log(
    `[Game Board] Initializing Game Board with ID: ${gameId}`,
    "color: green; font-weight: bold;"
  );

  let username = localStorage.getItem("username");
  console.log(`[Game Board] Username from localStorage:`, username);

  if (typeof io === "undefined") {
    console.error("[Game Board] Socket.IO library not loaded!");
    alert("Error: Connection library missing. Please refresh.");
    return;
  }

  const socket = io();
  console.log("[DEBUG] Socket.IO instance created");
  
  socket.on("connect", () => {
    console.log("[DEBUG] Socket connected with ID:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.error("[DEBUG] Socket connection error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[DEBUG] Socket disconnected:", reason);
  });
  
  setupSocketEvents(socket, gameId, username);
  setupChatEvents(socket, gameId);

  function updateGameState(data) {
    console.log("[DEBUG] Updating game state with data:", data);
    console.log("[DEBUG] Current game state before update:", {
      myTurn: gameState.myTurn,
      currentPlayer: gameState.currentPlayer,
      myId: gameState.myId
    });

    // Update players and their hands
    if (data.players) {
      gameState.players = data.players;
    }

    // Update current player
    if (data.current_player_id) {
      gameState.currentPlayer = data.current_player_id;
      gameState.myTurn = (data.current_player_id === gameState.myId);
    }

    // Update direction
    if (data.direction) {
      gameState.direction = data.direction === 'clockwise' ? 1 : -1;
    }

    // Update top card
    if (data.top_card) {
      gameState.topCard = data.top_card;
      gameState.currentColor = data.top_card.color;
    }

    // Update my hand
    if (data.player_hands && gameState.myId) {
      const myHand = data.player_hands[gameState.myId];
      if (myHand) {
        gameState.myHand = myHand;
      }
    }

    // Update card counts
    if (data.draw_pile_count !== undefined) {
      gameState.drawPileCount = data.draw_pile_count;
    }
    if (data.discard_pile_count !== undefined) {
      gameState.discardPileCount = data.discard_pile_count;
    }

    console.log("[DEBUG] Game state after update:", {
      myTurn: gameState.myTurn,
      currentPlayer: gameState.currentPlayer,
      myId: gameState.myId,
      topCard: gameState.topCard,
      currentColor: gameState.currentColor
    });

    updateGameUI();
  }

  function updateGameUI() {
    console.log("Updating Game UI. My turn:", gameState.myTurn);

    const currentPlayerObj = gameState.players.find(
      (p) => String(p.id) === String(gameState.currentPlayer)
    );
    if (currentPlayerElement && currentPlayerObj) {
      currentPlayerElement.textContent =
        currentPlayerObj.id === gameState.myId
          ? `${currentPlayerObj.username} (You)`
          : currentPlayerObj.username;
    } else if (currentPlayerElement) {
      currentPlayerElement.textContent = "Unknown";
    }

    if (directionIndicatorElement) {
      directionIndicatorElement.textContent =
        gameState.direction === 1 ? "→ Clockwise" : "← Counter-Clockwise";
    }

    updateOtherPlayers();
    updateDiscardPile();
    updateMyHand();

    if (drawCardButton) drawCardButton.disabled = !gameState.myTurn;
    if (sayUnoButton) sayUnoButton.disabled = gameState.myHand.length !== 1;

    const playerArea = document.querySelector(".player-area");
    if (playerArea) {
      playerArea.classList.toggle("my-turn", gameState.myTurn);
    }
  }

  function updateOtherPlayers() {
    if (!otherPlayersContainer) return;
    otherPlayersContainer.innerHTML = "";
    gameState.players.forEach((player) => {
      if (player.id !== gameState.myId) {
        const opponentDiv = document.createElement("div");
        opponentDiv.className = "opponent";
        opponentDiv.classList.toggle(
          "current-player",
          player.id === gameState.currentPlayer
        );

        const nameDiv = document.createElement("div");
        nameDiv.className = "opponent-name";
        nameDiv.textContent = player.username;

        const cardsDiv = document.createElement("div");
        cardsDiv.className = "opponent-cards";

        const cardCount = player.cardCount || 0;
        for (let i = 0; i < Math.min(7, cardCount); i++) {
          const cardDiv = document.createElement("div");
          cardDiv.className = "uno-card back mini";
          cardDiv.style.marginLeft = i > 0 ? "-40px" : "0";

          const logoDiv = document.createElement("div");
          logoDiv.className = "card-logo";
          logoDiv.textContent = "UNO";
          cardDiv.appendChild(logoDiv);
          cardsDiv.appendChild(cardDiv);
        }

        const cardCountDiv = document.createElement("div");
        cardCountDiv.className = "opponent-card-count";
        cardCountDiv.textContent = `${cardCount} Card${cardCount !== 1 ? "s" : ""}`;

        opponentDiv.appendChild(nameDiv);
        opponentDiv.appendChild(cardsDiv);
        opponentDiv.appendChild(cardCountDiv);

        otherPlayersContainer.appendChild(opponentDiv);
      }
    });
  }

  function updateDiscardPile() {
    if (!discardPileElement) return;
    console.log("[DEBUG] Updating discard pile with card:", gameState.topCard);
    
    discardPileElement.innerHTML = "";
    if (gameState.topCard) {
      const cardDiv = createCardElement(gameState.topCard);
      discardPileElement.appendChild(cardDiv);
    } else {
      discardPileElement.innerHTML = '<div class="card-placeholder">Discard Pile</div>';
    }
  }

  function updateMyHand() {
    if (!myHandElement) return;
    myHandElement.innerHTML = "";

    console.log("[DEBUG] Updating my hand. Cards:", gameState.myHand);
    console.log("[DEBUG] My turn:", gameState.myTurn);

    gameState.myHand.forEach((card) => {
      const cardDiv = createCardElement(card);
      const isPlayable = gameState.myTurn && canPlayCard(card);
      
      console.log("[DEBUG] Card:", card, "isPlayable:", isPlayable);

      cardDiv.classList.toggle("playable", isPlayable);
      cardDiv.classList.toggle("disabled", !isPlayable);

      if (isPlayable) {
        cardDiv.addEventListener("click", () => handleCardClick(card));
      }

      myHandElement.appendChild(cardDiv);
    });

    fanOutCards(myHandElement);
    if (sayUnoButton) sayUnoButton.disabled = gameState.myHand.length !== 1;
  }

  function handleCardClick(card) {
    console.log("[DEBUG] Card clicked:", card);
    console.log("[DEBUG] My turn:", gameState.myTurn);
    console.log("[DEBUG] Can play card:", canPlayCard(card));
    console.log("[DEBUG] Game state:", {
      currentPlayer: gameState.currentPlayer,
      myId: gameState.myId,
      topCard: gameState.topCard
    });
    
    if (gameState.myTurn && canPlayCard(card)) {
      if (card.type === "wild" || card.type === "wild_draw_four") {
        console.log("Wild card clicked, showing color selector.");
        gameState.selectedWildCard = card;
        showColorSelector();
      } else {
        console.log("Playing non-wild card:", card);
        playCard(card);
      }
    } else {
      const reason = !gameState.myTurn
        ? "It's not your turn!"
        : "You cannot play this card!";
      console.warn("Cannot play card:", reason);
      addChatMessage({ username: "System", message: reason, type: "system" });
    }
  }

  function fanOutCards(container) {
    const cards = container.querySelectorAll(".uno-card");
    const numCards = cards.length;
    if (numCards <= 1) {
      if (numCards === 1) cards[0].style.marginLeft = "0";
      return;
    }

    const containerWidth = container.offsetWidth;
    let cardWidth = 100; // Default width
    if (cards[0]) {
      const cardStyle = window.getComputedStyle(cards[0]);
      cardWidth =
        parseFloat(cardStyle.width) +
        parseFloat(cardStyle.marginLeft) +
        parseFloat(cardStyle.marginRight);
    }

    const totalCardWidth = numCards * cardWidth;
    let overlap = 0;
    let initialOffset = 0; // For centering

    if (totalCardWidth > containerWidth) {
      overlap = (totalCardWidth - containerWidth) / (numCards - 1);
      overlap = Math.min(overlap, cardWidth * 0.75);
    } else {
      initialOffset = (containerWidth - totalCardWidth) / 2;
    }

    container.style.paddingLeft = "0px";

    cards.forEach((card, index) => {
      card.style.marginLeft =
        index === 0 ? `${initialOffset}px` : `-${overlap}px`;
    });
  }

  function createCardElement(card) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "uno-card";
    cardDiv.dataset.cardId = card.id;
    cardDiv.dataset.cardType = card.type;
    cardDiv.dataset.cardColor = card.color;
    cardDiv.dataset.cardValue = card.value;

    // Add color class
    if (card.color !== "black") {
      cardDiv.classList.add(card.color);
    }

    // Add type class
    cardDiv.classList.add(card.type);

    // Add value class
    if (card.value) {
      cardDiv.classList.add(`value-${card.value}`);
    }

    // Create card content
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";

    // Add card value
    const valueDiv = document.createElement("div");
    valueDiv.className = "card-value";
    valueDiv.textContent = card.value || card.type;
    cardContent.appendChild(valueDiv);

    // Add card type icon if it's an action card
    if (card.type !== "number") {
      const iconDiv = document.createElement("div");
      iconDiv.className = "card-icon";
      iconDiv.textContent = getCardIcon(card.type);
      cardContent.appendChild(iconDiv);
    }

    cardDiv.appendChild(cardContent);
    return cardDiv;
  }

  function getCardIcon(type) {
    switch (type) {
      case "skip":
        return "⏭️";
      case "reverse":
        return "↩️";
      case "draw2":
        return "+2";
      case "wild":
        return "🎨";
      case "wild_draw4":
        return "+4";
      default:
        return "";
    }
  }

  function canPlayCard(card) {
    if (!gameState.topCard) return true;
    
    // Wild cards can always be played
    if (card.type === "wild" || card.type === "wild_draw4") {
      return true;
    }
    
    // Check color match with current color
    if (card.color === gameState.currentColor) {
      return true;
    }
    
    // Check value match with top card
    if (card.value === gameState.topCard.value) {
      return true;
    }
    
    return false;
  }

  function playCard(card, chosenColor = null) {
    console.log(
      `[DEBUG] Attempting to play card:`,
      card,
      `Chosen color: ${chosenColor}`
    );
    console.log("[DEBUG] Socket connected:", socket.connected);
    console.log("[DEBUG] Game ID:", gameId);
    
    const cardData = { ...card };
    if (
      (card.type === "wild" || card.type === "wild_draw_four") &&
      chosenColor
    ) {
      cardData.declaredColor = chosenColor;
    }
    
    const playCardData = {
      gameId: gameId,
      cardId: card.id,
      declaredColor: cardData.declaredColor
    };
    
    console.log("[DEBUG] Emitting playCard with data:", playCardData);
    
    // Remove the card from hand immediately for better UX
    gameState.myHand = gameState.myHand.filter(c => c.id !== card.id);
    updateMyHand();
    
    socket.emit("playCard", playCardData, (response) => {
      console.log("[DEBUG] PlayCard response:", response);
      if (response && response.error) {
        // If there was an error, add the card back to hand
        gameState.myHand.push(card);
        updateMyHand();
        addChatMessage({
          username: "System",
          message: `Error: ${response.error}`,
          type: "system",
        });
      }
    });
  }

  function showColorSelector() {
    if (!colorSelectorElement) return;
    colorSelectorElement.classList.remove("hidden");

    const colorButtons = colorSelectorElement.querySelectorAll(".color-btn");
    colorButtons.forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      newButton.addEventListener(
        "click",
        () => {
          const color = newButton.dataset.color;
          console.log(`Color selected: ${color}`);
          if (gameState.selectedWildCard) {
            playCard(gameState.selectedWildCard, color);
          } else {
            console.error(
              "Color selected but no wild card was stored in gameState.selectedWildCard"
            );
          }
          colorSelectorElement.classList.add("hidden");
          gameState.selectedWildCard = null;
        },
        { once: true }
      );
    });
  }

  function addChatMessage(data) {
    const chatMessagesElement = document.getElementById("chat-messages");
    if (!chatMessagesElement) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message";
    const isMyMsg = data.senderId === gameState.myId;

    if (data.type === "system") {
      messageDiv.classList.add("system");
      messageDiv.textContent = data.message;
      if (data.highlight) messageDiv.classList.add("highlight");
    } else {
      messageDiv.classList.toggle("my-message", isMyMsg);
      messageDiv.classList.toggle("other-message", !isMyMsg);

      const usernameSpan = document.createElement("span");
      usernameSpan.className = "username";
      usernameSpan.textContent = isMyMsg ? "You:" : `${data.username}:`;

      messageDiv.appendChild(usernameSpan);
      messageDiv.appendChild(document.createTextNode(` ${data.message}`));
    }
    chatMessagesElement.appendChild(messageDiv);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  }

  function sendChatMessage() {
    if (!chatMessageInput) return;
    const message = chatMessageInput.value.trim();
    if (message) {
      console.log("Sending chat message:", message);
      socket.emit("chatMessage", { roomId: gameId, message });
      chatMessageInput.value = "";
    }
  }

  function formatCardDescription(card) {
    let cardDesc = "";
    const color = card.declaredColor || card.color;
    const typeDisplay = card.type.replace("_", " ");

    if (card.type === "number") cardDesc = `${color} ${card.value}`;
    else if (card.type === "wild") cardDesc = `Wild (chose ${color})`;
    else if (card.type === "wild_draw_four")
      cardDesc = `Wild Draw Four (chose ${color})`;
    else cardDesc = `${color} ${typeDisplay}`;
    return cardDesc;
  }

  // Event Listeners
  if (drawCardButton) {
    drawCardButton.addEventListener("click", () => {
      if (!drawCardButton.disabled) {
        socket.emit("drawCard", { roomId: gameId });
      }
    });
  }

  if (sayUnoButton) {
    sayUnoButton.addEventListener("click", () => {
      if (!sayUnoButton.disabled) {
        console.log("Say UNO button clicked.");
        socket.emit("sayUno", { roomId: gameId });
      }
    });
  }

  if (leaveRoomButton) {
    leaveRoomButton.addEventListener("click", () => {
      handleLeaveRoom(gameId, socket);
    });
  }

  if (sendMessageButton && chatMessageInput) {
    sendMessageButton.addEventListener("click", sendChatMessage);
    chatMessageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });
  }

  if (toggleChatButton && chatBodyElement) {
    toggleChatButton.addEventListener("click", () => {
      const isCollapsed = chatBodyElement.style.display === "none";
      chatBodyElement.style.display = isCollapsed ? "" : "none";
      toggleChatButton.textContent = isCollapsed ? "▼" : "▲";
    });
  }

  // Socket Events
  socket.on("gameState", (data) => {
    console.log("[DEBUG] Received gameState event:", data);
    updateGameState(data);
  });

  socket.on("cardPlayed", (data) => {
    console.log("[DEBUG] Received cardPlayed event:", data);
    const { player, card } = data;
    
    // Update top card immediately
    gameState.topCard = card;
    gameState.currentColor = card.declaredColor || card.color;
    
    // Update UI
    updateDiscardPile();
    updateGameUI();
    
    // Show message
    const playerName = player.id === gameState.myId ? "You" : player.username;
    let cardDesc = formatCardDescription(card);
    addChatMessage({
      username: "System",
      message: `${playerName} played ${cardDesc}`,
      type: "system",
    });
    
    // Add animation
    if (discardPileElement) {
      discardPileElement.classList.add("card-played-animation");
      setTimeout(
        () => discardPileElement.classList.remove("card-played-animation"),
        300
      );
    }
  });

  socket.on("cardDrawn", (data) => {
    console.log("Received cardDrawn event:", data);
    const { player, cardCount } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    addChatMessage({
      username: "System",
      message: `${playerName} drew ${cardCount === 1 ? "a card" : cardCount + " cards"}`,
      type: "system",
    });
  });

  socket.on("playerSaidUno", (data) => {
    console.log("Received playerSaidUno event:", data);
    const { player } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    addChatMessage({
      username: "System",
      message: `${playerName} shouted UNO!`,
      type: "system",
    });
  });

  socket.on("gameOver", (data) => {
    console.log(
      "%cGame Over! Winner data:",
      "color: red; font-weight: bold;",
      data
    );
    const { winner } = data;
    const winnerName = winner.id === gameState.myId ? "You" : winner.username;
    addChatMessage({
      username: "System",
      message: `🎉 Game Over! ${winnerName} won the game! 🎉`,
      type: "system",
      highlight: true,
    });

    if (drawCardButton) drawCardButton.disabled = true;
    if (sayUnoButton) sayUnoButton.disabled = true;
    if (myHandElement)
      myHandElement
        .querySelectorAll(".uno-card")
        .forEach((c) => c.classList.add("disabled"));

    const gameControls = document.querySelector(".game-controls");
    if (gameControls) {
      gameControls.innerHTML = "";
      const isCreator = gameState.players.find(
        (p) => p.id === gameState.myId
      )?.isCreator;

      if (isCreator) {
        const playAgainBtn = document.createElement("button");
        playAgainBtn.className = "btn btn-primary";
        playAgainBtn.textContent = "Play Again";
        playAgainBtn.onclick = () => {
          socket.emit("playAgain", { roomId: gameId });
          playAgainBtn.textContent = "Restarting...";
          playAgainBtn.disabled = true;
        };
        gameControls.appendChild(playAgainBtn);
      }

      const backToLobbyBtn = document.createElement("button");
      backToLobbyBtn.className = "btn btn-secondary";
      backToLobbyBtn.textContent = "Back to Lobby";
      backToLobbyBtn.onclick = () => {
        window.location.href = "/lobby";
      };
      gameControls.appendChild(backToLobbyBtn);
    }
  });

  socket.on("chatMessage", (data) => {
    console.log("Received chat message:", data);
    addChatMessage(data);
  });

  socket.on("error", (error) => {
    console.error("[DEBUG] Socket error:", error);
    addChatMessage({
      username: "System",
      message: `Error: ${error.message}`,
      type: "system",
    });
  });

  // Initial game state fetch
  fetch(`/games/${gameId}/state`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("[DEBUG] Initial game state:", data);
      if (data.myId) {
        gameState.myId = typeof data.myId === "string" ? parseInt(data.myId, 10) : data.myId;
      }
      updateGameState(data);
    })
    .catch((error) => {
      console.error("[DEBUG] Error fetching initial game state:", error);
      addChatMessage({
        username: "System",
        message: "Error loading game state. Please refresh the page.",
        type: "system",
      });
    });
});
