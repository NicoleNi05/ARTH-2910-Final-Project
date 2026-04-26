const bellButton = document.getElementById("bellButton");
const bellImage = document.querySelector(".layer-bell");
const scene = document.getElementById("scene");
const ticketButton = document.getElementById("ticketButton");
const speechBubble = document.getElementById("speechBubble");
const speechClose = document.getElementById("speechClose");
const speechText = document.getElementById("speechText");
const sceneButtons = document.querySelectorAll(".scene-button");
const sceneOverlay = document.getElementById("sceneOverlay");
const sceneOverlayImage = document.getElementById("sceneOverlayImage");
const sceneOverlayTitle = document.getElementById("sceneOverlayTitle");
const sceneOverlayDescription = document.getElementById("sceneOverlayDescription");
const sceneOverlayClose = document.getElementById("sceneOverlayClose");
const musicStatus = document.getElementById("musicStatus");
const passengerButtons = document.querySelectorAll(".hotspot-passenger");
const thoughtBubbles = document.querySelectorAll(".thought-bubble");

const audio = new Audio("audio/The Sixth Station [qSNi0kYQH8Q].mp3");
audio.loop = true;
audio.preload = "auto";

let audioContext;
let ambientNoiseNode;
let ambientNoiseGain;
let ambientLfo;
let railPulseInterval;
let ambientStarted = false;

const passengerMemories = {
  1: [
    "dDga*(*&THCvs&^YI",
    "...",
    "I'm going home."
  ],
  2: [
    "There is only water now.",
    "...",
    "Where am I?"
  ],
  3: [
    "...I know this station.",
    "...What's its name?",
    "It seems familiar."
  ]
};

const ticketReveals = [
  "Destination: ???",
  "Destination: Swamp Bottom Station. Departure time: ???",
  "One-way ticket. Passenger count: one. Return passage not listed.",
  "Swamp Bottom Station. Arrival time: ???"
];

const trainScenes = {
  1: {
    title: "Train Scene 1",
    image: "asset/train-image1.png",
    description:
      "Chihiro's parents are eating while Chihiro explores the town.\nAs she steps onto the bridge leading to the bathhouse, a train rushes beneath it."
  },
  2: {
    title: "Train Scene 2",
    image: "asset/train-image2.png",
    description:
      "After struggling for so long to find work at the bathhouse, Chihiro finally lets her exhaustion and vulnerability show in front of the bathhouse senior she trusts.\nCut to the exterior: the train passes by.\nThe bathhouse senior leads her to her room."
  },
  3: {
    title: "Train Scene 3",
    image: "asset/train-image3.png",
    description:
      "She sits with the bathhouse senior, eating red bean buns, watching the moon, and feeling the wind.\nThe bathhouse senior says that one day she too will leave by train.\nChihiro looks at the medicine ball given by the river spirit and tightens her fist."
  }
};

let isPlaying = false;
let audioReady = false;
let warnedMissingFile = false;
let ticketRevealIndex = 0;
const passengerMemoryProgress = {
  1: 0,
  2: 0,
  3: 0
};

audio.addEventListener("canplaythrough", () => {
  audioReady = true;
});

audio.addEventListener("error", () => {
  audioReady = false;
});

document.addEventListener("pointerdown", initializeAmbientOnce, { once: true });
document.addEventListener("keydown", initializeAmbientOnce, { once: true });

bellButton.addEventListener("click", async () => {
  triggerBellSwing();
  ensureAudioContext();

  if (!isPlaying) {
    if (audioReady) {
      await audio.play();
      isPlaying = true;
      musicStatus.textContent = "The bell is ringing over the constant water-and-rail ambience.";
      return;
    }

    playBellFallback();
    isPlaying = true;
    if (!warnedMissingFile) {
      musicStatus.textContent =
        "No MP3 loaded, so this draft is using a soft bell fallback. Keep an audio file in the audio folder to replace it.";
      warnedMissingFile = true;
    } else {
      musicStatus.textContent = "Bell sound triggered. Add an MP3 anytime for the final version.";
    }
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  isPlaying = false;
  musicStatus.textContent = "Bell music paused. The ambient train-and-water layer remains.";
});

ticketButton.addEventListener("click", () => {
  playInteractionTone("ticket");
  const dialogue = ticketReveals[ticketRevealIndex];
  ticketRevealIndex = (ticketRevealIndex + 1) % ticketReveals.length;
  showBubble(getBubblePositionFromElement(ticketButton, { xOffset: 22, yOffset: 2 }), dialogue);
});

passengerButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    playInteractionTone("passenger");
    showPassengerDialogue(index + 1, button);
  });
});

thoughtBubbles.forEach((bubble) => {
  bubble.addEventListener("click", () => {
    const passengerId = Number(bubble.dataset.passenger);
    playInteractionTone("passenger");
    showPassengerDialogue(passengerId, bubble);
  });
});

sceneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playInteractionTone("ticket");
    showSceneOverlay(button.dataset.scene);
  });
});

speechClose.addEventListener("click", hidePassengerDialogue);
sceneOverlayClose.addEventListener("click", hideSceneOverlay);
sceneOverlay.addEventListener("click", (event) => {
  if (event.target === sceneOverlay) {
    hideSceneOverlay();
  }
});

document.addEventListener("click", (event) => {
  const clickedInteractive = event.target.closest(".hotspot-passenger, .thought-bubble, .speech-bubble, .hotspot-ticket, .scene-button, .scene-overlay-card, .scene-overlay-close");
  if (!clickedInteractive) {
    hidePassengerDialogue();
    hideSceneOverlay();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hidePassengerDialogue();
    hideSceneOverlay();
  }
});

