require("dotenv").config();
const express = require("express");
const cors = require("cors");
const questionRoutes = require("./src/routes/questionRoutes");

const app = express();
console.log(process.env.PGHOST);
console.log(process.env.PGPORT);
console.log(process.env.PGDATABASE);
console.log(process.env.PGUSER);
console.log(process.env.PGPASSWORD);
console.log(process.env.PORT);
const PORT = process.env.PORT || 3000;

// CORS Configuration
const isDevelopment = process.env.NODE_ENV !== "production";

const corsOptions = isDevelopment
  ? {
      // Development: Allow all origins
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
      ],
      credentials: true,
      optionsSuccessStatus: 200,
    }
  : {
      // Production: Restrict to specific origins
      origin: [
        "https://yourdomain.com", // Add your production domain
        "https://www.yourdomain.com",
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
      ],
      credentials: true,
      optionsSuccessStatus: 200,
    };

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options("*", cors(corsOptions));

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Welcome!");
});

// API routes
app.use("/api/questions", questionRoutes);

// Topic routes
const topicRoutes = require("./src/routes/topicRoutes");
app.use("/api/topics", topicRoutes);

// Subtopic routes
const subtopicRoutes = require("./src/routes/subtopicRoutes");
app.use("/api/subtopics", subtopicRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.get("/config", async (req, res) => {
  try {
    const { appVersion, platform, environment = "production" } = req.headers;

    // Base configuration
    const config = {
      // Feature Flags (can be changed without app update)
      features: {
        enableBiometrics: true,
        enableOfflineMode: true,
        enablePushNotifications: true,
        maxQuizAttempts: 3,
        showAds: environment === "production",
        enableAnalytics: environment !== "development",

        // Quiz-specific features
        allowRetakeQuiz: true,
        showExplanations: true,
        enableTimedQuiz: false,
        quizTimeLimit: 300, // 5 minutes

        // UI Features
        darkModeAvailable: true,
        showLeaderboard: true,
        enableSocialSharing: true,
      },

      // API Configuration
      api: {
        timeout: 30000,
        retryAttempts: 3,
        cacheExpiration: 300000, // 5 minutes

        // Rate limiting info
        rateLimit: {
          requestsPerMinute: 100,
          burstLimit: 10,
        },
      },

      // App Behavior Settings
      app: {
        minimumVersion: "1.0.0",
        forceUpdateVersion: "0.9.0",
        maintenanceMode: false,

        // Regional settings
        supportedLanguages: ["en", "hi"],
        defaultLanguage: "en",

        // Cache settings
        cacheSettings: {
          quizCacheDuration: 3600000, // 1 hour
          imageCacheDuration: 86400000, // 24 hours
          maxCacheSize: 52428800, // 50MB
        },
      },

      // External Services
      services: {
        firebase: {
          enabled: true,
          // Don't expose sensitive keys here
          projectId: "", //getFirebaseProjectId(environment),
        },
        analytics: {
          enabled: environment !== "development",
          sampleRate: environment === "production" ? 0.1 : 1.0,
        },
      },

      // Content Configuration
      content: {
        welcomeMessage: getWelcomeMessage(platform),
        supportEmail: "support@vdquizzes.com",
        privacyPolicyUrl: "https://vdquizzes.com/privacy",
        termsOfServiceUrl: "https://vdquizzes.com/terms",

        // Quiz settings that can change
        questionsPerQuiz: 10,
        passingScore: 70,
        // categories: await getActiveCategories(),
      },

      // Metadata
      meta: {
        lastUpdated: new Date().toISOString(),
        version: "1.0",
        source: "api",
      },
    };

    // Platform-specific overrides
    if (platform === "ios") {
      config.features.enableBiometrics = true; // iOS has better biometric support
    }

    // Version-specific overrides
    if (appVersion && isVersionLower(appVersion, "1.1.0")) {
      config.features.enableTimedQuiz = false; // Disable for older versions
    }

    // Environment-specific overrides
    if (environment === "development") {
      config.api.timeout = 60000; // Longer timeout for debugging
      config.features.showAds = false;
      config.app.cacheSettings.maxCacheSize = 10485760; // 10MB for dev
    }

    res.json({
      success: true,
      data: config,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Config API Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load configuration",
      fallback: getDefaultConfig(), // Always provide fallback
    });
  }
});

// Helper functions
function getFirebaseProjectId(environment) {
  const projects = {
    development: "vdquizzes-dev",
    staging: "vdquizzes-staging",
    production: "vdquizzes",
  };
  return projects[environment] || projects.production;
}

function getWelcomeMessage(platform) {
  const messages = {
    ios: "Welcome to VDQuizzes on iOS!",
    android: "Welcome to VDQuizzes on Android!",
    default: "Welcome to VDQuizzes!",
  };
  return messages[platform] || messages.default;
}

async function getActiveCategories() {
  // Fetch from your database
  return [
    { id: 1, name: "Math", enabled: true },
    { id: 2, name: "Science", enabled: true },
    { id: 3, name: "History", enabled: false }, // Can disable categories remotely
  ];
}

function isVersionLower(version1, version2) {
  const v1 = version1.split(".").map(Number);
  const v2 = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 < num2) return true;
    if (num1 > num2) return false;
  }
  return false;
}

function getDefaultConfig() {
  return {
    features: {
      enableBiometrics: false,
      enableOfflineMode: true,
      maxQuizAttempts: 3,
    },
    api: {
      timeout: 30000,
      retryAttempts: 3,
    },
    meta: {
      source: "fallback",
    },
  };
}
