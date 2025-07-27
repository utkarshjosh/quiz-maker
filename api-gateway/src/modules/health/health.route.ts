import { Router } from 'express';
import HealthController from './health.controller';

const health: Router = Router();
const controller = new HealthController();

/**
 * Health status response
 * @typedef {object} HealthResponse
 * @property {string} status - Health status (healthy/unhealthy)
 * @property {string} timestamp - Check timestamp
 * @property {string} service - Service name
 * @property {string} version - Service version
 * @property {string} environment - Environment
 * @property {number} uptime - Service uptime in seconds
 * @property {string} responseTime - Response time
 * @property {object} dependencies - Dependency health status
 * @property {object} memory - Memory usage
 * @property {object} cpu - CPU usage
 */

/**
 * GET /health
 * @summary Basic health check
 * @tags Health
 * @return {HealthResponse} 200 - Health check successful
 */
health.get('/', controller.getBasicHealth);

/**
 * GET /health/detailed
 * @summary Detailed health check with dependency status
 * @tags Health
 * @return {HealthResponse} 200 - Health check successful
 * @return {HealthResponse} 503 - Service unhealthy
 */
health.get('/detailed', controller.getDetailedHealth);

export default health; 