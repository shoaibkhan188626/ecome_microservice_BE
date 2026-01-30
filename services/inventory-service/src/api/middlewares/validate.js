import { ResponseHandler, validators } from "@ecommerce/common";

export const validateInventory = (req, res, next) => {
  const { productId, sku } = req.body;
  const errors = [];

  if (!productId) {
    errors.push({ field: "productId", message: "Product ID is required" });
  }

  if (!sku || sku.trim().length === 0) {
    errors.push({ field: "sku", message: "SKU is required" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};

export const validateReservation = (req, res, next) => {
  const { sku, quantity, reservationId } = req.body;
  const errors = [];

  if (!sku || sku.trim().length === 0) {
    errors.push({ field: "sku", message: "SKU is required" });
  }

  if (!quantity || quantity <= 0) {
    errors.push({
      field: "quantity",
      message: "Quantity must be greater than 0",
    });
  }

  if (!reservationId || reservationId.trim().length === 0) {
    errors.push({
      field: "reservationId",
      message: "Reservation ID is required",
    });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};

export const validateAdjustment = (req, res, next) => {
  const { sku, quantity, reason } = req.body;
  const errors = [];

  if (!sku || sku.trim().length === 0) {
    errors.push({ field: "sku", message: "SKU is required" });
  }

  if (quantity === undefined || quantity === null) {
    errors.push({ field: "quantity", message: "Quantity is required" });
  }

  if (!reason || reason.trim().length === 0) {
    errors.push({ field: "reason", message: "Reason is required" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};
