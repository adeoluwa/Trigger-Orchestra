import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Application } from 'express'
import { authGuard } from '@shared/guards/auth.guard'
import { env } from '@config/env'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trigger API',
      version: '1.0.0',
      description: 'Unified deployment orchestration API',
    },
    servers: [
      {
        url: `${env.APP_URL}/api/v1`,
        description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          schema: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFoundError: { description: 'Resource not found' },
        ValidationError: { description: 'Validation failed' },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                fields: { type: 'object' },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
      },
    },

    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/adapters/inbound/http/*.spec.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Application): void {
  if (!env.DOCS_ENABLED) return

  if (env.NODE_ENV === 'production') {
    app.use('/api/docs', authGuard)
    app.use('/api/docs.json', authGuard)
  }

  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'Trigger API Docs',
      swaggerOptions: { persistAuthorization: true },
    })
  )
}
