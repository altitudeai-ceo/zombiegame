const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingPlayers = [];
let games = [];

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
  socket.on('signup', (data) => {
    const player = { id: socket.id, email: data.email, username: data.username, x: 100, y: 100, score: 0 };
    waitingPlayers.push(player);

    if (waitingPlayers.length >= 2) {
      const playersInGame = waitingPlayers.splice(0, 4);
      const game = { players: playersInGame, zombies: [], round: 1, id: games.length };
      games.push(game);

      playersInGame.forEach((player) => {
        io.to(player.id).emit('match_found');
      });

      startGame(game);
    }
  });

  socket.on('player_move', (data) => {
    const game = games.find(g => g.players.some(p => p.id === socket.id));
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (data.key === 'ArrowUp') player.y -= 5;
    if (data.key === 'ArrowDown') player.y += 5;
    if (data.key === 'ArrowLeft') player.x -= 5;
    if (data.key === 'ArrowRight') player.x += 5;

    io.to(game.id).emit('game_state', game);
  });
});

function startGame(game) {
  setInterval(() => {
    if (game.zombies.length < game.round * 5) {
      game.zombies.push({ x: Math.random() * 800, y: Math.random() * 600 });
    }

    game.zombies.forEach(zombie => {
      game.players.forEach(player => {
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
          player.score -= 10; // Penalty for being hit
        } else {
          if (dx > 0) zombie.x += 1;
          if (dx < 0) zombie.x -= 1;
          if (dy > 0) zombie.y += 1;
          if (dy < 0) zombie.y -= 1;
        }
      });
    });

    io.to(game.id).emit('game_state', game);
    game.round += 1;
  }, 2000);
}

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
