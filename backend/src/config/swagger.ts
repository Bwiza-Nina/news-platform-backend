import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'News API – Eskalate Assessment',
      version: '1.0.0',
      description: `
## Production-Ready News API

Built with Node.js + TypeScript + PostgreSQL + Prisma

### Authentication
Use Bearer token from \`/api/auth/login\` in the Authorize button below.

### Features
- JWT Authentication with RBAC
- Article management with soft deletion
- Analytics engine with BullMQ job queue
- Full-text search, filtering, pagination
- Rate limiting on read events
      `,
      contact: {
        name: 'News API Support',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
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
        BaseResponse: {
          type: 'object',
          properties: {
            Success: { type: 'boolean' },
            Message: { type: 'string' },
            Object: { nullable: true },
            Errors: { type: 'array', items: { type: 'string' }, nullable: true },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            Success: { type: 'boolean' },
            Message: { type: 'string' },
            Object: { type: 'array' },
            PageNumber: { type: 'integer' },
            PageSize: { type: 'integer' },
            TotalSize: { type: 'integer' },
            Errors: { nullable: true },
          },
        },
        UserSignup: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', example: 'StrongPass@1', minLength: 8 },
            role: { type: 'string', enum: ['author', 'reader'] },
          },
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        ArticleCreate: {
          type: 'object',
          required: ['title', 'content', 'category'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 150 },
            content: { type: 'string', minLength: 50 },
            category: { type: 'string', example: 'Tech' },
            status: { type: 'string', enum: ['Draft', 'Published'], default: 'Draft' },
          },
        },
        ArticleUpdate: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 150 },
            content: { type: 'string', minLength: 50 },
            category: { type: 'string' },
            status: { type: 'string', enum: ['Draft', 'Published'] },
          },
        },
      },
    },
    security: [],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);