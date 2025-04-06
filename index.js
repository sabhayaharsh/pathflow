const express = require('express');
const bodyParser = require('body-parser');
const frontendroutes = require('./routes/frontend');
const backendroutes = require('./routes/backend');
const authControllar = require('./controllers/frontend/authController');
const userModel = require('./models/frontend/userModel');
const cron = require('node-cron');


const path = require('path');
const fs = require('fs');

const rateLimit = require('express-rate-limit');
const cors = require('cors');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, PUT, POST, PATCH, DELETE, OPTIONS",
  );
  next();
});

app.use(express.static('public'));
app.use(express.json());

function logToFile(data) {
  const logFilePath = path.join(__dirname, 'webhook_logs.txt');
  const timestamp = new Date().toISOString();

  fs.appendFile(logFilePath, `${timestamp} - ${data}\n`, (err) => {
    if (err) {
      console.error('Failed to write log:', err);
    }
  });
}

app.post('/webhooks', (req, res) => {
  const event = req.body;

  logToFile(JSON.stringify(event));

  authControllar.insertWabhookData(event.eventType, event.payload);

  switch (event.eventType) {
    case 'net.authorize.payment.authcapture.created':
      handlePaymentSuccess(event.payload);
      break;

    case 'net.authorize.payment.authcapture.failed':
      handlePaymentFailure(event.payload);
      break;

    case 'net.authorize.payment.fraud.declined':
      handlePaymentFraudDeclined(event.payload);
      break;

    case 'net.authorize.customer.subscription.cancelled':
      handleSubscriptionCancellation(event.payload);
      break;

    case 'net.authorize.customer.subscription.suspended':
      handleSubscriptionSuspension(event.payload);
      break;

    case 'net.authorize.customer.subscription.terminated':
      handleSubscriptionTermination(event.payload);
      break;

    case 'net.authorize.customer.subscription.updated':
      handleSubscriptionUpdate(event.payload);
      break;

    case 'net.authorize.customer.subscription.created':
      handleSubscriptionCreation(event.payload);
      break;

    case 'net.authorize.customer.subscription.failed':
      handleCustomerSubscriptionFailed(event.payload);
      break;

    default:
      console.log('Unhandled event type:', event.eventType);
      break;
  }

  res.status(200).send('Webhook received');
});

async function handlePaymentSuccess(payload) {
  authControllar.getTransactionDetails(payload.id);
}

function handlePaymentFailure(payload) {
}

function handlePaymentFraudDeclined(payload) {
  authControllar.handlePaymentFraudDeclined(payload);
}

function handleSubscriptionCancellation(payload) {
  authControllar.handleSubPaymentCancellation(payload.id);
}

function handleSubscriptionSuspension(payload) {
  authControllar.handleSubSuspension(payload);
}

function handleSubscriptionTermination(payload) {
  authControllar.handleCustomerSubscriptionTermination(payload);
}

function handleSubscriptionUpdate(payload) {
  console.log('Subscription updated:', payload.id);
}

function handleSubscriptionCreation(payload) {
  authControllar.subscriptionCreateLog(payload.id);
}

function handleCustomerSubscriptionFailed(payload) {
  authControllar.handleCustomerSubscriptionFailed(payload);
}

// Define rate limiting configurations for different routes
/*const rateLimits = [
  { path: '/v1/auth', windowMs: 1 * 60 * 1000, max: 100 },
  // { path: '/v1/someotherroute', windowMs: 1 * 60 * 1000, max: 10 },
  // Add more configurations as needed
];

// Apply rate limiting middleware for each route
rateLimits.forEach((limitConfig) => {
  console.log('limitConfig', limitConfig)
  const limiter = rateLimit({
    windowMs: limitConfig.windowMs,
    max: limitConfig.max,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        data: {
          error: { 
            message: 'Too many requests. Please try again later.',
          },
        },
      });
    },
  });
  app.use(limitConfig.path, limiter);
});
*/

app.use('/v1/', frontendroutes);
app.use('/v1/', backendroutes);

// This should be the last route else any after it won't work

if (process.env.PUSH_ENV === 'prod') {
  const GetCompletedAssessments = require('./cron-job/email_notifications');
  GetCompletedAssessments();
}

if (process.env.PUSH_ENV === 'prod') {
  cron.schedule('* * * * *', async () => {
    await userModel.updateExpiredSubscriptions();
  });
}
if (process.env.PUSH_ENV === 'prod') {
  cron.schedule('0,30 * * * *',async()=>{
    await userModel.updatepasswordlimit();
  });
}
app.use("*", (req, res) => {
  res.status(404).json({
    success: "false",
    message: "Page not found",
    error: {
      statusCode: 404,
      message: "You reached a route that is not defined on this server",
    },
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
