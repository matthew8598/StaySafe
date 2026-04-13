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

const router = express.Router();

router.post("/", createUserController);
router.post("/login", login);
router.get("/", getAllUserController);
router.get("/:id", getUserByIdController);
router.put("/:id", updateUserController);
router.put("/:id/password", updateUserPasswordController);
router.delete("/:id", deleteUserController);

export default router;
