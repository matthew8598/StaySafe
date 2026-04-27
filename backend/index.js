import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import readingsRoutes from "./routes/readingsRoutes.js";
import sensorControlsRoutes from "./routes/sensorControlsRoutes.js";
import deviceRoutes from "./routes/devices.js";
import "./mdns-publish.js";  // Publish service via mDNS (Bonjour)

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/readings", readingsRoutes);
app.use("/api/controls", sensorControlsRoutes);
app.use("/api/devices", deviceRoutes);

app.get("/", (req, res) => {
  res.json({ message: "StaySafe API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\n🔌 Arduino can connect to: staysafe.local:${PORT}`);
  console.log(`📡 mDNS/Bonjour service is being published...\n`);
});
