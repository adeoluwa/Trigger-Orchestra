/**
 * @swagger
 * tags:
 *   name: Secrets
 *   description: Environment secret management — values are encrypted at rest and never returned
 *
 * /secrets:
 *   post:
 *     summary: Store or update a secret for an environment
 *     tags: [Secrets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [environmentId, projectId, key, value]
 *             properties:
 *               environmentId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               key:
 *                 type: string
 *                 example: DATABASE_URL
 *               value:
 *                 type: string
 *                 example: postgres://user:pass@host:5432/db
 *     responses:
 *       201:
 *         description: Secret stored
 *
 * /secrets/environment/{environmentId}:
 *   get:
 *     summary: List secret keys for an environment
 *     tags: [Secrets]
 *     parameters:
 *       - in: path
 *         name: environmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of secret keys
 *
 * /secrets/{id}:
 *   delete:
 *     summary: Delete a secret
 *     tags: [Secrets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 */