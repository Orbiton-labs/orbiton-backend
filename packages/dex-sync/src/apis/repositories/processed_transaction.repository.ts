import { IProcessedTransaction } from "src/@types";
import ProcessedTransactionModel from "../models/processed_transaction.model";

namespace ProcessedTransactionRepository {
  export const get = async (transactionHash: string, messageIndex: number) => {
    return ProcessedTransactionModel.findOne({
      transactionHash,
      messageIndex,
    });
  };

  export const create = async (data: IProcessedTransaction) => {
    return ProcessedTransactionModel.create({
      ...data,
    });
  };
}

export default ProcessedTransactionRepository;
