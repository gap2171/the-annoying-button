const arena = document.querySelector(".arena");
const button = document.querySelector(".target");
const radiusInput = document.querySelector("#radius");
const hintInput = document.querySelector("#hint-after");
const radiusValue = document.querySelector("#radius-value");
const hintValue = document.querySelector("#hint-value");
const count = document.querySelector("#count");
const instructions = document.querySelector("#instructions");
const message = document.querySelector("#message");
const label = button.querySelector("span");
const riddle = document.querySelector("#riddle");
const riddleQuestion = document.querySelector("#riddle-question");
const answer = document.querySelector("#answer");
const choices = document.querySelector("#choices");

const HOLD_MS = 1200;
const CHOICE_COUNT = 5;
const riddles = [
  {
    question: "What five-letter word becomes shorter when you add two letters to it?",
    answer: "short",
    hint: "Try a word that describes length.",
  },
  {
    question: "What word begins and ends with E but contains only one letter?",
    answer: "envelope",
    hint: "Think about what you might find in a mailbox.",
  },
  {
    question: "What five-letter word sounds the same after you remove its last four letters?",
    answer: "queue",
    hint: "Think about waiting in line.",
  },
];
let round = 1;
let roundNumber = 1;
let riddleIndex = 0;
let solved = false;
let holdStarted = null;
let holdSource = null;
let holdFrame = null;
let realIndex = 0;

let shiftHeld = false;
let dodgeCount = 0;
let position = { x: 0.5, y: 0.5 };

function updateShift(event) {
  shiftHeld = event.shiftKey;
}

window.addEventListener("keydown", updateShift);
window.addEventListener("keyup", updateShift);
window.addEventListener("blur", () => {
  shiftHeld = false;
  stopHold();
});

function updateFeedback() {
  const hintAfter = Number(hintInput.value);
  radiusValue.textContent = radiusInput.value + " px";
  hintValue.textContent = hintAfter;
  count.textContent = "Dodges: " + dodgeCount;
  riddle.hidden = round !== 1 || solved || dodgeCount < hintAfter;
  count.hidden = round !== 1;
}

function availableSpace() {
  const padding = 12;
  return {
    padding,
    width: Math.max(0, arena.clientWidth - button.offsetWidth - 2 * padding),
    height: Math.max(0, arena.clientHeight - button.offsetHeight - 2 * padding),
  };
}

function placeButton() {
  const { padding, width, height } = availableSpace();
  button.style.left = padding + position.x * width + "px";
  button.style.top = padding + position.y * height + "px";
}

// Measure from the pointer to the nearest point on the button rectangle.
function distanceToButton(mouseX, mouseY, left, top, width, height) {
  const dx = Math.max(left - mouseX, 0, mouseX - (left + width));
  const dy = Math.max(top - mouseY, 0, mouseY - (top + height));
  return Math.hypot(dx, dy);
}

function dodge(event) {
  if (event.pointerType !== "mouse" || round !== 1) return;

  // Pointer events also carry Shift state, even if the page missed a key event.
  updateShift(event);
  if (solved && shiftHeld) return;

  const radius = Number(radiusInput.value);
  const rect = button.getBoundingClientRect();
  const { clientX, clientY } = event;
  if (distanceToButton(clientX, clientY, rect.left, rect.top, rect.width, rect.height) > radius) {
    return;
  }

  const { width, height } = availableSpace();
  const corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  const destinations = corners.filter(({ x, y }) => {
    const left = rect.left + (x - position.x) * width;
    const top = rect.top + (y - position.y) * height;
    return distanceToButton(clientX, clientY, left, top, rect.width, rect.height) > radius;
  });
  if (destinations.length === 0) return;

  position = destinations[Math.floor(Math.random() * destinations.length)];
  placeButton();
  dodgeCount += 1;
  label.textContent = "Too slow.";
  updateFeedback();
}

arena.addEventListener("pointermove", dodge);
riddle.addEventListener("submit", (event) => {
  event.preventDefault();
  if (riddle.hidden) return;
  const currentRiddle = riddles[riddleIndex];
  if (answer.value.trim().toLowerCase() !== currentRiddle.answer) {
    message.textContent = currentRiddle.hint;
    return;
  }

  solved = true;
  message.textContent = "Try holding Shift.";
  updateFeedback();
  button.focus({ preventScroll: true });
});

