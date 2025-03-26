const http = require("http");
const amqp = require("amqplib");
const WebSocket = require("ws");
const StompServer = require("@stomp/stompjs");
const SockJS = require("sockjs-client");

const queueName = "jobsQueue";
let sentMessages = [];
let receivedMessages = [];

async function connectRabbitMQ() {
  const connection = await amqp.connect("amqp://localhost:5672");
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName);
  return { connection, channel };
}

async function setupRabbitMQ() {
  try {
    const { channel } = await connectRabbitMQ();

    setInterval(() => {
      const message = { description: `Publisher mesajı: ${Date.now()}` };
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
      sentMessages.push(message.description);
    }, 5000);

    channel.consume(
      queueName,
      (message) => {
        const content = JSON.parse(message.content.toString());
        receivedMessages.push(content.description);
        channel.ack(message); 
      },
      { noAck: false }
    );
  } catch (error) {
    console.error("RabbitMQ bağlantı hatası:", error);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(/* HTML İçeriği */);
  } else if (req.url === "/ws") {
    const wsServer = new WebSocket.Server({ noServer: true });
    wsServer.on('connection', socket => {
      socket.on('message', message => {
        console.log(message);
      });

      setInterval(() => {
        socket.send(JSON.stringify({
          publisher: sentMessages.slice(-50),
          consumer: receivedMessages.slice(-50),
        }));
      }, 1000);
    });
    server.on("upgrade", (request, socket, head) => {
      wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit("connection", ws, request);
      });
    });
  }
}).listen(3001, () => {
  console.log("WebSocket Server çalışıyor: http://localhost:3000");
});

setupRabbitMQ();
