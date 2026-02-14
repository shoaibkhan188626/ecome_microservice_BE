import express from "express";
import authController from "../controllers/auth-controller.js";
import authenticate from "../middlewares/authenticate.js";
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validatePasswordChange,
  validateProfileUpdate,
} from "../middlewares/validate.js";
const router = express.Router();
router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/refresh", validateRefreshToken, authController.refreshToken);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.get("/me", authenticate, authController.getCurrentUser);

router.put(
  "/profile",
  authenticate,
  validateProfileUpdate,
  authController.updateProfile,
);

router.post(
  "/change-password",
  authenticate,
  validatePasswordChange,
  authController.changePassword,
);

export default router;
