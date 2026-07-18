const info = document.createElement("div");

info.style.position = "absolute";
info.style.top = "150px";
info.style.left = "100px";
info.style.background = "black";
info.style.color = "white";
info.style.padding = "10px";
info.style.zIndex = "99999";

info.textContent =
    `Viewport: ${window.innerWidth} × ${window.innerHeight}`;

document.body.appendChild(info);