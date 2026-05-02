import express from "express";
import {
  createAlertController,
  listAlertsController,
  getAlertByIdController,
  removeAlertController,
  resolveAlertController,
} from "../controllers/alertController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/", createAlertController);
router.get("/", listAlertsController);
router.get("/:id", getAlertByIdController);
router.patch("/:id/resolve", resolveAlertController);
router.delete("/:id", removeAlertController);

export default router;
