/**
 * @swagger
 * tags:
 *   name: Deployments
 *   description: Deployment lifecycle management
 *
 * components:
 *   schemas:
 *     Deployment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         environmentId:
 *           type: string
 *         projectId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [queued, building, deploying, success, failed, cancelled]
 *         platform:
 *           type: string
 *           enum: [railway, render, local]
 *         commitSha:
 *           type: string
 *         commitMessage:
 *           type: string
 *         startedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     DeploymentLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         message:
 *           type: string
 *         level:
 *           type: string
 *           enum: [info, warn, error, success]
 *         source:
 *           type: string
 *           enum: [platform, system]
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /deployments/trigger:
 *   post:
 *     summary: Trigger a deployment
 *     tags: [Deployments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [environmentId, projectId]
 *             properties:
 *               environmentId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       202:
 *         description: Deployment queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Deployment'
 *       409:
 *         description: Deployment already running
 *
 * /deployments/{id}/cancel:
 *   post:
 *     summary: Cancel an active deployment
 *     tags: [Deployments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancelled successfully
 *
 * /deployments/{id}/logs:
 *   get:
 *     summary: Get all logs for a deployment
 *     tags: [Deployments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeploymentLog'
 *
 * /deployments/{id}/logs/stream:
 *   get:
 *     summary: Stream deployment logs via SSE
 *     tags: [Deployments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *
 * /deployments/project/{projectId}:
 *   get:
 *     summary: List all deployments for a project
 *     tags: [Deployments]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of deployments
 */