const amqp = require("amqplib");
const message = {
  description: "Bu bir test mesajıdır.."
};
const data = require("./data.json");
const queueName = process.argv[2] || "jobsQueue";// Kuyruk ismini komut satırından al veya varsayılan değeri kullan

connect_rabbitmq();

async function connect_rabbitmq() {
  try {
    const connection = await amqp.connect("amqp://mert:mert123@localhost");
    const channel = await connection.createChannel();
    const assertion = await channel.assertQueue(queueName);
    // Geçici bir cevap kuyruğu oluşturur
    const replyQueue = await channel.assertQueue('', { exclusive: true });

    // Her işlem için farklı ID oluşturur
    const correlationId = generateCorrelationId();
    
    // data dizisindeki her bir öğeyi işler ve mesaj olarak gönderir
    data.forEach(i => {
      message.description = i.id;
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        replyTo: replyQueue.queue, 
        correlationId: correlationId 
      });
      console.log("Gonderilen Mesaj", i.id);
    });

    // Cevap kuyruğundaki mesajları tüketmeye başlar(rpc)
    channel.consume(replyQueue.queue, (msg) => {
      if (msg.properties.correlationId === correlationId) {
        const response = JSON.parse(msg.content.toString());
        
        // Tüm kayıtların işlendiğini bildiren mesaj geldiyse, işlem tamamlanır
        if (response.message === "BÜTÜN KAYITLAR EKSİKSİZ BİR ŞEKİLDE İŞLENDİ.") {
          console.log(response.message);
          channel.close();
          connection.close();
        }
      }
    });

  } catch (error) {
    console.log("Error", error);
  }
}
// Eşsiz bir correlation ID oluşturur
function generateCorrelationId() {
  return Math.random().toString() + Date.now().toString(); 
}
