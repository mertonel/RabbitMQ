const amqp = require("amqplib");
const queueName = process.argv[2] || "jobsQueue";
const data = require("./data.json");

// RabbitMQ bağlantısı kur ve mesaj tüketimini başlat
connect_rabbitmq();

async function connect_rabbitmq() {
  try {
    const connection = await amqp.connect("amqp://mert:mert123@localhost");
    const channel = await connection.createChannel();
    // Belirtilen kuyruk varsa oluşturur, yoksa mevcut olanı kullanı
    const assertion = await channel.assertQueue(queueName);

    console.log("Mesaj bekleniyor...");
    let totalProcessed = 0;

    // Kuyruktan mesajları tüket
    channel.consume(queueName, message => {
      const messageInfo = JSON.parse(message.content.toString());
      const userInfo = data.find(u => u.id == messageInfo.description);

      if (userInfo) {
        console.log("İşlenen Kayıt:", userInfo);
        totalProcessed++;

        // Cevap kuyruğuna kullanıcı bilgilerini gönder
        channel.sendToQueue(
          message.properties.replyTo, 
          Buffer.from(JSON.stringify({ userInfo })),
          { correlationId: message.properties.correlationId } 
        );

        
        channel.ack(message);
      }

      // Tüm kayıtlar işlendiğinde bilgi mesajı gönder
      if (totalProcessed === data.length) {
        channel.sendToQueue(
          message.properties.replyTo,
          Buffer.from(JSON.stringify({ message: "BÜTÜN KAYITLAR EKSİKSİZ BİR ŞEKİLDE İŞLENDİ." })),
          { correlationId: message.properties.correlationId } 
        );
      }
    });
  } catch (error) {
    console.log("Error", error);
  }
}
