// DOM utility functions

// Get an element by ID with error handling
export const getElement = (
  id,
  errorMessage = `Element with id "${id}" not found`
) => {
  const element = document.getElementById(id);
  if (!element) {
    console.error(errorMessage);
    return null;
  }
  return element;
};

// Create a new element with specified attributes
export const createElement = (tag, attributes = {}, children = []) => {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "textContent") {
      element.textContent = value;
    } else if (key === "innerHTML") {
      element.innerHTML = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Add children
  children.forEach((child) => {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
};

// Add event listener with error handling
export const addEventListener = (element, event, handler, options = {}) => {
  if (!element) {
    console.error("Cannot add event listener to null element");
    return;
  }
  element.addEventListener(event, handler, options);
};

// Remove event listener with error handling
export const removeEventListener = (element, event, handler, options = {}) => {
  if (!element) {
    console.error("Cannot remove event listener from null element");
    return;
  }
  element.removeEventListener(event, handler, options);
};

// Toggle class on element
export const toggleClass = (element, className, condition) => {
  if (!element) return;
  element.classList.toggle(className, condition);
};

// Set element visibility
export const setVisibility = (element, visible) => {
  if (!element) return;
  element.style.display = visible ? "" : "none";
};

// Clear element content
export const clearElement = (element) => {
  if (!element) return;
  element.innerHTML = "";
};

// Append child to element
export const appendChild = (parent, child) => {
  if (!parent) return;
  if (typeof child === "string") {
    parent.appendChild(document.createTextNode(child));
  } else {
    parent.appendChild(child);
  }
};

// Remove all children from element
export const removeAllChildren = (element) => {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};
