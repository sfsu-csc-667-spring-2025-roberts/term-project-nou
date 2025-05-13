
document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.querySelector('.game-container');
    const waitingRoomElement = document.getElementById('waiting-room');
    const gameBoardElement = document.getElementById('game-board');
    const otherPlayersContainer = document.getElementById('other-players-container');
    const myHandElement = document.getElementById('my-hand');
    const discardPileElement = document.getElementById('discard-pile');
    const drawPileElement = document.getElementById('draw-pile');
    const drawCardButton = document.getElementById('draw-card');
    const sayUnoButton = document.getElementById('say-uno');
    const colorSelectorElement = document.getElementById('color-selector');
    const currentPlayerElement = document.getElementById('current-player');
    const directionIndicatorElement = document.getElementById('direction-indicator');
    const chatBodyElement = document.querySelector('.game-chat .chat-body');
    const chatMessagesElement = document.getElementById('chat-messages');
    const chatMessageInput = document.getElementById('chat-message');
    const sendMessageButton = document.getElementById('send-message');
    const toggleChatButton = document.getElementById('toggleChat');
    const leaveRoomButton = document.getElementById('leave-room');
    const roomIdElement = document.getElementById('room-id');
    const minPlayersInput = document.getElementById('min-players');
    const maxPlayersInput = document.getElementById('max-players-input');
    const updateSettingsButton = document.getElementById('update-settings');
    const startGameButton = document.getElementById('start-game');
    const currentPlayersElement = document.getElementById('current-players');
    const maxPlayersElement = document.getElementById('max-players');
    const waitingPlayersElement = document.getElementById('waiting-players');

    if (!gameContainer) {
        console.error("CRITICAL: '.game-container' element not found in the DOM!");
        alert("Error: Could not initialize the game room UI.");
        return; 
    }

    const gameId = gameContainer.dataset.gameId;

    if (!gameId) {
        console.error("CRITICAL: Game ID not found in the game container!");
        alert("Error: Could not identify the game room. Redirecting...");
        window.location.href = '/lobby'; 
        return; 
    }

    console.log(`%cInitializing Game Room with ID: ${gameId}`, 'color: blue; font-weight: bold;');

    let gameState = {
        players: [],
        currentPlayer: null,
        direction: 1,
        topCard: null,
        myHand: [],
        myTurn: false,
        selectedWildCard: null,
        gameStarted: false,
        myId: null,
        minPlayersRequired: 2,
    };

    let username = localStorage.getItem('username');


    if (typeof io === 'undefined') {
         console.error("Socket.IO library not loaded!");
         alert("Error: Connection library missing. Please refresh.");
         return;
    }
    const socket = io();

    async function fetchPlayers() {
        console.log(`fetchPlayers attempting for gameId: ${gameId}`);

        if (!gameId) {
             console.error("fetchPlayers cannot run: gameId is invalid or undefined at time of call.");
             return;
        }
        if (gameState.gameStarted || !waitingPlayersElement) {
            console.log("fetchPlayers: Game started or waiting element missing. Stopping polling.");
            clearInterval(playerInterval);
            playerInterval = null;
            return;
        }
        try {
            const url = `/games/${encodeURIComponent(gameId)}/players`;
            console.log(`Fetching players from URL: ${url}`);
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`HTTP error fetching players: ${response.status} ${response.statusText}`);
                let errorBody = `Failed to load player list (${response.status}).`;
                try {
                    const errorData = await response.json();
                    errorBody = errorData.message || errorBody;
                } catch (e) { /* Ignore */ }
                throw new Error(errorBody);
            }

            const players = await response.json();
            console.log("Fetched players successfully:", players);

            const maxPlayers = 3;
            updateRoomInfo({
                players: players,
                minPlayers: gameState.minPlayersRequired,
                maxPlayers: maxPlayers,
                currentPlayers: players.length
             });

        } catch (error) {
            console.error('Error during fetchPlayers:', error);
            addChatMessage({ username: 'System', message: `Error updating player list: ${error.message}`, type: 'system'});
        }
    }

    function updateRoomInfo(data) {
         console.log("Updating room info with data:", data);
         if (data.minPlayers !== undefined) {
             gameState.minPlayersRequired = data.minPlayers;
             console.log(`Min players required set to: ${gameState.minPlayersRequired}`);
         }

         if (!gameState.gameStarted) {
              if (currentPlayersElement) currentPlayersElement.textContent = data.players.length;
              if (maxPlayersElement && data.maxPlayers !== undefined) maxPlayersElement.textContent = data.maxPlayers;
              if (minPlayersInput && data.minPlayers !== undefined) minPlayersInput.value = data.minPlayers;
              if (maxPlayersInput && data.maxPlayers !== undefined) maxPlayersInput.value = data.maxPlayers;

              if (waitingPlayersElement) {
                   waitingPlayersElement.innerHTML = '';
                   data.players.forEach(player => {
                       const li = document.createElement('li');
                       li.textContent = player.username;
                       if (player.isCreator) {
                           li.classList.add('creator');
                           li.textContent += ' (Host)';
                       }
                     
                       if (gameState.myId && player.id === gameState.myId) {
                           li.classList.add('you');
                           li.textContent += ' (You)';
                       }
                       waitingPlayersElement.appendChild(li);
                   });
              }
              console.log("Updated waiting players list: ", data.players);

              if (startGameButton) {
                  const canStart = data.players.length >= 2;
                  startGameButton.disabled = !canStart;
                  console.log(`Start button ${canStart ? 'enabled' : 'disabled'} (${data.players.length}/${gameState.minPlayersRequired} players)`);
              }
         } else {
              console.log("Skipping waiting room UI update because game has started.");
         }
    }

    function startGame(data) {
        console.log("%cGame Starting with data:", "color: green; font-weight: bold;", data);

        if (waitingRoomElement) waitingRoomElement.classList.add('hidden');
        if (gameBoardElement) gameBoardElement.classList.remove('hidden');

        gameState.players = data.players || [];
        gameState.currentPlayer = data.currentPlayer;
        gameState.topCard = data.topCard;
        gameState.myHand = data.myHand || []; 
        gameState.direction = data.direction || 1;
        gameState.gameStarted = true;
        gameState.myTurn = data.currentPlayer === gameState.myId;

        updateGameUI();
        addChatMessage({ username: 'System', message: 'Game started! Good luck!', type: 'system' });
    }

    function updateGameState(data) {
        console.log("Updating game state with data:", data);
        if (!gameState.gameStarted) {
            console.warn("Received game state update but game hasn't started locally.");
            startGame(data);
            return;
        }

        gameState.players = data.players || gameState.players;
        gameState.currentPlayer = data.currentPlayer;
        gameState.direction = data.direction;
        gameState.topCard = data.topCard;
        gameState.myTurn = data.currentPlayer === gameState.myId;

        const me = gameState.players.find(p => p.id === gameState.myId);
        if (me && me.hand) {
           console.log("Updating my hand from full game state update.");
           gameState.myHand = me.hand;
        }

        updateGameUI();
    }

    function updateGameUI() {
        console.log("Updating Game UI. My turn:", gameState.myTurn);

        const currentPlayerObj = gameState.players.find(p => p.id === gameState.currentPlayer);
        if (currentPlayerElement && currentPlayerObj) {
            currentPlayerElement.textContent = (currentPlayerObj.id === gameState.myId) ? `${currentPlayerObj.username} (You)` : currentPlayerObj.username;
        } else if (currentPlayerElement) {
             currentPlayerElement.textContent = 'Unknown';
        }

        if (directionIndicatorElement) {
            directionIndicatorElement.textContent = gameState.direction === 1 ? '→ Clockwise' : '← Counter-Clockwise';
        }

        updateOtherPlayers();
        updateDiscardPile();
        updateMyHand(); 

        if (drawCardButton) drawCardButton.disabled = !gameState.myTurn;
        if (sayUnoButton) sayUnoButton.disabled = gameState.myHand.length !== 1;

        const playerArea = document.querySelector('.player-area');
        if (playerArea) {
            playerArea.classList.toggle('my-turn', gameState.myTurn);
        }
    }

    function updateOtherPlayers() {
        if (!otherPlayersContainer) return;
        otherPlayersContainer.innerHTML = '';
        gameState.players.forEach(player => {
            if (player.id !== gameState.myId) {
                const opponentDiv = document.createElement('div');
                opponentDiv.className = 'opponent';
                opponentDiv.classList.toggle('current-player', player.id === gameState.currentPlayer);

                const nameDiv = document.createElement('div');
                nameDiv.className = 'opponent-name';
                nameDiv.textContent = player.username;

                const cardsDiv = document.createElement('div');
                cardsDiv.className = 'opponent-cards';

                const cardCount = player.cardCount || 0;
                for (let i = 0; i < Math.min(7, cardCount); i++) {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'uno-card back mini';
                    cardDiv.style.marginLeft = i > 0 ? '-40px' : '0';

                    const logoDiv = document.createElement('div');
                    logoDiv.className = 'card-logo';
                    logoDiv.textContent = 'UNO';
                    cardDiv.appendChild(logoDiv);
                    cardsDiv.appendChild(cardDiv);
                }

                const cardCountDiv = document.createElement('div');
                cardCountDiv.className = 'opponent-card-count';
                cardCountDiv.textContent = `${cardCount} Card${cardCount !== 1 ? 's' : ''}`;

                opponentDiv.appendChild(nameDiv);
                opponentDiv.appendChild(cardsDiv);
                opponentDiv.appendChild(cardCountDiv);

                otherPlayersContainer.appendChild(opponentDiv);
            }
        });
    }

     function updateDiscardPile() {
        if (!discardPileElement) return;
        discardPileElement.innerHTML = ''; 

        if (gameState.topCard) {
            const cardDiv = createCardElement(gameState.topCard);
            discardPileElement.appendChild(cardDiv);
        } else {
            discardPileElement.innerHTML = '<div class="card-placeholder">Discard Pile</div>';
        }
    }

    function updateMyHand() {
        if (!myHandElement) return;
        myHandElement.innerHTML = '';

        gameState.myHand.forEach((card) => {
            const cardDiv = createCardElement(card);
            const isPlayable = gameState.myTurn && canPlayCard(card);

            cardDiv.classList.toggle('playable', isPlayable);
            cardDiv.classList.toggle('disabled', !isPlayable);

            if (isPlayable) {
                cardDiv.replaceWith(cardDiv.cloneNode(true)); 
                myHandElement.appendChild(cardDiv); 
                cardDiv.addEventListener('click', () => handleCardClick(card)); 
            } else {
                 myHandElement.appendChild(cardDiv);
            }
        });

        fanOutCards(myHandElement);
        if (sayUnoButton) sayUnoButton.disabled = gameState.myHand.length !== 1;
    }

    function handleCardClick(card) {
         console.log("Card clicked:", card, "My turn:", gameState.myTurn);
         if (gameState.myTurn && canPlayCard(card)) {
            if (card.type === 'wild' || card.type === 'wild_draw_four') {
                console.log("Wild card clicked, showing color selector.");
                gameState.selectedWildCard = card;
                showColorSelector();
            } else {
                console.log("Playing non-wild card:", card);
                playCard(card);
            }
        } else {
             const reason = !gameState.myTurn ? 'It\'s not your turn!' : 'You cannot play this card!';
             console.warn("Cannot play card:", reason);
             addChatMessage({ username: 'System', message: reason, type: 'system' });
        }
    }

    function fanOutCards(container) {
        const cards = container.querySelectorAll('.uno-card');
        const numCards = cards.length;
        if (numCards <= 1) {
             if (numCards === 1) cards[0].style.marginLeft = '0';
             return;
        }

        const containerWidth = container.offsetWidth;
        let cardWidth = 100; // Default width
        if (cards[0]) {
            const cardStyle = window.getComputedStyle(cards[0]);
            cardWidth = parseFloat(cardStyle.width) + parseFloat(cardStyle.marginLeft) + parseFloat(cardStyle.marginRight);
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

        container.style.paddingLeft = '0px';

        cards.forEach((card, index) => {
            card.style.marginLeft = index === 0 ? `${initialOffset}px` : `-${overlap}px`;
        });
    }

    function createCardElement(card) {
        const cardDiv = document.createElement('div');
        const displayColor = (card.type === 'wild' || card.type === 'wild_draw_four') && card.declaredColor ? card.declaredColor : card.color;
        cardDiv.className = `uno-card ${displayColor}`;
        cardDiv.dataset.type = card.type;
        if (card.type === 'number') cardDiv.dataset.value = card.value;

        const innerDiv = document.createElement('div');
        innerDiv.className = 'card-inner';
        const topLeftCorner = document.createElement('div');
        topLeftCorner.className = 'card-corner top-left';
        const bottomRightCorner = document.createElement('div');
        bottomRightCorner.className = 'card-corner bottom-right';
        const centerDiv = document.createElement('div');
        centerDiv.className = 'card-center';

        let symbol = '';
        let centerContent = '';
        switch (card.type) {
            case 'number': symbol = card.value; centerContent = card.value; break;
            case 'skip': symbol = '⊘'; centerContent = '<span class="symbol">⊘</span>'; break;
            case 'reverse': symbol = '⟲'; centerContent = '<span class="symbol">⟲</span>'; break;
            case 'draw_two': symbol = '+2'; centerContent = '<span class="symbol">+2</span>'; break;
            case 'wild': symbol = ''; centerContent = '<div class="wild-colors"><div class="wild-red"></div><div class="wild-blue"></div><div class="wild-yellow"></div><div class="wild-green"></div></div><span class="symbol wild">Wild</span>'; break;
            case 'wild_draw_four': symbol = '+4'; centerContent = '<div class="wild-colors"><div class="wild-red"></div><div class="wild-blue"></div><div class="wild-yellow"></div><div class="wild-green"></div></div><span class="symbol wild four">+4</span>'; break;
            default: symbol = '?'; centerContent = '?';
        }
        topLeftCorner.innerHTML = symbol;
        bottomRightCorner.innerHTML = symbol;
        centerDiv.innerHTML = centerContent;
        innerDiv.appendChild(topLeftCorner);
        innerDiv.appendChild(centerDiv);
        innerDiv.appendChild(bottomRightCorner);
        cardDiv.appendChild(innerDiv);
        return cardDiv;
    }

    function canPlayCard(card) {
        const topCard = gameState.topCard;
        if (!topCard) return true; 

        const topColor = (topCard.type === 'wild' || topCard.type === 'wild_draw_four') && topCard.declaredColor ? topCard.declaredColor : topCard.color;

        if (card.type === 'wild' || card.type === 'wild_draw_four') return true;
        if (card.color === 'black') return false; 

        return card.color === topColor ||
               (card.type === 'number' && topCard.type === 'number' && card.value == topCard.value) || 
               (card.type !== 'number' && card.type === topCard.type);
    }

    function playCard(card, chosenColor = null) {
        console.log(`Attempting to play card:`, card, `Chosen color: ${chosenColor}`);
        const cardData = { ...card };
        if ((card.type === 'wild' || card.type === 'wild_draw_four') && chosenColor) {
            cardData.declaredColor = chosenColor;
        }
        socket.emit('playCard', { roomId: gameId, card: cardData });
    }

    function showColorSelector() {
        if (!colorSelectorElement) return;
        colorSelectorElement.classList.remove('hidden');

        const colorButtons = colorSelectorElement.querySelectorAll('.color-btn');
        colorButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
             newButton.addEventListener('click', () => {
                const color = newButton.dataset.color;
                console.log(`Color selected: ${color}`);
                if (gameState.selectedWildCard) {
                    playCard(gameState.selectedWildCard, color);
                } else {
                    console.error("Color selected but no wild card was stored in gameState.selectedWildCard");
                }
                colorSelectorElement.classList.add('hidden');
                gameState.selectedWildCard = null;
            }, { once: true }); 
        });
    }

    function handleCardPlayed(data) {
        console.log("Received cardPlayed event:", data);
        const { player, card } = data;
        const playerName = player.id === gameState.myId ? 'You' : player.username;
        let cardDesc = formatCardDescription(card);
        addChatMessage({ username: 'System', message: `${playerName} played ${cardDesc}`, type: 'system' });
        if (discardPileElement) {
             discardPileElement.classList.add('card-played-animation');
             setTimeout(() => discardPileElement.classList.remove('card-played-animation'), 300);
        }
    }

    function handleCardDrawn(data) {
        console.log("Received cardDrawn event:", data);
        const { player, cardCount } = data;
        const playerName = player.id === gameState.myId ? 'You' : player.username;
        addChatMessage({ username: 'System', message: `${playerName} drew ${cardCount === 1 ? 'a card' : cardCount + ' cards'}`, type: 'system' });
    }

    function handlePlayerSaidUno(data) {
        console.log("Received playerSaidUno event:", data);
        const { player } = data;
        const playerName = player.id === gameState.myId ? 'You' : player.username;
        addChatMessage({ username: 'System', message: `${playerName} shouted UNO!`, type: 'system' });
    }

    function handleGameOver(data) {
        console.log("%cGame Over! Winner data:", "color: red; font-weight: bold;", data);
        gameState.gameStarted = false;
        const { winner } = data;
        const winnerName = winner.id === gameState.myId ? 'You' : winner.username;
        addChatMessage({ username: 'System', message: `🎉 Game Over! ${winnerName} won the game! 🎉`, type: 'system', highlight: true });

        if (drawCardButton) drawCardButton.disabled = true;
        if (sayUnoButton) sayUnoButton.disabled = true;
        if (myHandElement) myHandElement.querySelectorAll('.uno-card').forEach(c => c.classList.add('disabled'));

        const gameControls = document.querySelector('.game-controls');
        if (gameControls) {
            gameControls.innerHTML = ''; 
            const isCreator = gameState.players.find(p => p.id === gameState.myId)?.isCreator;

             if (isCreator) {
                const playAgainBtn = document.createElement('button');
                playAgainBtn.className = 'btn btn-primary';
                playAgainBtn.textContent = 'Play Again';
                playAgainBtn.onclick = () => {
                    socket.emit('playAgain', { roomId: gameId });
                    playAgainBtn.textContent = 'Restarting...';
                    playAgainBtn.disabled = true;
                };
                gameControls.appendChild(playAgainBtn);
             }

             const backToLobbyBtn = document.createElement('button');
             backToLobbyBtn.className = 'btn btn-secondary';
             backToLobbyBtn.textContent = 'Back to Lobby';
             backToLobbyBtn.onclick = () => { window.location.href = '/lobby'; };
             gameControls.appendChild(backToLobbyBtn);
        }
    }

    function addChatMessage(data) {
        if (!chatMessagesElement) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        const isMyMsg = data.senderId === gameState.myId;

        if (data.type === 'system') {
            messageDiv.classList.add('system');
            messageDiv.textContent = data.message; 
            if (data.highlight) messageDiv.classList.add('highlight');
        } else {
             messageDiv.classList.toggle('my-message', isMyMsg);
             messageDiv.classList.toggle('other-message', !isMyMsg);

            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'username';
            usernameSpan.textContent = isMyMsg ? 'You:' : `${data.username}:`; 

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
            socket.emit('chatMessage', { roomId: gameId, message });
            chatMessageInput.value = '';
        }
    }

     function formatCardDescription(card) {
         let cardDesc = '';
         const color = card.declaredColor || card.color;
         const typeDisplay = card.type.replace('_', ' ');

         if (card.type === 'number') cardDesc = `${color} ${card.value}`;
         else if (card.type === 'wild') cardDesc = `Wild (chose ${color})`;
         else if (card.type === 'wild_draw_four') cardDesc = `Wild Draw Four (chose ${color})`;
         else cardDesc = `${color} ${typeDisplay}`;
         return cardDesc;
    }

    socket.on('connect', () => {
        gameState.myId = socket.id; 
        console.log(`Connected to server with ID: ${gameState.myId}`);
        addChatMessage({ username: 'System', message: `Connected as ${username}`, type: 'system' });
        if(gameId) {
            socket.emit('joinRoom', { roomId: gameId, username });
        } else {
            console.error("Cannot join room: gameId is invalid on connect.");
        }
    });
    socket.on('disconnect', (reason) => {
        console.warn(`Disconnected: ${reason}`);
        addChatMessage({ username: 'System', message: `Disconnected: ${reason}. Please refresh if connection isn't restored.`, type: 'system' });
    });
    socket.on('connect_error', (error) => {
        console.error("Connection Error:", error);
        addChatMessage({ username: 'System', message: `Connection failed: ${error.message}.`, type: 'system' });
    });
    socket.on('roomUpdate', (data) => { updateRoomInfo(data); });
    socket.on('gameStarted', (data) => { if(playerInterval) { clearInterval(playerInterval); playerInterval = null; } startGame(data); });
    socket.on('updateGameState', (data) => { updateGameState(data); });
    socket.on('updateMyHand', (data) => {
        console.log("Received specific hand update:", data);
        gameState.myHand = data.hand || [];
        updateMyHand(); 
    });
    socket.on('cardPlayed', (data) => { handleCardPlayed(data); });
    socket.on('cardDrawn', (data) => { handleCardDrawn(data); });
    socket.on('playerSaidUno', (data) => { handlePlayerSaidUno(data); });
    socket.on('gameOver', (data) => { handleGameOver(data); });
    socket.on('chatMessage', (data) => { addChatMessage(data); });
    socket.on('roomError', (data) => {
        console.error("Room Error:", data.message);
        alert(`Error: ${data.message}`);
        if (data.redirect) window.location.href = data.redirect;
    });


