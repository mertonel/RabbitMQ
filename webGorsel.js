const http = require("http");
const amqp = require("amqplib");

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

http
  .createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RabbitMQ </title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #f4f6f9;
            color: #333;
            margin: 0;
          }
          h1 {
            text-align: center;
            color: #4caf50; /* RabbitMQ Ana Başlık */
          }
          .container {
            display: flex;
            gap: 20px;
            justify-content: center;
          }
          .column {
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            width: 45%;
            max-height: 500px;
            overflow-y: auto;
            border: 1px solid #ddd;
          }
          .column h2 {
            text-align: center;
            color: #2196f3; /* Publisher ve Consumer Başlıkları */
          }
          footer {
            text-align: center;
            margin-top: 20px;
            font-size: 0.9em;
            color: #555;
          }
        </style>
      </head>
      <body>
        <h1>RABBITMQ</h1>
        <div class="container">
          <div class="column">
            <h2>Publisher</h2>
            <div id="publisherLogs"></div>
          </div>
          <div class="column">
            <h2>Consumer</h2>
            <div id="consumerLogs"></div>
          </div>
        </div>
        <footer></footer>
        <script>
          async function fetchLogs() {
            const response = await fetch("/logs");
            const logs = await response.json();
            const publisherLogs = logs.publisher;
            const consumerLogs = logs.consumer;

            // Publisher loglarını güncelle
            const publisherContainer = document.getElementById("publisherLogs");
            publisherContainer.innerHTML = publisherLogs.map(log => "<p>" + log + "</p>").join("");

            // Consumer loglarını güncelle
            const consumerContainer = document.getElementById("consumerLogs");
            consumerContainer.innerHTML = consumerLogs.map(log => "<p>" + log + "</p>").join("");
          }
          setInterval(fetchLogs, 1000); // Her saniye logları güncelle
        </script>
      </body>
      </html>`;
      res.end(html);
    } else if (req.url === "/logs") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          publisher: sentMessages.slice(-50), 
          consumer: receivedMessages.slice(-50), 
        })
      );
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    }
  })
  .listen(3000, () => {
    console.log("Server çalışıyor: http://localhost:3000");
  });

setupRabbitMQ();
