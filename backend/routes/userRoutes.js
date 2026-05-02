import express from "express";
import {
  createUserController,
  login,
  getAllUserController,
  getUserByIdController,
  updateUserController,
  updateUserPasswordController,
  deleteUserController,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/", createUserController);
router.post("/login", login);

// Protected routes
router.get("/", authenticate, getAllUserController);
router.get("/:id", authenticate, getUserByIdController);
router.put("/:id", authenticate, updateUserController);
router.put("/:id/password", authenticate, updateUserPasswordController);
router.delete("/:id", authenticate, deleteUserController);

export default router;
