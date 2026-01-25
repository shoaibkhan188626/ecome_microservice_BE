import Product from "../entities/Product.js";
import ProductVariant from "../entities/ProductVariants.js";
import Category from "../entities/Category.js";
import logger from "../../utils/logger.js";

/**
 * product service - business logic for products
 * Handles crud, search, filtering and variants
 */

class ProductService {
  /**
   * Create new product
   */

  async create(data) {
    try {
      const {
        name,
        description,
        shortDescription,
        category,
        basePrice,
        salePrice,
        costPrice,
        sku,
        attributes,
        images,
        productType,
        stockQuantity,
        brand,
        tags,
        weight,
        dimensions,
        metaTitle,
        metaDescription,
        metaKeywords,
      } = data;

      //validate category exists
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc || !categoryDoc.isActive) {
        throw new Error("Invalid or inactive category");
      }

      //Check sku uniqueness
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        throw new Error("SKU already exists");
      }

      const product = new Product({
        name,
        description,
        shortDescription,
        category,
        basePrice,
        salePrice,
        costPrice,
        sku,
        attributes: attributes || [],
        images: images || [],
        productType: productType || "simple",
        stockQuantity: stockQuantity || 0,
        brand,
        tags: tags || [],
        weight,
        dimensions,
        metaTitle,
        metaDescription,
        metaKeywords: metaKeywords || [],
        status: "draft",
      });

      await Product.save();

      //increment category product count
      await Category.findByIdAndUpdate(category, { $inc: { productCount: 1 } });

      logger.info(`Product created : ${product.name} (${product._id})`);

      return product;
    } catch (error) {
      logger.error("Create product error:", error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */

  async getById(productId, includeInactive = false) {
    try {
      const query = { _id: productId };
      if (!includeInactive) {
        query.isActive = true;
        query.status = "active";
      }

      const product = await Product.findOne(query)
        .populate("category", "name slug path")
        .populate("relatedProducts", "name slug basePrice salePrice images");

      if (!product) {
        throw new Error("Product not found");
      }

      //increment view count async
      product
        .incrementViewCount()
        .catch((err) => logger.error("View count error:", err));

      return product;
    } catch (error) {
      logger.error("Get product error:", error);
      throw error;
    }
  }

  /**
   * Get product by slug
   */

  async getBySlug(slug) {
    try {
      const product = await Product.findOne({
        slug,
        isActive: true,
        status: "active",
      })
        .populate("category", "name slug path")
        .populate("relatedProducts", "name slug basePrice salePrice images");

      if (!product) {
        throw new Error("Product not found");
      }

      //increment view Count
      product
        .incrementViewCount()
        .catch((err) => logger.error("View count error:", err));

      return product;
    } catch (error) {
      logger.error("Get product by slug error:", error);
      throw error;
    }
  }

  /**
   * get products by category
   */

  async getByCategory(categoryId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = "createdAt",
        order = "desc",
        minPrice,
        maxPrice,
        brand,
        attributes = {},
      } = options;

      const query = {
        category: categoryId,
        isActive: true,
        status: "active",
      };

      //price filter
      if (brand) {
        query.brand = brand;
      }

      //Attributes filters(EAV)
      Object.keys(attributes).forEach((attrName) => {
        query[`attributes.name`] = attrName;
        query[`attributes.value`] = attributes[attrName];
      });

      const skip = (page - 1) * limit;
      const sortObj = { [sort]: order === "asc" ? 1 : -1 };

      const [products, total] = await Promise.all([
        (await Product.find(query))
          .toSorted(sortObj)
          .skip(skip)
          .limit(limit)
          .populate("category", "name slug"),
        Product.countDocuments(query),
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Get products by category error:", error);
      throw error;
    }
  }

  /**
   * Get featured products
   */

  async getFeatured(limit = 10) {
    try {
      return await Product.findFeatured(limit);
    } catch (error) {
      logger.error("Get featured products error:", error);
      throw error;
    }
  }

  /**
   * Search products (basic text search)
   */

  async search(query, options = {}) {
    try {
      const { page = 1, limit = 20, category, minPrice, maxPrice } = options;

      const searchQuery = {
        $text: { $search: query },
        isActive: true,
        status: "active",
      };

      if (category) {
        searchQuery.category = category;
      }

      if (minPrice || maxPrice) {
        searchQuery.basePrice = {};
        if (minPrice) searchQuery.basePrice.$gte = parseFloat(minPrice);
        if (maxPrice) searchQuery.basePrice.$lte = parseFloat(maxPrice);
      }

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(searchQuery, { score: { $meta: "textScore" } })
          .sort({ score: { $meta: "textScore" } })
          .skip(skip)
          .limit(limit)
          .populate("category", "name slug"),
        Product.countDocuments(searchQuery),
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Search products error:", error);
      throw error;
    }
  }

  /**
   * Update product
   */

  async update(productId, data) {
    try {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error("Product not found");
      }

      if (data.category && data.category !== product.category.toString()) {
        const newCategory = await Category.findById(data.category);
        if (!newCategory || !newCategory.isActive) {
          throw new Error("Invalid or inactive category");
        }

        await Category.findByIdAndUpdate(product.category, {
          $inc: { productCount: -1 },
        });
        await Category.findByIdAndUpdate(data.category, {
          $inc: { productCount: 1 },
        });
      }

      //update fields
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && key !== "_id") {
          product[key] = data[key];
        }
      });

      await product.save();

      logger.info(`Product updated: ${product.name} (${product._id})`);
    } catch (error) {
      logger.error("Update product error:", error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */

  async delete(productId) {
    try {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error("Product not found");
      }

      //soft delete
      product.isActive = false;
      product.status = "archived";
      await product.save();

      //decrement category count
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: -1 },
      });

      logger.info(`Product deleted (soft): ${product.name} (${product._id})`);

      return { message: "Product deleted successfully" };
    } catch (error) {
      logger.error("Delete product error:", error);
      throw error;
    }
  }

  /**
   * Add product attribute
   */

  async addAttribute(productId, name, value, type = "string", unit = null) {
    try {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error("Product not found");
      }

      product.setAttribute(name, value, type, unit);
      await product.save();
      return product;
    } catch (error) {
      logger.error("Add attribute error:", error);
      throw error;
    }
  }

  /**
   * Get all products (admin)
   */

  async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = "createdAt",
        order = "desc",
        status,
        category,
        search,
      } = options;

      const query = {};

      if (status) query.status = status;
      if (category) query.category = category;
      if (search) query.name = { $regex: search, $options: "1" };

      const skip = (page - 1) * limit;
      const sortObj = { [sort]: order === "asc" ? 1 : -1 };

      const [products, total] = await Promise.all([
        Product.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate("category", "name slug"),
        Product.countDocuments(query),
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Get all products error:", error);
      throw error;
    }
  }
}

export default new ProductService();
