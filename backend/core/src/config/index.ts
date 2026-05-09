import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    logging: boolean;
    ssl?: {
      enabled: boolean;
      ca?: string;
    };
  };
  mongo: {
    uri: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    useEnvKeys: boolean;
    access: {
      privateKeyPath: string;
      publicKeyPath: string;
      ttl: string;
    };
    refresh: {
      privateKeyPath: string;
      publicKeyPath: string;
      ttl: string;
    };
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
  cors: {
    enabled: boolean;
    origins: string[];
  };
  upload: {
    storage: 'local' | 's3';
    maxFileSize: number;
    allowedTypes: string[];
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    auth: {
      windowMs: number;
      maxRequests: number;
    };
  };
  security: {
    maxLoginAttempts: number;
    lockoutDuration: number;
    helmet: boolean;
    compression: boolean;
  };
  features: {
    apiDocs: boolean;
    wiki: boolean;
    forums: boolean;
    repositories: boolean;
    timeTracking: boolean;
    gantt: boolean;
    calendar: boolean;
    jobs: boolean;
  };
  admin: {
    email: string;
    password: string;
    name: string;
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  ldap: {
    stub: boolean;
    url: string;
    bindDn: string;
    bindPassword: string;
    searchBase: string;
    searchFilter: string;
  };
  i18n: {
    defaultLanguage: string;
    supportedLanguages: string[];
  };
  logging: {
    level: string;
    fileEnabled: boolean;
    dir: string;
  };
  services: {
    resumeBeUrl: string;
    atsApiKey: string;
    judge0: {
      url: string;
      apiKey: string;
    };
    openai: {
      apiKey: string;
    };
  };
  baseUrl: string;
  scoring: {
    weights: {
      skills: number;
      experience: number;
      roleSimilarity: number;
      availability: number;
      budget: number;
      location: number;
    };
    defaultPageSize: number;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'HIRION_clone',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: process.env.NODE_ENV === 'development',
    ssl: {
      enabled: process.env.POSTGRES_SSL === 'true',

      // FOR VERCEL
      // ca: process.env.POSTGRES_CA_CERT,

      // local
      ca: process.env.POSTGRES_CA_CERT_PATH
        ? fs.readFileSync(process.env.POSTGRES_CA_CERT_PATH, 'utf8')
        : undefined,
    },
  },

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/HIRION_issues',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    useEnvKeys: process.env.USE_ENV_JWT_KEYS === 'true',
    access: {
      privateKeyPath: process.env.JWT_ACCESS_PRIVATE_KEY_PATH || './keys/jwt_access_private.pem',
      publicKeyPath: process.env.JWT_ACCESS_PUBLIC_KEY_PATH || './keys/jwt_access_public.pem',
      ttl: process.env.ACCESS_TOKEN_TTL || '15m',
    },
    refresh: {
      privateKeyPath: process.env.JWT_REFRESH_PRIVATE_KEY_PATH || './keys/jwt_refresh_private.pem',
      publicKeyPath: process.env.JWT_REFRESH_PUBLIC_KEY_PATH || './keys/jwt_refresh_public.pem',
      ttl: process.env.REFRESH_TOKEN_TTL || '30d',
    },
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@HIRION-clone.local',
  },

  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origins: (process.env.FRONTEND_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },

  upload: {
    storage: (process.env.UPLOAD_STORAGE as 'local' | 's3') || 'local',
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10),
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf')
      .split(',')
      .map((t) => t.trim()),
    ...(process.env.UPLOAD_STORAGE === 's3' && {
      s3: {
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || '',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    }),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
    },
  },

  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10) * 60 * 1000,
    helmet: process.env.HELMET_ENABLED !== 'false',
    compression: process.env.COMPRESSION_ENABLED !== 'false',
  },

  features: {
    apiDocs: process.env.ENABLE_API_DOCS !== 'false',
    wiki: process.env.ENABLE_WIKI !== 'false',
    forums: process.env.ENABLE_FORUMS !== 'false',
    repositories: process.env.ENABLE_REPOSITORIES === 'true',
    timeTracking: process.env.ENABLE_TIME_TRACKING !== 'false',
    gantt: process.env.ENABLE_GANTT !== 'false',
    calendar: process.env.ENABLE_CALENDAR !== 'false',
    jobs: process.env.ENABLE_JOBS !== 'false',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'changeme123',
    name: process.env.ADMIN_NAME || 'System Administrator',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback',
    },
  },

  ldap: {
    stub: process.env.LDAP_STUB === 'true',
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    bindDn: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    searchBase: process.env.LDAP_SEARCH_BASE || '',
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(uid={{username}})',
  },

  i18n: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
    supportedLanguages: (process.env.SUPPORTED_LANGUAGES || 'en').split(',').map((l) => l.trim()),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOG_FILE_ENABLED !== 'false',
    dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  },
  services: {
    resumeBeUrl: process.env.RESUME_BE_URL || 'http://localhost:5001',
    atsApiKey: process.env.ATS_API_KEY || 'default_key',
    judge0: {
      url: process.env.JUDGE0_API_URL || 'http://44.222.35.138:2358',
      apiKey: process.env.JUDGE0_API_KEY || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  },
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:4000',
  scoring: {
    weights: {
      skills: parseInt(process.env.SCORING_WEIGHT_SKILLS || '40', 10),
      experience: parseInt(process.env.SCORING_WEIGHT_EXPERIENCE || '20', 10),
      roleSimilarity: parseInt(process.env.SCORING_WEIGHT_ROLE || '15', 10),
      availability: parseInt(process.env.SCORING_WEIGHT_AVAILABILITY || '10', 10),
      budget: parseInt(process.env.SCORING_WEIGHT_BUDGET || '10', 10),
      location: parseInt(process.env.SCORING_WEIGHT_LOCATION || '5', 10),
    },
    defaultPageSize: parseInt(process.env.SCORING_DEFAULT_PAGE_SIZE || '10', 10),
  },
};

export default config;
