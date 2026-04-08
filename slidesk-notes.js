window.slidesk = {
  timer: document.querySelector("#sd-sv-timer"),
  subtimer: document.querySelector("#sd-sv-subtimer"),
  scrollPosition: 0,
  channel: null,
  checkpoints: null,
  presentationPath: null, // Store the path to the presentation
  onSpeakerViewSlideChange: () => {
    window.slidesk.scrollPosition = 0;
  }
};

const toHHMMSS = (secs) => {
  const secnum = Number.parseInt(Math.abs(secs), 10);
  return [Math.floor(secnum / 3600), Math.floor(secnum / 60) % 60, secnum % 60]
    .map((v) => v.toString().padStart(2, "0"))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

const fromHHMMSS = (time) => {
  const hhmmss = time.split(":");
  if (hhmmss.length === 3) {
    return 3600 * Number.parseInt(hhmmss[0], 10) + 60 * Number.parseInt(hhmmss[1], 10) + Number.parseInt(hhmmss[2], 10);
  }
  return 60 * Number.parseInt(hhmmss[0], 10) + Number.parseInt(hhmmss[1], 10);
};

let timerCheckpoints = [];
let timerSlide = "";
let startTime = null;
let startSlideTime = null;
let currentNum = null;

// Get the presentation path from the current location
window.slidesk.getPresentationPath = () => {
  const currentPath = window.location.pathname;
  // If we're in a notes.html file, replace 'notes.html' with 'index.html'
  // or whatever the presentation file is named
  if (currentPath.endsWith('notes.html')) {
    return currentPath.replace('notes.html', 'index.html');
  }
  // Fallback: assume index.html in the same directory
  return currentPath.substring(0, currentPath.lastIndexOf('/') + 1) + 'index.html';
};

// Setup BroadcastChannel for receiving updates from slides
window.slidesk.setupChannel = () => {
  window.slidesk.channel = new BroadcastChannel('slidesk_sync');
  window.slidesk.channel.onmessage = (event) => {
    const data = event.data;
    if (data.action === "current") {
      timerSlide = "";
      startSlideTime = null;
      const current = document.querySelector("#sd-sv-current");
      current.innerHTML = data.payload.replaceAll("img data-src=", "img src=");
      document.querySelector("#sd-sv-notes").innerHTML = [
        ...current.querySelectorAll("aside.sd-notes"),
      ].map((a) => decodeURIComponent(atob(a.innerHTML).replace(/[\x80-\uffff]/g, (m) => `%${m.charCodeAt(0).toString(16).padStart(2, "0")}`))).join("");
      
      currentNum = current.querySelector(".sd-slide")?.getAttribute("data-num");
      
      // check timers
      const slidetime = current.querySelector(".sd-slide")?.getAttribute("data-timer-slide");
      if (slidetime) {
        timerSlide = fromHHMMSS(slidetime);
        startSlideTime = Date.now();
      }
      window.slidesk.onSpeakerViewSlideChange();
    } else if (data.action === "future") {
      document.querySelector("#sd-sv-future").innerHTML = data.payload.replaceAll("img data-src=", "img src=");
    } else if (data.action === "goto") {
      // Sync current slide number
      const slideNum = data.payload;
      if (slideNum !== undefined && window.slidesk.checkpoints) {
        // Update checkpoint reference
        currentNum = slideNum;
      }
    }
  };
};

// Load initial state from localStorage
window.slidesk.loadInitialState = () => {
  const savedSlide = localStorage.getItem('slidesk_current_slide');
  if (savedSlide) {
    const slideData = JSON.parse(savedSlide);
    const current = document.querySelector("#sd-sv-current");
    current.innerHTML = slideData.currentSlideHTML.replaceAll("img data-src=", "img src=");
    document.querySelector("#sd-sv-future").innerHTML = slideData.futureSlideHTML.replaceAll("img data-src=", "img src=");
    document.querySelector("#sd-sv-notes").innerHTML = [
      ...current.querySelectorAll("aside.sd-notes"),
    ].map((a) => decodeURIComponent(atob(a.innerHTML).replace(/[\x80-\uffff]/g, (m) => `%${m.charCodeAt(0).toString(16).padStart(2, "0")}`))).join("");
    
    currentNum = current.querySelector(".sd-slide")?.getAttribute("data-num");
    
    const slidetime = current.querySelector(".sd-slide")?.getAttribute("data-timer-slide");
    if (slidetime) {
      timerSlide = fromHHMMSS(slidetime);
      startSlideTime = Date.now();
    }
  }
  
  // Load checkpoints
  const savedCheckpoints = localStorage.getItem('slidesk_checkpoints');
  if (savedCheckpoints) {
    const checkpointsData = JSON.parse(savedCheckpoints);
    let lastCheckpoint = null;
    for (let i = Number(checkpointsData.nbSlides); i >= 0; i -= 1) {
      if (checkpointsData.timerCheckpoints[i]) {
        lastCheckpoint = fromHHMMSS(checkpointsData.timerCheckpoints[i]);
      }
      timerCheckpoints[i] = lastCheckpoint;
    }
    window.slidesk.checkpoints = timerCheckpoints;
  }
};

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    // Send previous action via BroadcastChannel
    if (window.slidesk.channel) {
      window.slidesk.channel.postMessage({ action: "previous" });
    }
  } else if (e.key === "ArrowRight") {
    // Send next action via BroadcastChannel
    if (window.slidesk.channel) {
      window.slidesk.channel.postMessage({ action: "next" });
    }
  }
});

