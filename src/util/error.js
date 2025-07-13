class CustomError extends Error {
  constructor(message, code, details = {}, cause = undefined) {
    super(message, { cause });
    this.code = code;
    this.details = details;
  }
}

module.exports = CustomError;
