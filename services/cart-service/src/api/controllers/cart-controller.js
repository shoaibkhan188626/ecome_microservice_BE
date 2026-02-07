import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "cart-service",
  config.logLevel,
  config.isProduction,
);

class CartController {
  constructor(cartService) {
    this.cartService = cartService;
  }

  /**
   * Get cart
   * GET /cart
   */
  async getCart(req, res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers["x-session-id"];

      if (!userId && !sessionId) {
        return ResponseHandler.error(
          res,
          "SESSION_REQUIRED",
          "User ID or Session ID required",
          400,
        );
      }

      const cart = userId
        ? await this.cartService.getCart(userId)
        : await this.cartService.getGuestCart(sessionId);

      return ResponseHandler.success(res, cart);
    } catch (error) {
      logger.error("Get cart controller error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * Add item to cart
   * POST /cart/items
   */
  async addItem(req, res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers["x-session-id"];
      const { productId, variantId, sku, quantity } = req.body;

      if (!productId || !sku || !quantity) {
        return ResponseHandler.validationError(res, [
          { field: "productId", message: "Product ID is required" },
          { field: "sku", message: "SKU is required" },
          { field: "quantity", message: "Quantity is required" },
        ]);
      }

      if (quantity < 1) {
        return ResponseHandler.validationError(res, [
          { field: "quantity", message: "Quantity must be at least 1" },
        ]);
      }

      const cart = await this.cartService.addItem(
        userId,
        { productId, variantId, sku, quantity },
        !userId,
        sessionId,
      );

      return ResponseHandler.success(res, cart, 201);
    } catch (error) {
      logger.error("Add item controller error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Product");
      }

      if (error.message.includes("stock")) {
        return ResponseHandler.error(
          res,
          "INSUFFICIENT_STOCK",
          error.message,
          409,
        );
      }

      if (error.message.includes("Maximum")) {
        return ResponseHandler.error(res, "CART_LIMIT", error.message, 400);
      }

      return ResponseHandler.error(res, "ADD_ITEM_FAILED", error.message, 400);
    }
  }

  /**
   * Update item quantity
   * PUT /cart/items/:productId
   */
  async updateItemQuantity(req, res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers["x-session-id"];
      const { productId } = req.params;
      const { variantId, quantity } = req.body;

      if (!quantity || quantity < 0) {
        return ResponseHandler.validationError(res, [
          { field: "quantity", message: "Valid quantity is required" },
        ]);
      }

      const cart = await this.cartService.updateItemQuantity(
        userId,
        productId,
        variantId,
        quantity,
        !userId,
        sessionId,
      );

      return ResponseHandler.success(res, cart);
    } catch (error) {
      logger.error("Update item quantity error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Cart item");
      }

      return ResponseHandler.error(res, "UPDATE_FAILED", error.message, 400);
    }
  }

  /**
   * Remove item from cart
   * DELETE /cart/items/:productId
   */
  async removeItem(req, res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers["x-session-id"];
      const { productId } = req.params;
      const { variantId } = req.query;

      const cart = await this.cartService.removeItem(
        userId,
        productId,
        variantId,
        !userId,
        sessionId,
      );

      return ResponseHandler.success(res, cart);
    } catch (error) {
      logger.error("Remove item error:", error);
      return ResponseHandler.error(res, "REMOVE_FAILED", error.message, 400);
    }
  }

  /**
   * Clear cart
   * DELETE /cart
   */
  async clearCart(req, res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers["x-session-id"];

      const result = await this.cartService.clearCart(
        userId,
        !userId,
        sessionId,
      );

      return ResponseHandler.success(res, result);
    } catch (error) {
      logger.error("Clear cart error:", error);
      return ResponseHandler.error(res, "CLEAR_FAILED", error.message, 400);
    }
  }

  /**
   * Merge guest cart with user cart (called on login)
   * POST /cart/merge
   */
  async mergeCart(req, res) {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.body;

      if (!userId) {
        return ResponseHandler.error(
          res,
          "UNAUTHORIZED",
          "User authentication required",
          401,
        );
      }

      if (!sessionId) {
        return ResponseHandler.validationError(res, [
          { field: "sessionId", message: "Session ID is required" },
        ]);
      }

      const cart = await this.cartService.mergeGuestCart(userId, sessionId);

      return ResponseHandler.success(res, cart);
    } catch (error) {
      logger.error("Merge cart error:", error);
      return ResponseHandler.error(res, "MERGE_FAILED", error.message, 400);
    }
  }

  /**
   * Validate cart (check prices, stock)
   * POST /cart/validate
   */
  async validateCart(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseHandler.error(
          res,
          "UNAUTHORIZED",
          "User authentication required",
          401,
        );
      }

      const cart = await this.cartService.getCart(userId);
      const validatedCart = await this.cartService.validateCart(cart);

      return ResponseHandler.success(res, validatedCart);
    } catch (error) {
      logger.error("Validate cart error:", error);
      return ResponseHandler.error(res, "VALIDATE_FAILED", error.message, 500);
    }
  }

  /**
   * Get cart item count
   * GET /cart/count
   */
  async getItemCount(req, res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers["x-session-id"];

      const cart = userId
        ? await this.cartService.getCart(userId)
        : await this.cartService.getGuestCart(sessionId);

      return ResponseHandler.success(res, {
        itemCount: cart.itemCount || cart.items?.length || 0,
      });
    } catch (error) {
      logger.error("Get item count error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }
}

export default CartController;
