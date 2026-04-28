/**
 * Misbar Intelligence System v3.0 — Application Entry Point
 * Runs the REST API server by default; CLI is separate (src/app/cli/index.ts)
 */

import { startApiServer } from './api/server.js'

const port = parseInt(process.env.PORT ?? '3737', 10)
startApiServer(port)
