import { randomUUID } from "crypto";

const requestMiddleware = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

export default requestMiddleware;
