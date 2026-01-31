import { randomUUID } from "crypto";

/**
 * Session Middleware for Guest Carts
 * Generates or retrieves session ID for anonymous users
 */
export const sessionMiddleware = (req, res, next) => {
  // Check if user is authenticated (has JWT)
  if (req.user) {
    return next();
  }

  // Check for existing session ID in header or cookie
  let sessionId = req.headers["x-session-id"] || req.cookies?.sessionId;

  // Generate new session ID if none exists
  if (!sessionId) {
    sessionId = randomUUID();
    res.setHeader("X-Session-Id", sessionId);

    // Set cookie for browser clients
    res.cookie("sessionId", sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  req.sessionId = sessionId;
  next();
};
