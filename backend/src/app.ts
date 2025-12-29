import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { requestIdMiddleware } from './middleware/requestId';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimit';
import qrRouter from './routes/qr.routes';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(rateLimitMiddleware);
app.use(cors({ origin: process.env.ORIGIN || '*'}));
// Helmet with CSP (allow data: for embedded QR images); can disable via DISABLE_CSP=1 (e.g., for local debugging)
app.use(helmet({
	contentSecurityPolicy: process.env.DISABLE_CSP ? false : {
		directives: {
			defaultSrc: ["'self'"],
			imgSrc: ["'self'", 'data:', 'blob:'],
			scriptSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind injected styles + potential inline in index.html
			connectSrc: ["'self'"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
			frameAncestors: ["'none'"],
			upgradeInsecureRequests: []
		}
	}
}));
app.use(compression());

app.use('/api/qr', qrRouter);

// Simple health endpoint
app.get('/health', (_req, res) => {
	res.json({ 
		status: 'ok', 
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development',
		commit: process.env.COMMIT_HASH || 'unknown'
	});
});

// Version endpoint (for frontend cache bust / diagnostics)
app.get('/version', (_req, res) => {
	const version = process.env.npm_package_version || '1.0.0';
	const commit = process.env.COMMIT_HASH || 'unknown';
	res.json({ 
		version, 
		commit,
		buildTime: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development'
	});
});

// Optionally serve frontend build (production single-container) when SERVE_STATIC is set
if (process.env.SERVE_STATIC) {
	// Try multiple possible locations for static files (more exhaustive)
	const possiblePaths = [
		path.join(__dirname, 'public'),           // Docker/Nixpacks: copied to backend/dist/public
		path.join(__dirname, '../../frontend/dist'), // Local dev fallback
		path.join(process.cwd(), 'frontend', 'dist'), // monorepo root runtime
		path.join('/', 'app', 'frontend', 'dist') // container absolute path
	];
	const staticDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

	// Diagnostic log to help identify where files are expected at runtime
	// eslint-disable-next-line no-console
	console.log('SERVE_STATIC enabled. staticDir chosen=', staticDir);

	app.use(express.static(staticDir));
	app.get('*', (req, res) => {
		if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });

		const indexPath = path.join(staticDir, 'index.html');
		if (fs.existsSync(indexPath)) {
			return res.sendFile(indexPath);
		}

		// Try alternative index locations for better diagnostics and resiliency
		const altIndexPaths = [
			path.join(__dirname, 'public', 'index.html'),
			path.join(__dirname, '../../frontend/dist', 'index.html'),
			path.join(process.cwd(), 'frontend', 'dist', 'index.html'),
			path.join('/', 'app', 'frontend', 'dist', 'index.html')
		];
		for (const p of altIndexPaths) {
			if (fs.existsSync(p)) {
				// eslint-disable-next-line no-console
				console.log('Found index at alternative path:', p);
				return res.sendFile(p);
			}
		}

		// Diagnostic listing when index is missing
		try {
			// eslint-disable-next-line no-console
			console.log('StaticDir exists?', fs.existsSync(staticDir));
			// eslint-disable-next-line no-console
			console.log('Static dir listing:', fs.readdirSync(staticDir));
		} catch (e) {
			// eslint-disable-next-line no-console
			const msg = (e && (e as any).message) ? (e as any).message : e;
			console.log('Error reading staticDir for diagnostics', msg);
		}

		// Fallback responses
		if (req.path === '/') return res.send('Backend Running');
		return res.status(404).json({ error: 'Frontend not found' });
	});
} else {
	// Simple root route for platform health / quick check (only when not serving static)
	app.get('/', (_req, res) => {
		res.send('Backend Running');
	});
}

// Error handler must be last
app.use(errorHandler);

export default app;
