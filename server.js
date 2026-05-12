const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Inicialização do App e Servidor HTTP
const app = express();
const server = http.createServer(app);

// Configuração do Socket.io com CORS liberado para comunicação entre dispositivos
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos (o seu index.html deve estar em uma pasta chamada 'public')
app.use(express.static(path.join(__dirname, 'public')));

// Gerenciamento de ATMs conectados (Banco de dados em memória)
const activeAtms = new Map();

io.on('connection', (socket) => {
  console.log(`📡 Novo dispositivo conectado: ${socket.id}`);
  
  // Evento disparado quando o Terminal ATM se identifica
  socket.on('register-atm', (atmId) => {
    activeAtms.set(atmId, socket.id);
    console.log(`🏦 ATM Registrado: ${atmId} (ID de Conexão: ${socket.id})`);
  });
  
  // Limpeza ao desconectar
  socket.on('disconnect', () => {
    for (let [id, socketId] of activeAtms.entries()) {
      if (socketId === socket.id) {
        activeAtms.delete(id);
        console.log(`❌ ATM Desconectado: ${id}`);
        break;
      }
    }
  });
});

// --- ENDPOINTS DA API ---

// Rota para o Aplicativo Móvel solicitar o saque
app.post('/api/withdraw', (req, res) => {
  const { atmId, amount, userId } = req.body;
  
  console.log(`💰 Solicitação de Saque: Usuário ${userId} -> ATM ${atmId} | Valor: R$ ${amount}`);
  
  // Busca o socket ID do ATM que o usuário escaneou
  const atmSocketId = activeAtms.get(atmId);
  
  if (atmSocketId) {
    // Envia o comando em tempo real apenas para o ATM específico
    io.to(atmSocketId).emit('release-cash', {
      amount: amount,
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json({
      success: true,
      message: "Comando enviado! Aguarde a saída do dinheiro no caixa."
    });
  } else {
    return res.status(404).json({
      success: false,
      message: "Erro: Este Terminal ATM está offline ou não existe."
    });
  }
});

// Porta dinâmica para hospedagem (Render, Heroku, etc) ou 3000 local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});