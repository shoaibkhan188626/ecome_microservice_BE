import Cart from "../entities/cart.js";
import { createLogger, HTTPClient, DateHelper } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "cart-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Cart Service - Business Logic for Shopping Cart
 *
 * Features:
 * - Persistent carts (MongoDB) for logged-in users
 * - Session carts (Redis) for guests
 * - Cart merging on login
 * - Real-time price/availability validation
 * - Automatic expiry
 */
class CartService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.catalogService = new HTTPClient(config.services.catalog);
    this.inventoryService = new HTTPClient(config.services.inventory);
  }

  /**
   * Get cart for user (or create if doesn't exist)
   * Time Complexity: O(1) with userId index
   */
  async getCart(userId) {
    try {
      let cart = await Cart.findByUser(userId);

      if (!cart) {
        cart = new Cart({
          userId,
          expiresAt: DateHelper.addDays(new Date(), config.cart.expiryDays),
        });
        await cart.save();
        logger.info(`New cart created for user: ${userId}`);
      }

      // Validate cart items (prices, availability)
      await this.validateCart(cart);

      return cart;
    } catch (error) {
      logger.error("Get cart error:", error);
      throw error;
    }
  }

  /**
   * Get guest cart from Redis
   * Time Complexity: O(1)
   */
  async getGuestCart(sessionId) {
    try {
      const cartKey = `guest_cart:${sessionId}`;
      const cartData = await this.redis.get(cartKey);

      if (cartData) {
        return JSON.parse(cartData);
      }

      // Create empty guest cart
      const guestCart = {
        sessionId,
        items: [],
        itemCount: 0,
        subtotal: 0,
        total: 0,
        createdAt: new Date().toISOString(),
      };

      await this.redis.set(
        cartKey,
        JSON.stringify(guestCart),
        config.cart.guestCartExpiry,
      );

      return guestCart;
    } catch (error) {
      logger.error("Get guest cart error:", error);
      throw error;
    }
  }

  /**
   * Add item to cart
   * Time Complexity: O(n) where n = cart items
   */
  async addItem(userId, itemData, isGuest = false, sessionId = null) {
    try {
      const { productId, variantId, sku, quantity } = itemData;

      // Validate product exists and get details
      const product = await this.catalogService.get(
        `/api/products/${productId}`,
      );

      if (!product.success) {
        throw new Error("Product not found");
      }

      // Check stock availability
      const availability = await this.inventoryService.post(
        "/api/inventory/check",
        {
          sku,
          quantity,
        },
      );

      if (!availability.data.canFulfill) {
        throw new Error(
          `Insufficient stock. Available: ${availability.data.available}`,
        );
      }

      const productData = product.data;
      const item = {
        productId,
        variantId: variantId || null,
        sku,
        name: productData.name,
        price: productData.salePrice || productData.basePrice,
        quantity,
        image:
          productData.primaryImage?.url || productData.images?.[0]?.url || null,
        attributes: variantId
          ? this.extractVariantAttributes(productData, variantId)
          : {},
      };

      if (isGuest) {
        return await this.addItemToGuestCart(sessionId, item);
      } else {
        const cart = await this.getCart(userId);

        // Check max items limit
        if (cart.items.length >= config.cart.maxItems) {
          throw new Error(
            `Maximum ${config.cart.maxItems} items allowed in cart`,
          );
        }

        cart.addItem(item);
        await cart.save();

        logger.info(
          `Item added to cart: ${sku} x${quantity} for user ${userId}`,
        );

        return cart;
      }
    } catch (error) {
      logger.error("Add item error:", error);
      throw error;
    }
  }

  /**
   * Add item to guest cart (Redis)
   */
  async addItemToGuestCart(sessionId, item) {
    const cart = await this.getGuestCart(sessionId);

    const existingIndex = cart.items.findIndex((i) => i.sku === item.sku);

    if (existingIndex !== -1) {
      cart.items[existingIndex].quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    // Recalculate totals
    cart.itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    cart.subtotal = cart.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    cart.total = cart.subtotal;

    const cartKey = `guest_cart:${sessionId}`;
    await this.redis.set(
      cartKey,
      JSON.stringify(cart),
      config.cart.guestCartExpiry,
    );

    logger.info(`Item added to guest cart: ${item.sku} x${item.quantity}`);

    return cart;
  }

  /**
   * Update item quantity
   * Time Complexity: O(n)
   */
  async updateItemQuantity(
    userId,
    productId,
    variantId,
    quantity,
    isGuest = false,
    sessionId = null,
  ) {
    try {
      if (isGuest) {
        return await this.updateGuestItemQuantity(
          sessionId,
          productId,
          quantity,
        );
      }

      const cart = await this.getCart(userId);

      const updated = cart.updateItemQuantity(productId, variantId, quantity);

      if (!updated) {
        throw new Error("Item not found in cart");
      }

      await cart.save();

      logger.info(
        `Item quantity updated: ${productId} = ${quantity} for user ${userId}`,
      );

      return cart;
    } catch (error) {
      logger.error("Update item quantity error:", error);
      throw error;
    }
  }

  /**
   * Update guest cart item quantity
   */
  async updateGuestItemQuantity(sessionId, productId, quantity) {
    const cart = await this.getGuestCart(sessionId);

    const item = cart.items.find((i) => i.productId === productId);

    if (!item) {
      throw new Error("Item not found in cart");
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    } else {
      item.quantity = quantity;
    }

    // Recalculate totals
    cart.itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    cart.subtotal = cart.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    cart.total = cart.subtotal;

    const cartKey = `guest_cart:${sessionId}`;
    await this.redis.set(
      cartKey,
      JSON.stringify(cart),
      config.cart.guestCartExpiry,
    );

    return cart;
  }

  /**
   * Remove item from cart
   * Time Complexity: O(n)
   */
  async removeItem(
    userId,
    productId,
    variantId,
    isGuest = false,
    sessionId = null,
  ) {
    try {
      if (isGuest) {
        return await this.removeGuestItem(sessionId, productId);
      }

      const cart = await this.getCart(userId);

      cart.removeItem(productId, variantId);
      await cart.save();

      logger.info(`Item removed from cart: ${productId} for user ${userId}`);

      return cart;
    } catch (error) {
      logger.error("Remove item error:", error);
      throw error;
    }
  }

  /**
   * Remove item from guest cart
   */
  async removeGuestItem(sessionId, productId) {
    const cart = await this.getGuestCart(sessionId);

    cart.items = cart.items.filter((i) => i.productId !== productId);

    // Recalculate totals
    cart.itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    cart.subtotal = cart.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    cart.total = cart.subtotal;

    const cartKey = `guest_cart:${sessionId}`;
    await this.redis.set(
      cartKey,
      JSON.stringify(cart),
      config.cart.guestCartExpiry,
    );

    return cart;
  }

  /**
   * Clear entire cart
   * Time Complexity: O(1)
   */
  async clearCart(userId, isGuest = false, sessionId = null) {
    try {
      if (isGuest) {
        const cartKey = `guest_cart:${sessionId}`;
        await this.redis.del(cartKey);
        return { message: "Guest cart cleared" };
      }

      const cart = await this.getCart(userId);
      cart.clearCart();
      await cart.save();

      logger.info(`Cart cleared for user: ${userId}`);

      return cart;
    } catch (error) {
      logger.error("Clear cart error:", error);
      throw error;
    }
  }

  /**
   * Merge guest cart with user cart on login
   * Time Complexity: O(n + m) where n = guest items, m = user items
   */
  async mergeGuestCart(userId, sessionId) {
    try {
      const guestCart = await this.getGuestCart(sessionId);

      if (guestCart.items.length === 0) {
        return await this.getCart(userId);
      }

      const userCart = await this.getCart(userId);

      // Merge items
      for (const guestItem of guestCart.items) {
        userCart.addItem(guestItem);
      }

      await userCart.save();

      // Delete guest cart
      const cartKey = `guest_cart:${sessionId}`;
      await this.redis.del(cartKey);

      logger.info(
        `Guest cart merged for user: ${userId} - ${guestCart.items.length} items`,
      );

      return userCart;
    } catch (error) {
      logger.error("Merge cart error:", error);
      throw error;
    }
  }

  /**
   * Validate cart items (prices, stock, product availability)
   * Time Complexity: O(n) where n = cart items
   *
   * This ensures:
   * - Products still exist
   * - Prices are current
   * - Stock is available
   * - Items are still active
   */
  async validateCart(cart) {
    try {
      let cartModified = false;
      const itemsToRemove = [];

      for (let i = 0; i < cart.items.length; i++) {
        const item = cart.items[i];

        try {
          // Check if product still exists
          const productResponse = await this.catalogService.get(
            `/api/products/${item.productId}`,
          );

          if (!productResponse.success) {
            logger.warn(`Product not found in cart: ${item.productId}`);
            itemsToRemove.push(item);
            continue;
          }

          const product = productResponse.data;

          // Check if product is still active
          if (!product.isActive || product.status !== "active") {
            logger.warn(`Inactive product in cart: ${item.productId}`);
            itemsToRemove.push(item);
            continue;
          }

          // Get current price
          const currentPrice = product.salePrice || product.basePrice;

          // Update price if changed
          if (item.price !== currentPrice) {
            logger.info(
              `Price changed for ${item.sku}: ${item.price} -> ${currentPrice}`,
            );
            cart.items[i].price = currentPrice;
            cartModified = true;
          }

          // Check stock availability
          const availabilityResponse = await this.inventoryService.post(
            "/api/inventory/check",
            {
              sku: item.sku,
              quantity: item.quantity,
            },
          );

          if (!availabilityResponse.data.canFulfill) {
            const available = availabilityResponse.data.available;

            if (available === 0) {
              logger.warn(`Out of stock item in cart: ${item.sku}`);
              itemsToRemove.push(item);
            } else if (available < item.quantity) {
              logger.info(
                `Adjusting quantity for ${item.sku}: ${item.quantity} -> ${available}`,
              );
              cart.items[i].quantity = available;
              cartModified = true;
            }
          }
        } catch (error) {
          logger.error(`Error validating cart item ${item.sku}:`, error);
          // Keep item if validation fails (network error, etc.)
        }
      }

      // Remove invalid items
      if (itemsToRemove.length > 0) {
        cart.items = cart.items.filter((item) => !itemsToRemove.includes(item));
        cartModified = true;
        logger.info(`Removed ${itemsToRemove.length} invalid items from cart`);
      }

      // Save if cart was modified
      if (cartModified) {
        await cart.save();
      }

      return cart;
    } catch (error) {
      logger.error("Validate cart error:", error);
      // Return cart as-is if validation fails completely
      return cart;
    }
  }

  /**
   * Extract variant attributes from product data
   * Time Complexity: O(n) where n = number of variants
   *
   * @param {Object} product - Product data
   * @param {String} variantId - Variant ID
   * @returns {Object} Variant attributes (e.g., { color: "Blue", size: "Large" })
   */
  extractVariantAttributes(product, variantId) {
    try {
      // If product has variants array
      if (product.variants && Array.isArray(product.variants)) {
        const variant = product.variants.find((v) => v._id === variantId);

        if (variant && variant.attributes) {
          // Convert Map to plain object if needed
          if (variant.attributes instanceof Map) {
            return Object.fromEntries(variant.attributes);
          }
          return variant.attributes;
        }
      }

      // If variant data is embedded differently
      if (product.variantId === variantId && product.attributes) {
        return product.attributes;
      }

      // Return empty object if no variant found
      return {};
    } catch (error) {
      logger.error("Extract variant attributes error:", error);
      return {};
    }
  }
}

export default CartService;
