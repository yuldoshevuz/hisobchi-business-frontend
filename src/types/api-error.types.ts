export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  /**
   * Backend MessageKey — stable machine-readable error code.
   * Frontend prefers this over `message` for branching/i18n.
   */
  code?: string;
  /** Legacy field — superseded by `code`. */
  messageKey?: string;
  details?: unknown;
}
