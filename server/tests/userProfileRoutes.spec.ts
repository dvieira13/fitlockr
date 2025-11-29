import request from "supertest";
import express from "express";
import router from "../src/routes/userProfileRoutes";
import UserProfile from "../src/models/userProfile";

jest.mock("../src/models/userProfile");

const app = express();
app.use(express.json());
app.use("/api/users", router);

describe("User Profile Routes", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("GET /api/users/email/:email", () => {
        it("should return user by email (positive)", async () => {
            const mockPopulate = jest.fn().mockReturnThis();
            (UserProfile.findOne as jest.Mock).mockReturnValue({
                populate: mockPopulate,
                then: (resolve: any) => resolve({ email: "a@b.com" }),
            });

            const res = await request(app).get("/api/users/email/a@b.com");

            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe("a@b.com");
        });

        it("should handle DB errors (negative)", async () => {
            (UserProfile.findOne as jest.Mock).mockImplementation(() => {
                const errorPromise = Promise.reject(new Error("DB fail"));
                (errorPromise as any).populate = jest.fn().mockReturnThis();
                return errorPromise;
            });

            const res = await request(app).get("/api/users/email/x@y.com");

            expect(res.status).toBe(500);
            expect(res.body.error).toBe("DB fail");
        });
    });

    describe("POST /api/users", () => {
        it("should create a new user (positive)", async () => {
            (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

            const mockSave = jest.fn().mockResolvedValue(true);
            (UserProfile as any).mockImplementation(() => ({
                _id: "u1",
                email: "a@b.com",
                save: mockSave,
            }));

            const res = await request(app)
                .post("/api/users")
                .send({
                    first_name: "A",
                    last_name: "B",
                    name: "AB",
                    picture: "pic.jpg",
                    email: "a@b.com",
                });

            expect(res.status).toBe(201);
            expect(res.body.user).toEqual({ _id: "u1", email: "a@b.com" });
        });

        it("should handle DB errors (negative)", async () => {
            (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

            const mockSave = jest.fn().mockRejectedValue(new Error("DB fail"));
            (UserProfile as any).mockImplementation(() => ({
                save: mockSave,
            }));

            const res = await request(app)
                .post("/api/users")
                .send({
                    first_name: "A",
                    last_name: "B",
                    name: "AB",
                    picture: "pic.jpg",
                    email: "a@b.com",
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("DB fail");
        });
    });
});