const svgOpen = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" /></svg>';

const viewOpen = (screen, presentationUrl) => {
  window.open(presentationUrl, "_blank", 
    `left=${screen.availLeft},
    top=${screen.availTop},
    width=${screen.availWidth},
    height=${screen.availHeight},
    fullscreen=yes,
    location=no,
    menubar=no,
    status=no,
    scrollsbar=no,
    titlebar=no,
    toolbar=no,
    popup`
  );
};

window.slidesk.createButtons = async () => {
  const $screenWrapper = document.getElementById("sd-open-presentation");
  $screenWrapper.innerHTML = "";
  
  // Get the correct presentation path
  const presentationUrl = window.slidesk.getPresentationPath();
  
  if (window.getScreenDetails) {
    try {
      const { screens } = await window.getScreenDetails();
      screens.forEach((screen) => {
        const button = document.createElement("button");
        button.innerHTML = `${svgOpen}<span>Open presentation on <b>${screen.label}</b></span>`;
        button.addEventListener("click", () => viewOpen(screen, presentationUrl));
        $screenWrapper.appendChild(button);
      });
    } catch (error) {
      console.warn("Could not get screen details:", error);
      // Fallback to simple button
      const button = document.createElement("button");
      button.innerHTML = `${svgOpen}<span>Open presentation in new window</span>`;
      button.addEventListener("click", () => window.open(presentationUrl, "_blank"));
      $screenWrapper.appendChild(button);
    }
  } else {
    // Fallback for browsers without getScreenDetails
    const button = document.createElement("button");
    button.innerHTML = `${svgOpen}<span>Open presentation in new window</span>`;
    button.addEventListener("click", () => window.open(presentationUrl, "_blank"));
    $screenWrapper.appendChild(button);
  }
};

window.slidesk.notes_up = () => {
  window.slidesk.scrollPosition -= 100;
  if (window.slidesk.scrollPosition < 0) window.slidesk.scrollPosition = 0;
  document.getElementById("sd-sv-notes").scroll({ top: window.slidesk.scrollPosition });
};

window.slidesk.notes_down = () => {
  window.slidesk.scrollPosition += 100;
  document.getElementById("sd-sv-notes").scroll({ top: window.slidesk.scrollPosition });
};

window.slidesk.start_timer = () => {
  startTime = Date.now();
};

setInterval(() => {
  if (startTime) {
    const time = (Date.now() - startTime) / 1000;
    window.slidesk.timer.innerText = toHHMMSS(time);
    window.slidesk.timer.classList.remove("emergency");
    if (timerCheckpoints[currentNum] && timerCheckpoints[currentNum] < time) {
      window.slidesk.timer.classList.add("emergency");
    }
  }
  if (startSlideTime) {
    const subtime = (Date.now() - startSlideTime) / 1000;
    window.slidesk.subtimer.innerText = toHHMMSS(timerSlide - subtime + 1);
    window.slidesk.subtimer.style.display = "block";
    window.slidesk.subtimer.classList.remove("emergency");
    if (subtime >= timerSlide) {
      window.slidesk.subtimer.classList.add("emergency");
    }
  } else {
    window.slidesk.subtimer.style.display = "none";
  }
}, 1000);

window.slidesk.timer.addEventListener("click", () => {
  window.slidesk.start_timer();
});

// Initialize
window.slidesk.presentationPath = window.slidesk.getPresentationPath();
window.slidesk.setupChannel();
window.slidesk.loadInitialState();

// Listen for localStorage changes from the presentation
window.addEventListener('storage', (event) => {
  if (event.key === 'slidesk_current_slide' && event.newValue) {
    const slideData = JSON.parse(event.newValue);
    const current = document.querySelector("#sd-sv-current");
    current.innerHTML = slideData.currentSlideHTML.replaceAll("img data-src=", "img src=");
    document.querySelector("#sd-sv-future").innerHTML = slideData.futureSlideHTML.replaceAll("img data-src=", "img src=");
    document.querySelector("#sd-sv-notes").innerHTML = [
      ...current.querySelectorAll("aside.sd-notes"),
    ].map((a) => decodeURIComponent(atob(a.innerHTML).replace(/[\x80-\uffff]/g, (m) => `%${m.charCodeAt(0).toString(16).padStart(2, "0")}`))).join("");
    
    currentNum = current.querySelector(".sd-slide")?.getAttribute("data-num");
    
    const slidetime = current.querySelector(".sd-slide")?.getAttribute("data-timer-slide");
    if (slidetime) {
      timerSlide = fromHHMMSS(slidetime);
      startSlideTime = Date.now();
    }
  } else if (event.key === 'slidesk_checkpoints' && event.newValue) {
    const checkpointsData = JSON.parse(event.newValue);
    let lastCheckpoint = null;
    for (let i = Number(checkpointsData.nbSlides); i >= 0; i -= 1) {
      if (checkpointsData.timerCheckpoints[i]) {
        lastCheckpoint = fromHHMMSS(checkpointsData.timerCheckpoints[i]);
      }
      timerCheckpoints[i] = lastCheckpoint;
    }
  }
});