if (startGameButton) {
    startGameButton.addEventListener('click', async () => {
        if (!startGameButton.disabled) {
            console.log("Start game button clicked.");

            try {
                const response = await fetch(`/games/${gameId}/start`, { method: 'POST' });
                const data = await response.json();

                if (response.ok) {
                    console.log("Game started successfully:", data);
                    startGame(data.game); 
                } else {
                    console.error("Failed to start the game:", data.message);
                    alert("Failed to start the game: " + data.message);
                }
            } catch (error) {
                console.error("Error starting the game:", error);
                alert("An error occurred while starting the game.");
            }
        }
    });
}

    if (sayUnoButton) {
        sayUnoButton.addEventListener('click', () => {
            if (!sayUnoButton.disabled) {
                console.log("Say UNO button clicked.");
                socket.emit('sayUno', { roomId: gameId });
            }
        });
    }

    if (leaveRoomButton) {
        leaveRoomButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to leave the room?')) {
                console.log("Leaving room...");

                try {
                    const response = await fetch(`/games/${encodeURIComponent(gameId)}/leave`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ userId: gameState.myId }),
                    });

                    if (response.ok) {
                        console.log("Successfully left the room.");
                        socket.disconnect(); 
                        window.location.href = '/lobby'; 
                    } else {
                        const errorData = await response.json();
                        console.error("Failed to leave the room:", errorData.message);
                        alert(`Error: ${errorData.message}`);
                    }
                } catch (error) {
                    console.error("Error leaving the room:", error);
                    alert("An error occurred while trying to leave the room. Please try again.");
                }
            }
        });
    }

    if (sendMessageButton && chatMessageInput) {
        sendMessageButton.addEventListener('click', sendChatMessage);
        chatMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    }
    if (toggleChatButton && chatBodyElement) {
        toggleChatButton.addEventListener('click', () => {
            const isCollapsed = chatBodyElement.style.display === 'none';
            chatBodyElement.style.display = isCollapsed ? '' : 'none';
            toggleChatButton.textContent = isCollapsed ? '▼' : '▲';
        });
    }

    //Initial Fetch / Polling 
    let playerInterval = null;
    if (!gameState.gameStarted && gameId) {
        console.log("Starting initial fetch and polling for players...");
 
        fetchPlayers(); // Initial fetch
        if (!playerInterval) {
            playerInterval = setInterval(fetchPlayers, 10000); //Poll every 10 seconds
        }
    } else if (!gameId) {
        console.warn("Not starting player polling because gameId is invalid.");
    } else {
         console.log("Game already started (or assumed started), not polling for players.");
    }

}); 
