export class BrokerClient {
  private static instance: BrokerClient;
  private subscriptions: Map<string, Array<(msg: any) => void>> = new Map();

  private constructor() {}

  public static getInstance(): BrokerClient {
    if (!BrokerClient.instance) {
      BrokerClient.instance = new BrokerClient();
    }
    return BrokerClient.instance;
  }

  public connect(serviceName: string): Promise<void> {
    return new Promise((resolve) => {
      console.log(`[Message Broker] [${serviceName}] Connecting to Message Broker...`);
      setTimeout(() => {
        console.log(`[Message Broker] [${serviceName}] Connected successfully.`);
        resolve();
      }, 100);
    });
  }

  public publish(topic: string, message: any): void {
    console.log(`[Message Broker] Published to topic "${topic}":`, JSON.stringify(message));
    const callbacks = this.subscriptions.get(topic);
    if (callbacks) {
      callbacks.forEach((cb) => {
        setTimeout(() => cb(message), 10);
      });
    }
  }

  public subscribe(topic: string, callback: (message: any) => void): void {
    console.log(`[Message Broker] Subscribed to topic "${topic}"`);
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(callback);
  }
}
