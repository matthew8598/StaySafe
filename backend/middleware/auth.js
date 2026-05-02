import jwt from "jsonwebtoken";

/**
 * Verifies the Bearer JWT and attaches req.user = { id, username }.
 * Returns 401 if the header is missing or the token is invalid/expired.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
