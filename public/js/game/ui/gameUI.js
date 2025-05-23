import { gameState, isMyTurn, getCurrentPlayer, getPlayerById } from "../state/gameState.js";
import { createCardElement, canPlayCard } from "../utils/cardUtils.js";

// Update the entire game UI based on current game state
export const updateGameUI = () => {
  console.log("[Game UI] Updating game UI with state:", gameState);
  
  // Ensure the game container exists
  let gameContainer = document.querySelector('.game-container');
  if (!gameContainer) {
    gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';
    document.body.appendChild(gameContainer);
  }

  // Update the entire game UI structure
  gameContainer.innerHTML = `
    <div class="game-header">
      <div id="game-status" class="game-status">Game Status: ${gameState.status}</div>
      <div id="current-player" class="current-player">Current Player: ${getCurrentPlayerName()}</div>
      <div id="game-direction" class="game-direction">Direction: ${gameState.direction === 1 ? 'Clockwise' : 'Counter-clockwise'}</div>
    </div>

    <div class="game-board">
      <div id="top-card" class="top-card">
        ${renderTopCard()}
      </div>

      <div id="player-hands" class="player-hands">
        ${renderPlayerHands()}
      </div>

      <div id="action-buttons" class="action-buttons">
        <button id="draw-card" ${!isMyTurn() ? 'disabled' : ''}>Draw Card</button>
        <button id="say-uno" ${!isMyTurn() ? 'disabled' : ''}>Say UNO!</button>
      </div>
    </div>
  `;

  // Add event listeners after rendering
  setupEventListeners();

  updateMyHand();
};

const getCurrentPlayerName = () => {
  const player = getPlayerById(gameState.currentPlayer);
  return player ? player.username : 'Unknown';
};

const renderTopCard = () => {
  if (!gameState.topCard) {
    return '<div class="no-card">No card played yet</div>';
  }

  const card = gameState.topCard;
  return `
    <div class="card ${card.color} ${card.type}">
      <div class="card-value">${formatCardValue(card)}</div>
    </div>
  `;
};

const renderPlayerHands = () => {
  return gameState.players.map(player => {
    const isCurrentPlayer = player.id === gameState.currentPlayer;
    const isMyHand = player.id === gameState.myId;
    
    return `
      <div class="player-hand ${isCurrentPlayer ? 'current' : ''} ${isMyHand ? 'my-hand' : ''}">
        <div class="player-name">${player.username} ${isMyHand ? '(You)' : ''}</div>
        <div class="cards-container">
          ${renderPlayerCards(player)}
        </div>
      </div>
    `;
  }).join('');
};

const renderPlayerCards = (player) => {
  if (player.id === gameState.myId) {
    return player.hand.map(card => `
      <div class="card ${card.color} ${card.type}" data-card-id="${card.id}">
        <div class="card-value">${formatCardValue(card)}</div>
      </div>
    `).join('');
  } else {
    return Array(player.hand ? player.hand.length : 0).fill(`
      <div class="card back"></div>
    `).join('');
  }
};

const formatCardValue = (card) => {
  switch (card.type) {
    case 'number':
      return card.value;
    case 'skip':
      return '⏭️';
    case 'reverse':
      return '🔄';
    case 'draw2':
      return '+2';
    case 'wild':
      return '🎨';
    case 'wild_draw4':
      return '+4';
    default:
      return '?';
  }
};

const setupEventListeners = () => {
  // Draw card button
  const drawCardBtn = document.getElementById('draw-card');
  if (drawCardBtn) {
    drawCardBtn.onclick = () => {
      if (isMyTurn()) {
        socket.emit('drawCard', { gameId: gameState.roomId });
      }
    };
  }

  // Say UNO button
  const sayUnoBtn = document.getElementById('say-uno');
  if (sayUnoBtn) {
    sayUnoBtn.onclick = () => {
      if (isMyTurn()) {
        socket.emit('sayUno', { gameId: gameState.roomId });
      }
    };
  }

  // Card click events
  const cards = document.querySelectorAll('.card:not(.back)');
  cards.forEach(card => {
    card.onclick = () => {
      if (isMyTurn()) {
        const cardId = card.dataset.cardId;
        socket.emit('playCard', {
          gameId: gameState.roomId,
          cardId: cardId
        });
      }
    };
  });
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
  const myHandElement = document.getElementById("my-hand");
  if (!myHandElement) {
    console.log("[UNO DEBUG] #my-hand not found in DOM");
    return;
  }
  myHandElement.innerHTML = "";
  if (Array.isArray(gameState.myHand)) {
    console.log("[UNO DEBUG] updateMyHand called, cards:", gameState.myHand);
    gameState.myHand.forEach(card => {
      const cardDiv = createCardElement(card);
      myHandElement.appendChild(cardDiv);
    });
  } else {
    console.log("[UNO DEBUG] gameState.myHand is not an array", gameState.myHand);
  }

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
