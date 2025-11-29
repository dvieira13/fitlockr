import request from "supertest";
import express from "express";
import router from "../src/routes/eventRoutes";
import { Event } from "../src/models/event";

jest.mock("../src/models/event"); // mock the module

const app = express();
app.use(express.json());
app.use("/api/events", router);

describe("Event Routes", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/events", () => {
    it("should create a new event (positive)", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      (Event as any).mockImplementation(() => ({
        save: mockSave,
        _id: "1",
        name: "Concert",
      }));

      const res = await request(app)
        .post("/api/events")
        .send({ name: "Concert" });

      expect(res.status).toBe(201);
      expect(res.body.event).toEqual({
        _id: "1",
        name: "Concert",
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it("should return 400 if save fails (negative)", async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error("DB error"));
      (Event as any).mockImplementation(() => ({ save: mockSave }));

      const res = await request(app).post("/api/events").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("DB error");
    });
  });

  describe("GET /api/events", () => {
    it("should return all events (positive)", async () => {
      // Mock static method find
      (Event.find as jest.Mock) = jest.fn().mockResolvedValue([{ name: "Event1" }]);
      const res = await request(app).get("/api/events");
      expect(res.status).toBe(200);
      expect(res.body.events).toEqual([{ name: "Event1" }]);
    });
  });
});
