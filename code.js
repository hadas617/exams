// window.addEventListener('load', () => {
//   map();
// });

// document.addEventListener("click", function (event) {
//   if (event.target.id === "exit" || event.target.id === "exitHover") {
//         window.close();
//     setTimeout(() => {
//       window.location.href = "about:blank"; 
//     }, 100);
//   }
// });
(() => {
  "use strict";
  const Utils = {
    parsePx: (value) => parseFloat(value.replace(/px/, "")),
    getRandomInRange: (min, max, precision = 0) => {
      const multiplier = Math.pow(10, precision);
      const randomValue = Math.random() * (max - min) + min;
      return Math.floor(randomValue * multiplier) / multiplier;
    },
    getRandomItem: (array) => array[Math.floor(Math.random() * array.length)],
    getScaleFactor: () => Math.log(window.innerWidth) / Math.log(1920),
    debounce: (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    },
  };
  const DEG_TO_RAD = Math.PI / 180;
  const defaultConfettiConfig = {
    confettiesNumber: 250,
    confettiRadius: 6,
    confettiColors: [
      "#fcf403", "#62fc03", "#f4fc03", "#03e7fc", "#03fca5", "#a503fc", "#fc03ad", "#fc03c2"
    ],
    emojies: [],
    svgIcon: null, 
  };
  class Confetti {
    constructor({ initialPosition, direction, radius, colors, emojis, svgIcon }) {
      const speedFactor = Utils.getRandomInRange(0.9, 1.7, 3) * Utils.getScaleFactor();
      this.speed = { x: speedFactor, y: speedFactor };
      this.finalSpeedX = Utils.getRandomInRange(0.2, 0.6, 3);
      this.rotationSpeed = emojis.length || svgIcon ? 0.01 : Utils.getRandomInRange(0.03, 0.07, 3) * Utils.getScaleFactor();
      this.dragCoefficient = Utils.getRandomInRange(0.0005, 0.0009, 6);
      this.radius = { x: radius, y: radius };
      this.initialRadius = radius;
      this.rotationAngle = direction === "left" ? Utils.getRandomInRange(0, 0.2, 3) : Utils.getRandomInRange(-0.2, 0, 3);
      this.emojiRotationAngle = Utils.getRandomInRange(0, 2 * Math.PI);
      this.radiusYDirection = "down";
      const angle = direction === "left" ? Utils.getRandomInRange(82, 15) * DEG_TO_RAD : Utils.getRandomInRange(-15, -82) * DEG_TO_RAD;
      this.absCos = Math.abs(Math.cos(angle));
      this.absSin = Math.abs(Math.sin(angle));
      const offset = Utils.getRandomInRange(-150, 0);
      const position = {
        x: initialPosition.x + (direction === "left" ? -offset : offset) * this.absCos,
        y: initialPosition.y - offset * this.absSin
      };
      this.position = { ...position };
      this.initialPosition = { ...position };
      this.color = emojis.length || svgIcon ? null : Utils.getRandomItem(colors);
      this.emoji = emojis.length ? Utils.getRandomItem(emojis) : null;
      this.svgIcon = null;
      if (svgIcon) {
        this.svgImage = new Image();
        this.svgImage.src = svgIcon;
        this.svgImage.onload = () => {
          this.svgIcon = this.svgImage; 
        };
      }
      this.createdAt = Date.now();
      this.direction = direction;
    }
    draw(context) {
      const { x, y } = this.position;
      const { x: radiusX, y: radiusY } = this.radius;
      const scale = window.devicePixelRatio;

      if (this.svgIcon) {
        context.save();
        context.translate(scale * x, scale * y);
        context.rotate(this.emojiRotationAngle);
        context.drawImage(this.svgIcon, -radiusX, -radiusY, radiusX * 2, radiusY * 2);
        context.restore();
      } else if (this.color) {
        context.fillStyle = this.color;
        context.beginPath();
        context.ellipse(x * scale, y * scale, radiusX * scale, radiusY * scale, this.rotationAngle, 0, 2 * Math.PI);
        context.fill();
      } else if (this.emoji) {
        context.font = `${radiusX * scale}px serif`;
        context.save();
        context.translate(scale * x, scale * y);
        context.rotate(this.emojiRotationAngle);
        context.textAlign = "center";
        context.fillText(this.emoji, 0, radiusY / 2); 
        context.restore();
      }
    }
    updatePosition(deltaTime, currentTime) {
      const elapsed = currentTime - this.createdAt;
      if (this.speed.x > this.finalSpeedX) {
        this.speed.x -= this.dragCoefficient * deltaTime;
      }
      this.position.x += this.speed.x * (this.direction === "left" ? -this.absCos : this.absCos) * deltaTime;
      this.position.y = this.initialPosition.y - this.speed.y * this.absSin * elapsed + 0.00125 * Math.pow(elapsed, 2) / 2;
      if (!this.emoji && !this.svgIcon) {
        this.rotationSpeed -= 1e-5 * deltaTime;
        this.rotationSpeed = Math.max(this.rotationSpeed, 0);
        if (this.radiusYDirection === "down") {
          this.radius.y -= deltaTime * this.rotationSpeed;
          if (this.radius.y <= 0) {
            this.radius.y = 0;
            this.radiusYDirection = "up";
          }
        } else {
          this.radius.y += deltaTime * this.rotationSpeed;
          if (this.radius.y >= this.initialRadius) {
            this.radius.y = this.initialRadius;
            this.radiusYDirection = "down";
          }
        }
      }
    }
    isVisible(canvasHeight) {
      return this.position.y < canvasHeight + 100;
    }
  }
  class ConfettiManager {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; pointer-events: none;";
      document.body.appendChild(this.canvas);
      this.context = this.canvas.getContext("2d");
      this.confetti = [];
      this.lastUpdated = Date.now();
      window.addEventListener("resize", Utils.debounce(() => this.resizeCanvas(), 200));
      this.resizeCanvas();
      requestAnimationFrame(() => this.loop());
    }
    resizeCanvas() {
      this.canvas.width = window.innerWidth * window.devicePixelRatio;
      this.canvas.height = window.innerHeight * window.devicePixelRatio;
    }
    addConfetti(config = {}) {
      const { confettiesNumber, confettiRadius, confettiColors, emojies, svgIcon } = {
        ...defaultConfettiConfig,
        ...config,
      };
      const baseY = (5 * window.innerHeight) / 7;
      for (let i = 0; i < confettiesNumber / 2; i++) {
        this.confetti.push(new Confetti({
          initialPosition: { x: 0, y: baseY },
          direction: "right",
          radius: confettiRadius,
          colors: confettiColors,
          emojis: emojies,
          svgIcon,
        }));
        this.confetti.push(new Confetti({
          initialPosition: { x: window.innerWidth, y: baseY },
          direction: "left",
          radius: confettiRadius,
          colors: confettiColors,
          emojis: emojies,
          svgIcon,
        }));
      }
    }
    resetAndStart(config = {}) {
      this.confetti = [];
      this.addConfetti(config);
    }
    loop() {
      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastUpdated;
      this.lastUpdated = currentTime;
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.confetti = this.confetti.filter((item) => {
        item.updatePosition(deltaTime, currentTime);
        item.draw(this.context);
        return item.isVisible(this.canvas.height);
      });
      requestAnimationFrame(() => this.loop());
    }
  }
const manager = new ConfettiManager();

window.addEventListener("load", () => {
  const confettiInterval = setInterval(() => {
    manager.addConfetti({
      confettiesNumber: 50
    });
  }, 250);
  setTimeout(() => {
    clearInterval(confettiInterval);
    manager.confetti = [];
    manager.canvas.remove();
    makingbd();
  }, 3000);
  });
})();

