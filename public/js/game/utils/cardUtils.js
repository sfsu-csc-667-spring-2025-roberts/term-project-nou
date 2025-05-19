import { gameState } from "../state/gameState.js";

export const canPlayCard = (card) => {
  const topCard = gameState.topCard;
  if (!topCard) return true;

  const topColor =
    (topCard.type === "wild" || topCard.type === "wild_draw_four") &&
    topCard.declaredColor
      ? topCard.declaredColor
      : topCard.color;

  if (card.type === "wild" || card.type === "wild_draw_four") return true;
  if (card.color === "black") return false;

  return (
    card.color === topColor ||
    (card.type === "number" &&
      topCard.type === "number" &&
      card.value == topCard.value) ||
    (card.type !== "number" && card.type === topCard.type)
  );
};

export const formatCardDescription = (card) => {
  let cardDesc = "";
  const color = card.declaredColor || card.color;
  const typeDisplay = card.type.replace("_", " ");

  if (card.type === "number") cardDesc = `${color} ${card.value}`;
  else if (card.type === "wild") cardDesc = `Wild (chose ${color})`;
  else if (card.type === "wild_draw_four")
    cardDesc = `Wild Draw Four (chose ${color})`;
  else cardDesc = `${color} ${typeDisplay}`;
  return cardDesc;
};

export const createCardElement = (card) => {
  const cardDiv = document.createElement("div");
  const displayColor =
    (card.type === "wild" || card.type === "wild_draw_four") &&
    card.declaredColor
      ? card.declaredColor
      : card.color;
  cardDiv.className = `uno-card ${displayColor}`;
  cardDiv.dataset.type = card.type;
  if (card.type === "number") cardDiv.dataset.value = card.value;

  const innerDiv = document.createElement("div");
  innerDiv.className = "card-inner";
  const topLeftCorner = document.createElement("div");
  topLeftCorner.className = "card-corner top-left";
  const bottomRightCorner = document.createElement("div");
  bottomRightCorner.className = "card-corner bottom-right";
  const centerDiv = document.createElement("div");
  centerDiv.className = "card-center";

  let symbol = "";
  let centerContent = "";
  switch (card.type) {
    case "number":
      symbol = card.value;
      centerContent = card.value;
      break;
    case "skip":
      symbol = "⊘";
      centerContent = '<span class="symbol">⊘</span>';
      break;
    case "reverse":
      symbol = "⟲";
      centerContent = '<span class="symbol">⟲</span>';
      break;
    case "draw_two":
      symbol = "+2";
      centerContent = '<span class="symbol">+2</span>';
      break;
    case "wild":
      symbol = "";
      centerContent =
        '<div class="wild-colors"><div class="wild-red"></div><div class="wild-blue"></div><div class="wild-yellow"></div><div class="wild-green"></div></div><span class="symbol wild">Wild</span>';
      break;
    case "wild_draw_four":
      symbol = "+4";
      centerContent =
        '<div class="wild-colors"><div class="wild-red"></div><div class="wild-blue"></div><div class="wild-yellow"></div><div class="wild-green"></div></div><span class="symbol wild four">+4</span>';
      break;
    default:
      symbol = "?";
      centerContent = "?";
  }
  topLeftCorner.innerHTML = symbol;
  bottomRightCorner.innerHTML = symbol;
  centerDiv.innerHTML = centerContent;
  innerDiv.appendChild(topLeftCorner);
  innerDiv.appendChild(centerDiv);
  innerDiv.appendChild(bottomRightCorner);
  cardDiv.appendChild(innerDiv);
  return cardDiv;
};
