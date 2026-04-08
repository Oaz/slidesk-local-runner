window.slidesk = {
  currentSlide: 0,
  slides: [],
  animationTimer: 300,
  onSlideChange: () => {},
  env: {},
  lastAction: "",
  domain: "localhost",
  channel: null
};

window.slidesk.save = true;

// Setup BroadcastChannel for cross-window communication
window.slidesk.setupChannel = () => {
  if (!window.slidesk.channel) {
    window.slidesk.channel = new BroadcastChannel('slidesk_sync');
    window.slidesk.channel.onmessage = (event) => {
      const data = event.data;
      if (data.action === "goto" && window.location.hostname !== window.slidesk.domain && window.location.hostname !== "localhost") {
        window.slidesk.goto(data.payload);
      } else if (window.slidesk[data.action]) {
        window.slidesk[data.action](data);
      }
    };
  }
};

window.slidesk.sendMessage = (payload) => {
  if (window.slidesk.channel) {
    window.slidesk.channel.postMessage(payload);
  }
};

window.slidesk.cleanOldSlide = (id) => {
  window.slidesk.slides[id].classList.remove("sd-current", "no-sd-animation");
};

window.slidesk.changeSlide = () => {
  window.slidesk.slides[window.slidesk.currentSlide].classList.remove("sd-previous");
  window.slidesk.slides[window.slidesk.currentSlide].classList.add("sd-current");
  window.location.hash = window.slidesk.currentSlide;
  
  // Save current state to localStorage for notes view
  const slideData = {
    currentSlideHTML: window.slidesk.slides[window.slidesk.currentSlide].outerHTML,
    futureSlideHTML: window.slidesk.currentSlide !== window.slidesk.slides.length - 1 
      ? window.slidesk.slides[window.slidesk.currentSlide + 1].outerHTML 
      : "",
    currentSlideNum: window.slidesk.currentSlide,
    totalSlides: window.slidesk.slides.length,
    timestamp: Date.now()
  };
  localStorage.setItem('slidesk_current_slide', JSON.stringify(slideData));
  
  // Send via BroadcastChannel if notes window is open
  window.slidesk.sendMessage({
    action: "current",
    payload: window.slidesk.slides[window.slidesk.currentSlide].outerHTML.replace(/data-source="(^")"/gi, "")
  });
  
  window.slidesk.sendMessage({
    action: "future",
    payload: window.slidesk.currentSlide !== window.slidesk.slides.length - 1
      ? window.slidesk.slides[window.slidesk.currentSlide + 1].outerHTML.replace(/data-source="(^")"/gi, "")
      : ""
  });
  
  window.slidesk.sendMessage({
    action: "goto",
    payload: window.slidesk.currentSlide
  });

  window.slidesk.slides[window.slidesk.currentSlide]
    .querySelectorAll(".sd-img img")
    .forEach((i, _) => {
      i.setAttribute("style", "");
      i.setAttribute("src", i.getAttribute("data-src"));
    });
  window.slidesk.onSlideChange();
};

// Save timer checkpoints to localStorage
window.slidesk.saveCheckpoints = () => {
  const timerCheckpoints = {};
  window.slidesk.slides.forEach((slide, idx) => {
    timerCheckpoints[idx] = slide.getAttribute("data-timer-checkpoint");
  });
  localStorage.setItem('slidesk_checkpoints', JSON.stringify({
    timerCheckpoints,
    nbSlides: window.slidesk.slides.length
  }));
};

window.slidesk.next = () => {
  if (window.slidesk.currentSlide !== window.slidesk.slides.length - 1) {
    window.slidesk.lastAction = "next";
    window.slidesk.cleanOldSlide(window.slidesk.currentSlide);
    window.slidesk.slides[window.slidesk.currentSlide].classList.add("sd-previous");
    window.slidesk.currentSlide += 1;
    window.slidesk.changeSlide();
    window.slidesk.saveCheckpoints();
  }
};

