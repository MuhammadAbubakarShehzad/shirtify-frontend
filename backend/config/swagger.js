// Swagger setup for Express backend
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const path = require('path');
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shirtify API',
      version: '1.0.0',
      description: 'API documentation for Shirtify backend',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        UserAuthResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6612a3b4c5d6e7f8a9b0c1d2' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', example: 'user' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
        AuthRegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', format: 'password', example: 'secret123' },
          },
        },
        AuthLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', format: 'password', example: 'secret123' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6612a3b4c5d6e7f8a9b0c1d2' },
            title: { type: 'string', example: 'Classic Tee' },
            description: { type: 'string', example: 'Cotton t-shirt' },
            category: { type: 'string', example: 'shirt' },
            price: { type: 'number', example: 499 },
            imageUrl: { type: 'string', example: 'https://example.com/shirt.jpg' },
            stock: { type: 'integer', example: 20 },
            size: { type: 'string', example: 'M' },
            colour: { type: 'string', example: 'Black' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ProductCreateRequest: {
          type: 'object',
          required: ['title', 'price'],
          properties: {
            title: { type: 'string', example: 'Classic Tee' },
            description: { type: 'string', example: 'Cotton t-shirt' },
            category: { type: 'string', example: 'shirt' },
            price: { type: 'number', example: 499 },
            imageUrl: { type: 'string', example: 'https://example.com/shirt.jpg' },
            stock: { type: 'integer', example: 20 },
            size: { type: 'string', example: 'M' },
            colour: { type: 'string', example: 'Black' },
          },
        },
        Customization: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            original_product_id: { type: 'string' },
            size: { type: 'string', example: 'L' },
            design_data: { type: 'object', additionalProperties: true },
            base_image: { type: 'string', example: 'https://example.com/base.png' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CustomizationCreateRequest: {
          type: 'object',
          required: ['original_product_id', 'size'],
          properties: {
            original_product_id: { type: 'string' },
            size: { type: 'string', example: 'L' },
            design_data: { type: 'object', additionalProperties: true },
            base_image: { type: 'string', example: 'https://example.com/base.png' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            product: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/Product' },
              ],
            },
            quantity: { type: 'integer', example: 2 },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CartItem' },
            },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CartUpdateRequest: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['product', 'quantity'],
                properties: {
                  product: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            product: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/Product' },
              ],
            },
            quantity: { type: 'integer', example: 1 },
            price: { type: 'number', example: 499 },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' },
            },
            total: { type: 'number', example: 998 },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            },
            shippingAddress: { type: 'string', example: '221B Baker Street, London' },
            paymentMethod: { type: 'string', example: 'cod' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderCreateRequest: {
          type: 'object',
          properties: {
            shippingAddress: { type: 'string', example: '221B Baker Street, London' },
            paymentMethod: { type: 'string', example: 'cod' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            order: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/Order' },
              ],
            },
            amount: { type: 'number', example: 499 },
            currency: { type: 'string', example: 'INR' },
            paymentMethod: { type: 'string', example: 'upi' },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'success', 'failed', 'refunded'],
              example: 'success',
            },
            transactionId: { type: 'string', example: 'txn_123456' },
            payerName: { type: 'string', example: 'John Doe' },
            payerEmail: { type: 'string', format: 'email', example: 'john@example.com' },
            billingAddress: { type: 'string', example: '221B Baker Street, London' },
            cardLast4: { type: 'string', example: '4242' },
            gateway: { type: 'string', example: 'razorpay' },
            gatewayResponse: { type: 'object', additionalProperties: true },
            paidAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaymentCreateRequest: {
          type: 'object',
          required: ['amount', 'paymentMethod'],
          properties: {
            orderId: { type: 'string', example: '6612a3b4c5d6e7f8a9b0c1d2' },
            amount: { type: 'number', example: 499 },
            currency: { type: 'string', example: 'INR' },
            paymentMethod: { type: 'string', example: 'upi' },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'success', 'failed', 'refunded'],
              example: 'success',
            },
            transactionId: { type: 'string', example: 'txn_123456' },
            payerName: { type: 'string', example: 'John Doe' },
            payerEmail: { type: 'string', format: 'email', example: 'john@example.com' },
            billingAddress: { type: 'string', example: '221B Baker Street, London' },
            cardLast4: { type: 'string', example: '4242' },
            gateway: { type: 'string', example: 'razorpay' },
            gatewayResponse: { type: 'object', additionalProperties: true },
            paidAt: { type: 'string', format: 'date-time' },
          },
        },
        Feedback: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                  },
                },
              ],
            },
            name: { type: 'string', example: 'Jane' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            message: { type: 'string', example: 'Great service!' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FeedbackCreateRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            name: { type: 'string', example: 'Jane' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            message: { type: 'string', example: 'Great service!' },
          },
        },
        MockShirt: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Oversized Tee' },
            type: { type: 'string', example: 'oversized' },
            price: { type: 'number', example: 599 },
            imageUrl: { type: 'string', example: 'https://example.com/mockshirt.png' },
            images: {
              type: 'array',
              items: { type: 'string' },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MockShirtCreateRequest: {
          type: 'object',
          required: ['name', 'type', 'price'],
          properties: {
            name: { type: 'string', example: 'Oversized Tee' },
            type: { type: 'string', example: 'oversized' },
            price: { type: 'number', example: 599 },
            imageUrl: { type: 'string', example: 'https://example.com/mockshirt.png' },
          },
        },
        UserSafe: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../server.js'),
    path.join(__dirname, '../models/*.js')
  ], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/shirtify', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
