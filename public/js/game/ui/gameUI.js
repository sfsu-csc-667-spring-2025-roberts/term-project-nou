import { gameState, isMyTurn, getCurrentPlayer, getPlayerById } from "../state/gameState.js";
import { createCardElement, canPlayCard } from "../utils/cardUtils.js";

// Update the entire game UI based on current game state
export const updateGameUI = () => {
  console.log("[Game UI] Updating game UI");
  try {
    updateTopCard();
    updateCurrentPlayer();
    updatePlayerHands();
    updateGameStatus();
    console.log("[Game UI] Game UI updated successfully");
  } catch (error) {
    console.error("[Game UI] Error updating game UI:", error);
  }
};

const updateTopCard = () => {
  console.log("[Game UI] Updating top card:", gameState.topCard);
  const topCardElement = document.querySelector(".top-card");
  if (!topCardElement) {
    console.error("[Game UI] Top card element not found");
    return;
  }

  if (gameState.topCard) {
    topCardElement.innerHTML = `
      <div class="card ${gameState.topCard.color}">
        <span class="card-value">${gameState.topCard.value}</span>
      </div>
    `;
  } else {
    topCardElement.innerHTML = '<div class="card-placeholder">No card played yet</div>';
  }
};

// Update the current player display
const updateCurrentPlayer = () => {
  console.log("[Game UI] Updating current player display");
  const currentPlayer = getCurrentPlayer();
  const currentPlayerElement = document.querySelector(".current-player");
  
  if (!currentPlayerElement) {
    console.error("[Game UI] Current player element not found");
    return;
  }

  if (currentPlayer) {
    const player = getPlayerById(currentPlayer);
    currentPlayerElement.textContent = `Current Player: ${player ? player.username : 'Unknown'}`;
    currentPlayerElement.classList.toggle("my-turn", isMyTurn());
  } else {
    currentPlayerElement.textContent = "Waiting for game to start...";
    currentPlayerElement.classList.remove("my-turn");
  }
};

const updatePlayerHands = () => {
  console.log("[Game UI] Updating player hands");
  const playersContainer = document.querySelector(".players-container");
  if (!playersContainer) {
    console.error("[Game UI] Players container not found");
    return;
  }

  playersContainer.innerHTML = gameState.players
    .filter(player => player.id !== gameState.myId)
    .map(player => `
      <div class="player-hand ${player.id === gameState.currentPlayer ? 'current-player' : ''}">
        <div class="player-info">
          <span class="player-name">${player.username}</span>
          <span class="card-count">${player.hand ? player.hand.length : 0} cards</span>
        </div>
        <div class="player-cards">
          ${Array(player.hand ? player.hand.length : 0).fill('<div class="card back"></div>').join('')}
        </div>
      </div>
    `).join('');
};

const updateGameStatus = () => {
  console.log("[Game UI] Updating game status");
  const statusElement = document.querySelector(".game-status");
  if (!statusElement) {
    console.error("[Game UI] Game status element not found");
    return;
  }

  switch (gameState.status) {
    case "waiting":
      statusElement.textContent = "Waiting for players...";
      break;
    case "playing":
      statusElement.textContent = isMyTurn() ? "Your turn!" : "Waiting for other players...";
      break;
    case "finished":
      statusElement.textContent = "Game Over!";
      break;
    default:
      statusElement.textContent = "Unknown game status";
  }
};

// Update the display of other players' cards and information
export const updateOtherPlayers = () => {
  const otherPlayersContainer = document.getElementById(
    "other-players-container"
  );
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
};

// Update the discard pile display
export const updateDiscardPile = () => {
  const discardPileElement = document.getElementById("discard-pile");
  if (!discardPileElement) return;

  discardPileElement.innerHTML = "";
  if (gameState.topCard) {
    const cardDiv = createCardElement(gameState.topCard);
    discardPileElement.appendChild(cardDiv);
  } else {
    discardPileElement.innerHTML =
      '<div class="card-placeholder">Discard Pile</div>';
  }
};

// Update the player's hand display
export const updateMyHand = () => {
  console.log("[Game UI] Updating my hand UI");
  const myHandElement = document.getElementById("my-hand");
  if (!myHandElement) return;

  myHandElement.innerHTML = "";
  gameState.myHand.forEach((card) => {
    const cardDiv = createCardElement(card);
    const isPlayable = gameState.myTurn && canPlayCard(card);

    cardDiv.classList.toggle("playable", isPlayable);
    cardDiv.classList.toggle("disabled", !isPlayable);

    if (isPlayable) {
      cardDiv.replaceWith(cardDiv.cloneNode(true));
      myHandElement.appendChild(cardDiv);
      cardDiv.addEventListener("click", () => handleCardClick(card));
    } else {
      myHandElement.appendChild(cardDiv);
    }
  });

  fanOutCards(myHandElement);
  updateUnoButton();
};

// Update the UNO button state
const updateUnoButton = () => {
  const sayUnoButton = document.getElementById("say-uno");
  if (sayUnoButton) {
    sayUnoButton.disabled = gameState.myHand.length !== 1;
  }
};

// Update game control buttons state
const updateGameControls = () => {
  const drawCardButton = document.getElementById("draw-card");
  if (drawCardButton) {
    drawCardButton.disabled = !gameState.myTurn;
  }

  const playerArea = document.querySelector(".player-area");
  if (playerArea) {
    playerArea.classList.toggle("my-turn", gameState.myTurn);
  }
};

// Handle card click events
const handleCardClick = (card) => {
  console.log("Card clicked:", card, "My turn:", gameState.myTurn);
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
};

// Fan out cards in the player's hand
const fanOutCards = (container) => {
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
};
