import express from "express";
import {
  createAlertController,
  listAlertsController,
  getAlertByIdController,
  removeAlertController,
} from "../controllers/alertController.js";

const router = express.Router();

router.post("/", createAlertController);
router.get("/", listAlertsController);
router.get("/:id", getAlertByIdController);
router.delete("/:id", removeAlertController);

export default router;
