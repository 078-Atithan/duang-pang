export class RequestError extends Error {
  // `code` is a stable identifier the browser maps to a localized message.
  constructor(message, status = 400, code = undefined) {
    super(message)
    this.status = status
    this.code = code
  }
}
