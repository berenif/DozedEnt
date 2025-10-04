export function showCriticalError(error) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #dc3545;
    color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 10001;
    max-width: 500px;
    font-family: monospace;
    text-align: center;
  `;

  notification.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 16px;">ERROR</div>
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 12px;">Game Engine Failed to Initialize</div>
    <div style="margin-bottom: 16px; line-height: 1.4;">
      The WebAssembly game engine could not be loaded.<br>
      Please refresh the page or contact support if the issue persists.
    </div>
    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 16px;">
      Error: ${error.message}
    </div>
    <button onclick="location.reload()" style="
      background: #fff;
      color: #dc3545;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin-right: 8px;
    ">Reload Page</button>
    <button onclick="this.parentElement.remove()" style="
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    ">Continue Anyway</button>
  `;

  document.body.appendChild(notification);
}