button.addEventListener("click", () => {
  if (round !== 1) return;
  if (!solved) {
    message.textContent = riddle.hidden ? "Make it dodge a few times first." : "Solve the riddle first.";
    return;
  }
  roundNumber += 1;
  showRound(2, "You thought that was it?");
});

function showRound(nextRound, text = "") {
  stopHold();
  round = nextRound;
  message.textContent = text;
  button.hidden = round === 3;
  choices.hidden = round !== 3;
  const challenge = [
    "Catch the button.",
    "Press and hold until the ring fills.",
    "The real button has a slightly crooked label.",
  ][round - 1];
  instructions.textContent = "Round " + roundNumber + " · " + challenge;
  label.textContent = round === 2 ? "Hold me" : "Click me";
  position = { x: 0.5, y: 0.5 };
  if (round === 3) {
    renderChoices();
    choices.firstElementChild.focus({ preventScroll: true });
  } else {
    placeButton();
  }
  updateFeedback();
}

function stopHold(impatient = false) {
  if (holdStarted === null) return;
  cancelAnimationFrame(holdFrame);
  holdStarted = null;
  holdSource = null;
  button.style.removeProperty("--progress");
  if (impatient) message.textContent = "Too impatient.";
}

function tickHold(now) {
  const progress = Math.min(1, (now - holdStarted) / HOLD_MS);
  button.style.setProperty("--progress", progress + "turn");
  if (progress === 1) {
    roundNumber += 1;
    showRound(3);
    return;
  }
  holdFrame = requestAnimationFrame(tickHold);
}

function startHold(source) {
  if (round !== 2 || holdStarted !== null) return;
  holdSource = source;
  holdStarted = performance.now();
  holdFrame = requestAnimationFrame(tickHold);
}

button.addEventListener("pointerdown", (event) => {
  if (round !== 2 || event.button !== 0 || holdStarted !== null) return;
  button.setPointerCapture(event.pointerId);
  startHold(event.pointerId);
});

button.addEventListener("pointerup", (event) => {
  if (holdSource === event.pointerId) stopHold(true);
});

for (const type of ["pointercancel", "lostpointercapture"]) {
  button.addEventListener(type, (event) => {
    if (holdSource === event.pointerId) stopHold();
  });
}

button.addEventListener("keydown", (event) => {
  if (round !== 2 || ![" ", "Enter"].includes(event.key)) return;
  event.preventDefault();
  if (!event.repeat) startHold(event.key);
});

button.addEventListener("keyup", (event) => {
  if (holdSource !== event.key) return;
  event.preventDefault();
  stopHold(true);
});

button.addEventListener("blur", () => stopHold());

function renderChoices(previousIndex) {
  // A wrong guess always moves the real button to a different position.
  const slots = Array.from({ length: CHOICE_COUNT }, (_, index) => index)
    .filter((index) => index !== previousIndex);
  realIndex = slots[Math.floor(Math.random() * slots.length)];
  choices.replaceChildren();
  for (let index = 0; index < CHOICE_COUNT; index += 1) {
    const choice = document.createElement("button");
    const choiceLabel = document.createElement("span");
    choice.className = "choice";
    choice.type = "button";
    choiceLabel.textContent = "Pick me";
    if (index === realIndex) {
      choiceLabel.className = "crooked";
      choice.setAttribute("aria-label", "Pick me, slightly crooked label");
    }
    choice.append(choiceLabel);
    choice.addEventListener("click", () => {
      if (round !== 3) return;
      if (index === realIndex) {
        riddleIndex = (riddleIndex + 1) % riddles.length;
        roundNumber += 1;
        restartRoundOne("You thought you won?");
        button.focus({ preventScroll: true });
      } else {
        message.textContent = "Wrong button. I shuffled them!";
        renderChoices(realIndex);
        choices.children[index].focus({ preventScroll: true });
      }
    });
    choices.append(choice);
  }
}

function restartRoundOne(text) {
  dodgeCount = 0;
  solved = false;
  riddle.reset();
  riddleQuestion.textContent = riddles[riddleIndex].question;
  showRound(1, text);
}

radiusInput.addEventListener("input", updateFeedback);
hintInput.addEventListener("input", updateFeedback);
document.querySelector("#reset").addEventListener("click", () => {
  roundNumber = 1;
  restartRoundOne();
});

new ResizeObserver(() => {
  if (round !== 3) placeButton();
}).observe(arena);
restartRoundOne();
