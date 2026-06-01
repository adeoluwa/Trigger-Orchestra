/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project and environment management
 *
 * components:
 *   schemas:
 *     Environment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: production
 *         platform:
 *           type: string
 *           enum: [railway, render, local]
 *         branch:
 *           type: string
 *           example: main
 *         status:
 *           type: string
 *           enum: [idle, deploying, deployed, failed]
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         repoUrl:
 *           type: string
 *         configPath:
 *           type: string
 *         environments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Environment'
 */

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, repoUrl]
 *             properties:
 *               name:
 *                 type: string
 *               repoUrl:
 *                 type: string
 *                 example: https://github.com/username/repo
 *               configPath:
 *                 type: string
 *                 example: trigger.yml
 *     responses:
 *       201:
 *         description: Project created
 *       422:
 *         description: Invalid config file
 *
 *   get:
 *     summary: List all projects for current user
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 *
 * /projects/config/preview:
 *   post:
 *     summary: Preview and validate a config file without saving
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rawYaml]
 *             properties:
 *               rawYaml:
 *                 type: string
 *     responses:
 *       200:
 *         description: Parsed config and validation result
 *
 * /projects/{id}:
 *   get:
 *     summary: Get a project with its environments
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 *   patch:
 *     summary: Update a project name or config path
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               configPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated project
 *       400:
 *         description: No fields provided
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted successfully
 */