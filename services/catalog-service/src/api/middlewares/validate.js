import ResponseHandler from "../../utils/responseHandler.js";

/**
 * validate category creation/update
 */

export const validateCategory = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: "name", message: "Category name is required" });
  }

  if (name && name.length > 100) {
    errors.push({
      field: "name",
      message: "Category name too long (max 100 characters)",
    });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }
  next();
};

/**
 * validate product creation/update
 */

export const validateProduct = (req, res, next) => {
  const { name, description, category, basePrice, sku } = req.body;

  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: "name", message: "Product name is required" });
  }

  if (!description || description.trim().length === 0) {
    errors.push({
      field: "description",
      message: "Product description is required",
    });
  }

  if (!category) {
    errors.push({ field: "category", message: "Category is required" });
  }

  if (basePrice === undefined || basePrice === null) {
    errors.push({ field: "base", message: "Base price is required" });
  }

  if (basePrice < 0) {
    errors.push({ field: "basePrice", message: "Price cannot be negative" });
  }

  if (!sku || sku.trim().length === 0) {
    errors.push({ field: "sku", message: "SKU is required" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};

/**
 * validate pagination parameters
 */

export const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return ResponseHandler.validationError(res, [
      { field: "page", message: "Page must be a positive number" },
    ]);
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return ResponseHandler.validationError(res, [
      { field: "limit", message: "Limit must be between 1 and 100" },
    ]);
  }
  next();
};