window.slidesk.previous = () => {
  if (window.slidesk.currentSlide !== 0) {
    window.slidesk.lastAction = "previous";
    window.slidesk.cleanOldSlide(window.slidesk.currentSlide);
    window.slidesk.currentSlide -= 1;
    window.slidesk.changeSlide();
    window.slidesk.saveCheckpoints();
  }
};

window.slidesk.goto = (num) => {
  const n = num.data ?? num;
  if (n >= 0 && n < window.slidesk.slides.length) {
    window.slidesk.cleanOldSlide(window.slidesk.currentSlide);
    window.slidesk.slides.forEach((s, i) => {
      if (i < n) s.classList.add("sd-previous");
      else s.classList.remove("sd-previous");
    });
    window.slidesk.currentSlide = n;
    window.slidesk.changeSlide();
    window.slidesk.saveCheckpoints();
  }
};

window.slidesk.fullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
};

window.onload = () => {
  window.slidesk.setupChannel();
  window.slidesk.slides = document.querySelectorAll(".sd-slide");
  
  // Save checkpoints on load
  window.slidesk.saveCheckpoints();
  
  const loadingHash = window.location.hash.replace("#", "");
  window.slidesk.currentSlide = Number(loadingHash) ?? 0;
  if (window.slidesk.currentSlide < 0) window.slidesk.currentSlide = 0;
  if (window.slidesk.currentSlide) {
    for (let i = 0; i < window.slidesk.currentSlide; i += 1) {
      window.slidesk.slides[i].classList.add("sd-previous", "no-sd-animation");
    }
    setTimeout(() => {
      for (let i = 0; i < window.slidesk.currentSlide; i += 1) {
        window.slidesk.slides[i].classList.remove("no-sd-animation");
      }
    }, window.slidesk.animationTimer);
  }
  window.slidesk.slides[window.slidesk.currentSlide].classList.add("sd-current", "no-sd-animation");
  
  document.querySelectorAll(".sd-img img").forEach((img, _) => {
    img.addEventListener("load", () => {
      let ratio = 1;
      if (Number(window.slidesk.env.WIDTH))
        ratio = window.innerWidth / Number(window.slidesk.env.WIDTH);
      const newW = `${ratio * img.width}px`;
      const newH = `${ratio * img.height}px`;
      img.parentElement.style.width = newW;
      img.parentElement.style.height = newH;
      img.style.width = newW;
      img.style.height = newH;
    });
  });
  window.slidesk.changeSlide();
  
  document.querySelectorAll(".sd-slide").forEach((slide, _) => {
    slide.addEventListener("touchstart", (e) => {
      e.preventDefault();
      window.slidesk.touchStart = e.touches[0].pageX;
      window.slidesk.touchMove = e.touches[0].pageX;
    });
    slide.addEventListener("touchmove", (e) => {
      window.slidesk.touchMove = e.touches[0].pageX;
    });
    slide.addEventListener("touchend", (_) => {
      if (Math.abs(window.slidesk.touchMove - window.slidesk.touchStart) > 100) {
        if (window.slidesk.touchMove > window.slidesk.touchStart)
          window.slidesk.previous();
        else window.slidesk.next();
      }
      window.slidesk.touchStart = 0;
    });
  });
  
  window.slidesk.timeoutResize = false;
  window.addEventListener("resize", () => {
    clearTimeout(window.slidesk.timeoutResize);
    window.slidesk.timeoutResize = setTimeout(() => {
      window.location.reload();
    }, 250);
  });
};

document.addEventListener("keydown", (e) => {
  if (window.location.hostname === window.slidesk.domain || window.location.hostname === "localhost" || window.slidesk.save) {
    if (e.key === "ArrowLeft") {
      window.slidesk.previous();
    } else if (e.key === "ArrowRight") {
      window.slidesk.next();
    }
  }
});

let timeoutMouse = null;
const hideMouse = () => {
  document.querySelector(".sd-app").style.cursor = "none";
};

document.addEventListener("mousemove", () => {
  clearTimeout(timeoutMouse);
  timeoutMouse = setTimeout(() => {
    hideMouse();
  }, 250);
  document.querySelector(".sd-app").style.cursor = "default";
});
