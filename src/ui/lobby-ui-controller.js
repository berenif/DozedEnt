/**
 * LobbyUIController handles lobby list, room details, and chat DOM updates.
 */
export class LobbyUIController {
  constructor({
    roomManager,
    onJoinRoom,
    onLeaveRoom,
    onStartRoomGame
  } = {}) {
    this.roomManager = roomManager;
    this.onJoinRoom = onJoinRoom || (() => {});
    this.onLeaveRoom = onLeaveRoom || (() => {});
    this.onStartRoomGame = onStartRoomGame || (() => {});
  }

  /**
   * Refresh the lobby rooms list.
   */
  refreshRoomsList() {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList || !this.roomManager) {
      return;
    }

    const rooms = this.roomManager.getRoomList({ hasSpace: true }) || [];

    if (rooms.length === 0) {
      roomsList.innerHTML = '<p style="color: #888;">No rooms available. Create one!</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    rooms.forEach(room => {
      const container = document.createElement('div');
      container.style.border = '1px solid #333';
      container.style.padding = '10px';
      container.style.marginBottom = '10px';
      container.style.borderRadius = '5px';

      const title = document.createElement('h4');
      title.textContent = room.name;
      title.style.margin = '0';
      title.style.color = '#4a90e2';

      const description = document.createElement('p');
      description.style.margin = '5px 0';
      description.style.color = '#888';
      description.textContent = `${room.players.length}/${room.maxPlayers} players | Mode: ${room.gameMode} | Code: ${room.code}`;

      const joinButton = document.createElement('button');
      joinButton.textContent = 'Join';
      joinButton.style.padding = '5px 10px';
      joinButton.style.background = '#4a90e2';
      joinButton.style.border = 'none';
      joinButton.style.color = '#fff';
      joinButton.style.borderRadius = '3px';
      joinButton.style.cursor = 'pointer';
      joinButton.addEventListener('click', () => this.onJoinRoom(room.id));

      container.appendChild(title);
      container.appendChild(description);
      container.appendChild(joinButton);
      fragment.appendChild(container);
    });

    roomsList.innerHTML = '';
    roomsList.appendChild(fragment);
  }

  /**
   * Render details for the selected room.
   * @param {Object} room
   */
  showRoomInfo(room) {
    const element = document.getElementById('roomInfo');
    if (!element) {
      return;
    }

    element.innerHTML = '';

    if (!room) {
      return;
    }

    const title = document.createElement('h3');
    title.textContent = `Room: ${room.name}`;

    const playerCount = document.createElement('p');
    playerCount.textContent = `Players: ${room.players.length}/${room.maxPlayers}`;

    const mode = document.createElement('p');
    mode.textContent = `Mode: ${room.gameMode}`;

    const code = document.createElement('p');
    code.textContent = `Code: ${room.code}`;

    const leaveButton = document.createElement('button');
    leaveButton.textContent = 'Leave Room';
    leaveButton.addEventListener('click', () => this.onLeaveRoom());

    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    startButton.addEventListener('click', () => this.onStartRoomGame());

    element.appendChild(title);
    element.appendChild(playerCount);
    element.appendChild(mode);
    element.appendChild(code);
    element.appendChild(leaveButton);
    element.appendChild(startButton);
  }

  /**
   * Clear room details panel.
   */
  clearRoomInfo() {
    const element = document.getElementById('roomInfo');
    if (element) {
      element.innerHTML = '';
    }
  }

  /**
   * Append a chat message.
   * @param {{playerName: string, message: string}} chatMessage
   */
  appendChatMessage(chatMessage) {
    const container = document.getElementById('chatMessages');
    if (!container) {
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.innerHTML = `<strong>${chatMessage.playerName}:</strong> ${chatMessage.message}`;
    messageElement.style.marginBottom = '5px';

    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
  }
}

export default LobbyUIController;
