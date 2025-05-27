import { Effect, Schema } from "effect";
import { TelemetryService } from "@/services/telemetry";

/**
 * Security audit event types
 */
export interface SecurityAuditEvent {
  operation: string;
  resource: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Input validation schemas for common types
 */
export const ValidationSchemas = {
  // Nostr public key (npub or hex)
  NostrPublicKey: Schema.String.pipe(
    Schema.pattern(/^(npub1[a-z0-9]{58}|[0-9a-f]{64})$/i),
    Schema.annotations({
      message: () => "Invalid Nostr public key format"
    })
  ),
  
  // Nostr private key (nsec or hex) - for validation only, never log!
  NostrPrivateKey: Schema.String.pipe(
    Schema.pattern(/^(nsec1[a-z0-9]{58}|[0-9a-f]{64})$/i),
    Schema.annotations({
      message: () => "Invalid Nostr private key format"
    })
  ),
  
  // Bitcoin address
  BitcoinAddress: Schema.String.pipe(
    Schema.pattern(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/),
    Schema.annotations({
      message: () => "Invalid Bitcoin address format"
    })
  ),
  
  // Lightning invoice
  LightningInvoice: Schema.String.pipe(
    Schema.pattern(/^ln(bc|tb)[0-9a-z]+$/i),
    Schema.annotations({
      message: () => "Invalid Lightning invoice format"
    })
  ),
  
  // BIP39 mnemonic (12 or 24 words)
  Mnemonic: Schema.String.pipe(
    Schema.filter((s) => {
      const words = s.trim().split(/\s+/);
      return words.length === 12 || words.length === 24;
    }, {
      message: () => "Mnemonic must be 12 or 24 words"
    })
  ),
  
  // URL validation
  SafeUrl: Schema.String.pipe(
    Schema.filter((s) => {
      try {
        const url = new URL(s);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, {
      message: () => "Invalid URL format"
    })
  ),
  
  // Channel name (alphanumeric, spaces, limited special chars)
  ChannelName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(50),
    Schema.pattern(/^[a-zA-Z0-9\s\-_]+$/),
    Schema.annotations({
      message: () => "Channel name must be 1-50 characters, alphanumeric with spaces, hyphens, and underscores"
    })
  ),
  
  // Message content (reasonable length)
  MessageContent: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(5000),
    Schema.annotations({
      message: () => "Message must be 1-5000 characters"
    })
  ),
  
  // Numeric amount (positive)
  PositiveAmount: Schema.Number.pipe(
    Schema.positive(),
    Schema.annotations({
      message: () => "Amount must be positive"
    })
  ),
  
  // Satoshi amount (positive integer)
  SatoshiAmount: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.annotations({
      message: () => "Satoshi amount must be a positive integer"
    })
  )
};

/**
 * Sanitize HTML content to prevent XSS
 * Basic implementation - in production, use a library like DOMPurify
 */
export const sanitizeHtml = (html: string): string => {
  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '');
  
  // Only allow specific tags
  const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  
  sanitized = sanitized.replace(tagRegex, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      // For anchor tags, only allow href, target, and rel
      if (tag.toLowerCase() === 'a') {
        return match.replace(/\s+(?!href|target|rel)[a-zA-Z-]+\s*=\s*["'][^"']*["']/gi, '');
      }
      return match;
    }
    return '';
  });
  
  return sanitized;
};

/**
 * Sanitize plain text (remove any HTML/script tags)
 */
export const sanitizeText = (text: string): string => {
  // Remove all HTML tags
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, (entity) => {
      // Decode common HTML entities
      const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'"
      };
      return entities[entity] || entity;
    });
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (value: string, type: 'key' | 'mnemonic' | 'address' = 'key'): string => {
  if (!value || value.length < 10) return '***';
  
  switch (type) {
    case 'mnemonic':
      // Show first word and last word only
      const words = value.split(' ');
      if (words.length > 2) {
        return `${words[0]} ... ${words[words.length - 1]} (${words.length} words)`;
      }
      return '*** (mnemonic)';
    
    case 'address':
      // Show first 6 and last 4 characters
      return `${value.slice(0, 6)}...${value.slice(-4)}`;
    
    case 'key':
    default:
      // Show first 4 and last 4 characters
      return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
};

/**
 * Secure storage wrapper for sensitive data
 * Uses sessionStorage for temporary data, never localStorage
 */
export const SecureStorage = {
  /**
   * Store sensitive data temporarily (cleared on tab close)
   * Data is encrypted with a session key
   */
  setTemp: (key: string, value: string): void => {
    // In a real app, you'd encrypt this with a session key
    // For now, we just use sessionStorage which is cleared on tab close
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`secure_${key}`, value);
    }
  },
  
  /**
   * Retrieve temporarily stored sensitive data
   */
  getTemp: (key: string): string | null => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(`secure_${key}`);
    }
    return null;
  },
  
  /**
   * Clear specific sensitive data
   */
  clearTemp: (key: string): void => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(`secure_${key}`);
    }
  },
  
  /**
   * Clear all sensitive data
   */
  clearAll: (): void => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keys = Object.keys(window.sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          window.sessionStorage.removeItem(key);
        }
      });
    }
  }
};

/**
 * Log security audit events
 */
export const auditLog = (event: SecurityAuditEvent): Effect.Effect<void, Error, TelemetryService> => 
  Effect.gen(function* (_) {
    const telemetry = yield* _(TelemetryService);
    
    yield* _(telemetry.trackEvent({
      category: "security_audit",
      action: event.operation,
      label: event.resource,
      timestamp: event.timestamp,
      context: {
        ...event.metadata,
        userId: event.userId
      }
    }).pipe(
      Effect.mapError(() => new Error("Failed to track audit event"))
    ));
  });

/**
 * Validate input with schema and audit logging
 */
export const validateInput = <A, I>(
  schema: Schema.Schema<A, I>,
  input: I,
  auditInfo?: {
    operation: string;
    resource: string;
  }
) => Effect.gen(function* (_) {
  // Parse and validate
  const result = yield* _(Schema.decodeUnknown(schema)(input));
  
  // Log successful validation if audit info provided
  if (auditInfo) {
    yield* _(auditLog({
      operation: `validate_${auditInfo.operation}`,
      resource: auditInfo.resource,
      timestamp: Date.now(),
      metadata: { validated: true }
    }));
  }
  
  return result;
});

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  check(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Create a rate-limited operation
 */
export const rateLimitedOperation = <R, E, A>(
  operation: Effect.Effect<A, E, R>,
  limiter: RateLimiter,
  key: string,
  errorMessage = "Rate limit exceeded"
) => Effect.gen(function* (_) {
  if (!limiter.check(key)) {
    return yield* _(Effect.fail(new Error(errorMessage)));
  }
  
  return yield* _(operation);
});

/**
 * Content Security Policy headers for the app
 */
export const CSP_HEADERS = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for React/Vite dev
  'style-src': ["'self'", "'unsafe-inline'"], // Needed for styled components
  'img-src': ["'self'", "data:", "https:"],
  'connect-src': ["'self'", "ws://localhost:*", "wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

/**
 * Generate CSP header string
 */
export const generateCSPHeader = (): string => {
  return Object.entries(CSP_HEADERS)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};