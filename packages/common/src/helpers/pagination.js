/**
 * Pagination helper
 */
export class PaginationHelper {
  static getPaginationParams(query, defaults = { page: 1, limit: 20 }) {
    const page = parseInt(query.page) || defaults.page;
    const limit = Math.min(parseInt(query.limit) || defaults.limit, 100); // Max 100
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  static getPaginationMeta(page, limit, total) {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