function makingbd() {
    document.getElementById("start").style.display = "none";

    const makingBd = document.getElementById("makingBd");

    makingBd.style.visibility = "visible";
    makingBd.style.display = "block";

    document.getElementById("momBallom").style.animation =
        "fadeIn .25s forwards 0s";

    document.getElementById("shmuelBallon").style.animation =
        "fadeIn .25s forwards 1s";

    document.getElementById("hadasClown").style.animation =
        "fadeIn .25s forwards 2s";

    document.getElementById("miriamEat").style.animation =
        "fadeIn .25s forwards 3s";

    setTimeout(() => {
        makingBd.style.display = "none";
        dadCake();
    }, 5000);
}

function dadCake() {
  document.getElementById('arrow').addEventListener('click',sea)
  const dadBd = document.getElementById("dadBd");
  dadBd.style.display = "block";
  dadBd.style.visibility = "visible";
  document.getElementById("dadBd").style.display = "block";
  const balloonContainer =document.getElementById("balloon-container");
  function random(num) {
    return Math.floor(Math.random() * num);
  }
  function getRandomStyles() {
      const r = random(255);
      const g = random(255);
      const b = random(255);
      const delay = Math.random() * 5;
      const dur = random(3) + 2;
  return `
      background-color: rgba(${r},${g},${b},0.7);
      color: rgba(${r},${g},${b},0.7);
      box-shadow: inset -7px -3px 10px rgba(${Math.max(r-10,0)},${Math.max(g-10,0)},${Math.max(b-10,0)},0.7);
      animation: float ${dur}s linear infinite;
      animation-delay: ${delay}s;
  `;
  }
  function createBalloons(num) {
    balloonContainer.innerHTML = "";
    for (let i = 0; i < num; i++) {
        const balloon = document.createElement("div");
        balloon.className = "balloon";
        balloon.style.cssText = getRandomStyles();
        balloon.style.position = "absolute";
        balloon.style.left = Math.random() * 95 + "vw";
        balloon.style.bottom = "-150px";
        balloonContainer.appendChild(balloon);
      }
    }
 createBalloons(30);
}

function sea() {
  document.getElementById("dadBd").style.display = 'none';
  document.body.style.backgroundColor = 'rgb(135, 204, 247)';
  document.getElementById("sea").style.display = "block";
  setTimeout(() => {
    map();
  }, 6000);
}

function map() {
  document.body.style.backgroundColor = 'rgb(206, 233, 250)';
  document.getElementById('start').style.display = 'none';
  document.getElementById("sea").style.display = "none";
  document.getElementById("map").style.display = "block";
}