import { gameState } from "../state/gameState.js";
import { getElement, setVisibility } from "./domUtils.js";

// Available colors for wild cards
export const WILD_CARD_COLORS = ["red", "blue", "yellow", "green"];

// Show the color selector for wild cards
export const showColorSelector = () => {
  const colorSelectorElement = getElement("color-selector");
  if (!colorSelectorElement) return;

  setVisibility(colorSelectorElement, true);

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

        setVisibility(colorSelectorElement, false);
        gameState.selectedWildCard = null;
      },
      { once: true }
    );
  });
};

// Hide the color selector
export const hideColorSelector = () => {
  const colorSelectorElement = getElement("color-selector");
  if (colorSelectorElement) {
    setVisibility(colorSelectorElement, false);
  }
};

// Get color name from color code
export const getColorName = (colorCode) => {
  const colorMap = {
    "#FF0000": "red",
    "#0000FF": "blue",
    "#FFFF00": "yellow",
    "#00FF00": "green",
  };
  return colorMap[colorCode] || colorCode;
};

// Get color code from color name
export const getColorCode = (colorName) => {
  const colorMap = {
    red: "#FF0000",
    blue: "#0000FF",
    yellow: "#FFFF00",
    green: "#00FF00",
  };
  return colorMap[colorName] || colorName;
};

// Check if a color is valid for wild cards
export const isValidWildCardColor = (color) => {
  return WILD_CARD_COLORS.includes(color.toLowerCase());
};
