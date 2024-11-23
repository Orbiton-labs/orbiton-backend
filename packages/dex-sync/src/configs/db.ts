import mongoose from "mongoose";
import process from "process";
import env from "./env";

class Database {
  static instance: Database;
  constructor() {
    this.connect();
  }

  connect() {
    mongoose.set("strictQuery", true);
    mongoose
      .connect(
        env.server.network == "testnet"
          ? `${env.server.mongoUrl}-testnet?retryWrites=true&w=majority`
          : `${env.server.mongoUrl}?retryWrites=true&w=majority`
      )
      .then((res) => {
        console.log("CONNECT TO MONGODB");
        this.countConnection();
      })
      .catch((err) => {
        throw err;
      });
  }

  countConnection() {
    const numConnection = mongoose.connections.length;
    const memoryUsage = process.memoryUsage().rss;
    setTimeout(() => {
      console.log("Num of connections:", numConnection);
      console.log("Memory usage:", memoryUsage / 1024 / 1024, "MB");
    }, 5000);
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
  }
}

const instanceMongo = Database.getInstance();
export default instanceMongo;
