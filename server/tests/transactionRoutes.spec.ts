import request from "supertest";
import express, { Express } from "express";
import transactionRoutes from "../src/routes/transactionRoutes";
import { Transaction } from "../src/models/transaction";

// 👇 Mock the Mongoose model
jest.mock("../src/models/transaction");

const app: Express = express();
app.use(express.json());
app.use("/api/transactions", transactionRoutes);

type TransactionDoc = {
  _id: string;
  user_id: string;
  event_id: string;
  ticket_quantity: number;
  save?: jest.Mock;
};

// Helper function to build a properly typed mock chain for mongoose find()
const mockMongooseFind = (resolvedValue: any) => {
  const mockExec = jest.fn().mockResolvedValue(resolvedValue);
  const mockPopulate = jest.fn().mockReturnThis();

  (Transaction.find as unknown as jest.Mock).mockReturnValue({
    populate: mockPopulate,
    exec: mockExec,
  });

  return { mockExec, mockPopulate };
};

describe("Transaction Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------
  // POST /api/transactions
  // -----------------------------
  it("should create a new transaction successfully", async () => {
    const mockTransaction: TransactionDoc = {
      _id: "t1",
      user_id: "u123",
      event_id: "e456",
      ticket_quantity: 2,
      save: jest.fn().mockResolvedValue(true),
    };

    (Transaction as unknown as jest.Mock).mockImplementation(() => mockTransaction);

    const res = await request(app)
      .post("/api/transactions")
      .send({
        user_id: "u123",
        event_id: "e456",
        ticket_quantity: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      user_id: "u123",
      event_id: "e456",
      ticket_quantity: 2,
    });
    expect(mockTransaction.save).toHaveBeenCalled();
  });

  it("should return 400 if creation fails", async () => {
    (Transaction as unknown as jest.Mock).mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error("Validation failed")),
    }));

    const res = await request(app)
      .post("/api/transactions")
      .send({ user_id: "u123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  // -----------------------------
  // GET /api/transactions
  // -----------------------------
  it("should return all transactions", async () => {
    const mockTransactions: TransactionDoc[] = [
      { _id: "t1", user_id: "u1", event_id: "e1", ticket_quantity: 1 },
      { _id: "t2", user_id: "u2", event_id: "e2", ticket_quantity: 2 },
    ];

    mockMongooseFind(mockTransactions);

    const res = await request(app).get("/api/transactions");

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
    expect(Transaction.find).toHaveBeenCalledWith({});
  });

  it("should return filtered transactions by user_id", async () => {
    const mockTransactions: TransactionDoc[] = [
      { _id: "t1", user_id: "u123", event_id: "e1", ticket_quantity: 1 },
    ];

    mockMongooseFind(mockTransactions);

    const res = await request(app).get("/api/transactions?user_id=u123");

    expect(res.status).toBe(200);
    expect(res.body.transactions[0]).toHaveProperty("user_id", "u123");
    expect(Transaction.find).toHaveBeenCalledWith({ user_id: "u123" });
  });

  it("should handle server error on GET", async () => {
    const mockExec = jest.fn().mockRejectedValue(new Error("DB error"));
    const mockPopulate = jest.fn().mockReturnThis();

    (Transaction.find as unknown as jest.Mock).mockReturnValue({
      populate: mockPopulate,
      exec: mockExec,
    });

    const res = await request(app).get("/api/transactions");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB error");
  });

  // -----------------------------
  // DELETE /api/transactions/:id
  // -----------------------------
  it("should delete a transaction successfully", async () => {
    (Transaction.findByIdAndDelete as unknown as jest.Mock).mockResolvedValue({
      _id: "t1",
      user_id: "u1",
      event_id: "e1",
    });

    const res = await request(app).delete("/api/transactions/t1");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Transaction deleted");
    expect(Transaction.findByIdAndDelete).toHaveBeenCalledWith("t1");
  });

  it("should return 404 if transaction not found", async () => {
    (Transaction.findByIdAndDelete as unknown as jest.Mock).mockResolvedValue(null);

    const res = await request(app).delete("/api/transactions/doesnotexist");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Transaction not found");
  });

  it("should handle server error on DELETE", async () => {
    (Transaction.findByIdAndDelete as unknown as jest.Mock).mockRejectedValue(
      new Error("Delete failed")
    );

    const res = await request(app).delete("/api/transactions/t1");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Delete failed");
  });
});
