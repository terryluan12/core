import { MessageChannel } from 'node:worker_threads';
import { Port } from '../../src/backends/port/fs.js';
import { ErrnoError, InMemory, configure, configureSingle, fs } from '../../src/index.js';

/**
 * Tests a mis-configured PortFS using a MessageChannel
 */

describe('Timeout', () => {
	const { port1, port2 } = new MessageChannel();

	afterAll(() => {
		port1.close();
		port1.unref();
		port2.close();
		port2.unref();
	});

	test('Misconfiguration', async () => {
		let error: ErrnoError;
		try {
			await configure({
				mounts: {
					'/tmp': { backend: InMemory, name: 'tmp' },
					'/port': { backend: Port, port: port1, timeout: 100 },
				},
			});
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ErrnoError);
		expect(error.code).toBe('EIO');
		expect(error.message).toContain('RPC Failed');
	});

	test('Remote not attached', async () => {
		let error: ErrnoError;
		try {
			await configureSingle({ backend: Port, port: port1, timeout: 100 });
			await fs.promises.writeFile('/test', 'anything');
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ErrnoError);
		expect(error.code).toBe('EIO');
		expect(error.message).toContain('RPC Failed');
	});
});
