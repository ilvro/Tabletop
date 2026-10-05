export class ApiError extends Error {
  constructor(message, status, details) {
    super(message); this.name = 'ApiError'; this.status = status; this.details = details;
  }
}