function playBellFallback() {
  const context = ensureAudioContext();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 1.8);

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.8);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 1.8);

  oscillator.addEventListener("ended", () => {
    isPlaying = false;
    musicStatus.textContent = "Fallback bell finished. The ambient train-and-water layer continues underneath.";
  });
}

function triggerBellSwing() {
  if (!bellImage) {
    return;
  }

  bellImage.classList.remove("ringing");
  void bellImage.offsetWidth;
  bellImage.classList.add("ringing");
}

if (bellImage) {
  bellImage.addEventListener("animationend", (event) => {
    if (event.animationName === "bellSwing") {
      bellImage.classList.remove("ringing");
    }
  });
}

function showPassengerDialogue(passengerId, triggerElement) {
  const thoughtBubble = document.querySelector(`.thought-bubble[data-passenger="${passengerId}"]`);
  const anchor =
    thoughtBubble ||
    triggerElement ||
    document.querySelector(`.hotspot-passenger-${passengerId}`);

  const memorySet = passengerMemories[passengerId] || [];
  const currentStep = passengerMemoryProgress[passengerId] || 0;
  const dialogue = memorySet[currentStep] || "";
  passengerMemoryProgress[passengerId] = (currentStep + 1) % memorySet.length;

  const position = getBubblePositionFromElement(anchor, { xOffset: 0, yOffset: -20 });
  showBubble(position, dialogue);
}

function hidePassengerDialogue() {
  speechBubble.classList.add("hidden");
}

function showBubble(position, dialogue) {
  speechText.textContent = dialogue;
  speechBubble.style.setProperty("--bubble-left", position.left);
  speechBubble.style.setProperty("--bubble-top", position.top);
  speechBubble.classList.remove("is-entering");
  void speechBubble.offsetWidth;
  speechBubble.classList.remove("hidden");
  speechBubble.classList.add("is-entering");
}

function showSceneOverlay(sceneId) {
  const sceneData = trainScenes[sceneId];
  if (!sceneData) {
    return;
  }

  sceneOverlayImage.src = encodeURI(sceneData.image);
  sceneOverlayTitle.textContent = sceneData.title;
  sceneOverlayDescription.textContent = sceneData.description;
  sceneOverlay.classList.remove("hidden");
}

function hideSceneOverlay() {
  sceneOverlay.classList.add("hidden");
}

function getBubblePositionFromElement(element, options = {}) {
  if (!element || !scene) {
    return { left: "50%", top: "30%" };
  }

  const { xOffset = 0, yOffset = 0 } = options;
  const sceneRect = scene.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const left = ((elementRect.left - sceneRect.left) / sceneRect.width) * 100 + xOffset;
  const top = ((elementRect.top - sceneRect.top) / sceneRect.height) * 100 + yOffset;

  const clampedLeft = Math.min(Math.max(left, 3), 73);
  const clampedTop = Math.min(Math.max(top, 5), 70);

  return {
    left: `${clampedLeft}%`,
    top: `${clampedTop}%`,
  };
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function startAmbientSoundscape() {
  if (ambientStarted) {
    return;
  }

  const context = ensureAudioContext();
  ambientStarted = true;

  if (!ambientNoiseNode) {
    const bufferSize = context.sampleRate * 2;
    const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    ambientNoiseNode = context.createBufferSource();
    ambientNoiseNode.buffer = noiseBuffer;
    ambientNoiseNode.loop = true;

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 340;

    ambientNoiseGain = context.createGain();
    ambientNoiseGain.gain.setValueAtTime(0.0001, context.currentTime);
    ambientNoiseGain.gain.exponentialRampToValueAtTime(0.042, context.currentTime + 1.8);

    ambientLfo = context.createOscillator();
    const lfoDepth = context.createGain();
    ambientLfo.frequency.value = 0.08;
    lfoDepth.gain.value = 0.008;

    ambientLfo.connect(lfoDepth);
    lfoDepth.connect(ambientNoiseGain.gain);

    ambientNoiseNode.connect(lowpass);
    lowpass.connect(ambientNoiseGain);
    ambientNoiseGain.connect(context.destination);

    ambientNoiseNode.start();
    ambientLfo.start();
  } else if (ambientNoiseGain) {
    ambientNoiseGain.gain.cancelScheduledValues(context.currentTime);
    ambientNoiseGain.gain.setValueAtTime(Math.max(ambientNoiseGain.gain.value, 0.0001), context.currentTime);
    ambientNoiseGain.gain.exponentialRampToValueAtTime(0.042, context.currentTime + 1.2);
  }

  if (!railPulseInterval) {
    railPulseInterval = window.setInterval(() => {
      playRailPulse();
    }, 2400);
  }
}

function playRailPulse() {
  if (!ambientStarted) {
    return;
  }

  const context = ensureAudioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(92, context.currentTime);
  osc.frequency.exponentialRampToValueAtTime(68, context.currentTime + 0.22);

  filter.type = "lowpass";
  filter.frequency.value = 180;

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.026, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  osc.start();
  osc.stop(context.currentTime + 0.3);
}

function playInteractionTone(type) {
  const context = ensureAudioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();

  if (type === "ticket") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.18);
  } else {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, context.currentTime + 0.14);
  }

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.22);
}

function initializeAmbientOnce() {
  ensureAudioContext();
  startAmbientSoundscape();

  if (!isPlaying) {
    musicStatus.textContent = "Ambient water-and-rail soundscape is now active. Pull the bell to layer the song on top.";
  }
}
