/**
 * Date Helper - Common date operations
 */
export class DateHelper {
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  static addMinutes(date, minutes) {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  static isExpired(date) {
    return new Date(date) < new Date();
  }

  static formatDateTime(date) {
    return new Date(date).toISOString();
  }

  static getStartOfDay(date = new Date()) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static getEndOfDay(date = new Date()) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  static daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
  }
}
