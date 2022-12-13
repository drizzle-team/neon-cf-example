import { Client } from '@neondatabase/serverless';
import { drizzle, PgDatabase } from 'drizzle-orm-pg/neondb';
import { eq } from 'drizzle-orm/expressions';
import { Request as IttyRequest, Route, Router } from 'itty-router';
import { json } from 'itty-router-extras';
import { users } from './schema';

interface Env {
	DATABASE_URL: string;
}

interface Request extends IttyRequest {
	db: PgDatabase;
}

interface Methods {
	get: Route;
	post: Route;
}

async function injectDB(request: Request, env: Env) {
	if (request.db) {
		return;
	}
	const client = new Client(env.DATABASE_URL);
	await client.connect();
	request.db = drizzle(client);
}

const router = Router<Request, Methods>({ base: '/' });

router.get('/users', injectDB, async (req: Request, env: Env, ctx: ExecutionContext) => {
	const result = await req.db.select(users).execute();
	// ctx.waitUntil(req.client.end());
	return json(result);
});

router.get('/users/:id', injectDB, async (req: Request, env: Env) => {
	const result = await req.db.select(users).where(eq(users.id, req.params!['id'])).execute();
	return json(result);
});

router.post('/users', injectDB, async (req: Request, env: Env) => {
	const { name, email } = await req.json!();
	const res = await req.db.insert(users).values({ name, email }).returning().execute();
	return json(res);
});

export default {
	fetch: router.handle,
};
